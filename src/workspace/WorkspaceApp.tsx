import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DefaultTone,
  Emphasis,
  JobContext,
  LetterLength,
  ResponseShapePreference,
  StructuredCoverLetter,
  UserProfile,
} from "../lib/types";
import { EMPTY_PROFILE } from "../lib/types";
import { generateCoverLetter, resolveStructuredLetter } from "../lib/api";
import { downloadStructuredCoverLetterDocx } from "../lib/exportDocx";
import {
  emptyStructuredFromContext,
  plainTextToStructuredLetter,
  structuredLetterToPlainText,
} from "../lib/letterModel";
import {
  STORAGE_KEYS,
  loadCachedLetter,
  loadGenerationPrefs,
  loadProfile,
  loadSettings,
  saveCachedLetter,
  saveGenerationPrefs,
} from "../lib/storage";
import type { AppSettings } from "../lib/types";
import { requestJobContextFromActiveTab } from "../lib/tabScrape";
import { requestCleanJobDescription } from "../lib/jobDescriptionCleanApi";
import { shouldUseAiDescriptionClean } from "../lib/jobDescriptionQuality";
import { buildDefaultExportBasename } from "../lib/utils";
import { cn } from "../lib/classNames";
import { JobPane } from "../popup/components/JobPane";
import { LetterPane } from "../popup/components/LetterPane";
import { WorkspaceToolbar } from "./components/WorkspaceToolbar";
import { SPLIT_STACK_MAX_WIDTH, type WorkspaceTab, panelDensityFromWidth } from "./workspaceLayout";

function WorkspaceBrandMark({ className }: { className?: string }) {
  const [iconFailed, setIconFailed] = useState(false);
  const src =
    typeof chrome !== "undefined" && chrome.runtime?.id != null
      ? chrome.runtime.getURL("icons/coverclick-icon.png")
      : "";
  if (iconFailed || !src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-indigo-400 to-sky-400 text-[12px] font-black tracking-tight text-white",
          className,
        )}
      >
        CC
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className={cn("object-cover", className)}
      onError={() => setIconFailed(true)}
    />
  );
}

export function WorkspaceApp() {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [job, setJob] = useState<JobContext | null>(null);
  const [tone, setTone] = useState<DefaultTone>("professional");
  const [emphasis, setEmphasis] = useState<Emphasis>("general");
  const [length, setLength] = useState<LetterLength>("medium");
  const [responseShape, setResponseShape] = useState<ResponseShapePreference>("structured");
  const [letter, setLetter] = useState<StructuredCoverLetter>(() =>
    emptyStructuredFromContext(EMPTY_PROFILE, {
      jobTitle: "",
      companyName: "",
      descriptionText: "",
      pageUrl: "",
      scrapedAt: 0,
    }),
  );
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const jobRef = useRef(job);
  jobRef.current = job;
  const [genBusy, setGenBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [scrapeBusy, setScrapeBusy] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("split");
  const [exportBasename, setExportBasename] = useState(() => buildDefaultExportBasename(EMPTY_PROFILE, null));
  const exportDirtyRef = useRef(false);
  const panelShellRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(640);
  const [docEditEpoch, setDocEditEpoch] = useState(0);
  const [jobDescriptionAiBusy, setJobDescriptionAiBusy] = useState(false);
  const aiCleanAttemptedRef = useRef<string>("");
  const aiCleanGenerationRef = useRef(0);
  const [liveSettings, setLiveSettings] = useState<Pick<AppSettings, "useMock" | "authToken" | "apiBaseUrl">>(() => ({
    useMock: true,
    authToken: undefined,
    apiBaseUrl: "",
  }));

  const refreshScrape = useCallback(async () => {
    setScrapeBusy(true);
    setScrapeError(null);
    try {
      const next = await requestJobContextFromActiveTab();
      setJob(next);
    } catch (e) {
      setScrapeError(e instanceof Error ? e.message : "Scrape failed");
      setJob(null);
    } finally {
      setScrapeBusy(false);
    }
  }, []);

  useEffect(() => {
    const el = panelShellRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setPanelWidth(Math.max(200, el.clientWidth));
    });
    ro.observe(el);
    setPanelWidth(Math.max(200, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setDocEditEpoch((e) => e + 1);
  }, [job?.pageUrl, job?.scrapedAt]);

  useEffect(() => {
    void loadSettings().then((s) =>
      setLiveSettings({
        useMock: s.useMock,
        authToken: s.authToken,
        apiBaseUrl: s.apiBaseUrl,
      }),
    );
  }, []);

  useEffect(() => {
    if (!job?.pageUrl) {
      setJobDescriptionAiBusy(false);
      return;
    }
    const raw = job.descriptionText;
    if (!shouldUseAiDescriptionClean(raw)) {
      setJobDescriptionAiBusy(false);
      return;
    }
    if (liveSettings.useMock) {
      setJobDescriptionAiBusy(false);
      return;
    }
    if (!liveSettings.authToken?.trim() || !liveSettings.apiBaseUrl.trim()) {
      aiCleanAttemptedRef.current = "";
      setJobDescriptionAiBusy(false);
      return;
    }
    const key = `${job.pageUrl}|${job.scrapedAt}`;
    if (aiCleanAttemptedRef.current === key) return;

    const gen = ++aiCleanGenerationRef.current;
    let cancelled = false;
    aiCleanAttemptedRef.current = key;
    setJobDescriptionAiBusy(true);

    void (async () => {
      try {
        if (cancelled) return;
        const cleaned = await requestCleanJobDescription(liveSettings.apiBaseUrl, raw, liveSettings.authToken);
        if (cancelled || !cleaned.trim()) return;
        setJob((j) => (j && j.pageUrl === job.pageUrl && j.scrapedAt === job.scrapedAt ? { ...j, descriptionText: cleaned } : j));
      } catch {
        aiCleanAttemptedRef.current = "";
      } finally {
        if (!cancelled && aiCleanGenerationRef.current === gen) {
          setJobDescriptionAiBusy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (aiCleanGenerationRef.current === gen) {
        setJobDescriptionAiBusy(false);
      }
    };
  }, [job?.pageUrl, job?.scrapedAt, liveSettings.useMock, liveSettings.authToken, liveSettings.apiBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await loadProfile();
        const prefs = await loadGenerationPrefs(p);
        if (cancelled) return;
        setProfile(p);
        setTone(prefs.tone);
        setEmphasis(prefs.emphasis);
        setLength(prefs.length);
        setResponseShape(prefs.responseShape);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshScrape();
  }, [refreshScrape]);

  useEffect(() => {
    if (!job?.pageUrl) return;
    let cancelled = false;
    const p = profileRef.current;
    (async () => {
      const cache = await loadCachedLetter();
      if (cancelled) return;
      if (cache?.pageUrl !== job.pageUrl) {
        setLetter(emptyStructuredFromContext(p, job));
        return;
      }
      if (cache.structured) {
        setLetter(cache.structured);
      } else if (cache.coverLetter?.trim()) {
        setLetter(plainTextToStructuredLetter(cache.coverLetter, p, job));
      } else {
        setLetter(emptyStructuredFromContext(p, job));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [job?.pageUrl]);

  useEffect(() => {
    exportDirtyRef.current = false;
    setExportBasename(buildDefaultExportBasename(profileRef.current, jobRef.current));
  }, [job?.pageUrl]);

  useEffect(() => {
    if (exportDirtyRef.current) return;
    setExportBasename(buildDefaultExportBasename(profileRef.current, jobRef.current));
  }, [job?.jobTitle, job?.companyName, profile.fullName]);

  const onExportBasenameChange = useCallback((value: string) => {
    exportDirtyRef.current = true;
    setExportBasename(value);
  }, []);

  useEffect(() => {
    if (!job?.pageUrl) return;
    const has = letter.bodyParagraphs.some((p) => p.trim()) || letter.greeting.trim();
    if (!has) return;
    const id = window.setTimeout(() => {
      void saveCachedLetter({
        pageUrl: job.pageUrl,
        updatedAt: Date.now(),
        structured: letter,
      });
    }, 900);
    return () => window.clearTimeout(id);
  }, [letter, job?.pageUrl]);

  useEffect(() => {
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== "local") return;
      if (changes[STORAGE_KEYS.profile]) {
        void loadProfile().then((p) => {
          setProfile(p);
          if (!exportDirtyRef.current) {
            setExportBasename(buildDefaultExportBasename(p, jobRef.current));
          }
        });
      }
      if (changes[STORAGE_KEYS.settings]) {
        void loadSettings().then((s) =>
          setLiveSettings({
            useMock: s.useMock,
            authToken: s.authToken,
            apiBaseUrl: s.apiBaseUrl,
          }),
        );
      }
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => chrome.storage.onChanged.removeListener(onStorage);
  }, []);

  const persistPrefs = useCallback(
    async (next: {
      tone: DefaultTone;
      emphasis: Emphasis;
      length: LetterLength;
      responseShape: ResponseShapePreference;
    }) => {
      setTone(next.tone);
      setEmphasis(next.emphasis);
      setLength(next.length);
      setResponseShape(next.responseShape);
      await saveGenerationPrefs(next);
    },
    [],
  );

  const runGeneration = useCallback(async () => {
    if (!job) return;
    setGenBusy(true);
    setError(null);
    setStatus(null);
    try {
      const settings = await loadSettings();
      const result = await generateCoverLetter(settings, {
        profile,
        job,
        tone,
        emphasis,
        length,
        responseShape,
      });
      const structured = resolveStructuredLetter(result, profile, job);
      setLetter(structured);
      setDocEditEpoch((e) => e + 1);
      await saveCachedLetter({ pageUrl: job.pageUrl, structured, updatedAt: Date.now() });
      setStatus("Done");
      window.setTimeout(() => setStatus(null), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenBusy(false);
    }
  }, [profile, job, tone, emphasis, length, responseShape]);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(structuredLetterToPlainText(letter));
      setError(null);
      setStatus("Copied");
      window.setTimeout(() => setStatus(null), 900);
    } catch {
      setError("Clipboard blocked.");
    }
  }, [letter]);

  const onDocx = useCallback(async () => {
    if (!job) return;
    try {
      setError(null);
      await downloadStructuredCoverLetterDocx({
        fullName: profile.fullName,
        companyName: job.companyName,
        jobTitle: job.jobTitle,
        letter,
        fileBaseName: exportBasename,
      });
      setStatus("DOCX saved");
      window.setTimeout(() => setStatus(null), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "DOCX failed");
    }
  }, [letter, profile.fullName, job, exportBasename]);

  const onPdf = useCallback(async () => {
    if (!job) return;
    setPdfBusy(true);
    setError(null);
    setStatus(null);
    try {
      const { downloadStructuredCoverLetterPdf } = await import("../lib/exportPdf");
      await downloadStructuredCoverLetterPdf({
        letter,
        fullName: profile.fullName,
        companyName: job.companyName,
        jobTitle: job.jobTitle,
        fileBaseName: exportBasename,
      });
      setStatus("PDF saved");
      window.setTimeout(() => setStatus(null), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF failed");
    } finally {
      setPdfBusy(false);
    }
  }, [letter, profile.fullName, job, exportBasename]);

  const openProfile = useCallback(() => {
    void chrome.runtime.openOptionsPage();
  }, []);

  const handleJobChange = useCallback((next: JobContext) => {
    setJob(next);
  }, []);

  const panelDensity = panelDensityFromWidth(panelWidth);
  const stackedSplit = workspaceTab === "split" && panelWidth < SPLIT_STACK_MAX_WIDTH;

  const jobPaneBase = {
    job,
    profile,
    busy: scrapeBusy,
    error: scrapeError,
    onRefresh: () => void refreshScrape(),
    showRescanButton: false as const,
    onJobChange: handleJobChange,
    onRegenerateLetter: () => void runGeneration(),
    regenLetterBusy: genBusy,
    descriptionAiCleaning: jobDescriptionAiBusy,
  };

  const renderLetterPane = () => (
    <LetterPane
      letter={letter}
      onLetterChange={setLetter}
      tone={tone}
      emphasis={emphasis}
      length={length}
      responseShape={responseShape}
      onPrefsChange={(n) => void persistPrefs(n)}
      genBusy={genBusy}
      pdfBusy={pdfBusy}
      status={status}
      onGenerate={() => void runGeneration()}
      onRegenerate={() => void runGeneration()}
      onCopy={() => void onCopy()}
      onDocx={() => void onDocx()}
      onPdf={() => void onPdf()}
      profile={profile}
      job={job}
      docEditEpoch={docEditEpoch}
    />
  );

  return (
    <div className={cn("flex h-screen min-h-[360px] w-full min-w-0 flex-col overflow-hidden bg-[#f0f2f6] text-slate-900 antialiased")}>
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-2",
          "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-[0_4px_20px_rgba(15,23,42,0.28)]",
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <WorkspaceBrandMark className="h-8 w-8 shrink-0 rounded-xl shadow-lg shadow-indigo-950/40" />
          <div className="min-w-0">
            <h1 className="text-[14px] font-bold tracking-tight">CoverClick</h1>
            <p className="truncate text-[10px] font-medium text-indigo-100/80">From this tab · edit & export</p>
          </div>
        </div>
        <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-indigo-100/90 sm:inline">
          Beta
        </span>
      </header>

      <WorkspaceToolbar
        scrapeBusy={scrapeBusy}
        onRescan={() => void refreshScrape()}
        workspaceTab={workspaceTab}
        onWorkspaceTabChange={setWorkspaceTab}
        exportBasename={exportBasename}
        onExportBasenameChange={onExportBasenameChange}
        onOpenProfile={openProfile}
      />

      {error ? (
        <div className="shrink-0 border-b border-red-200/80 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-900">
          {error}
        </div>
      ) : null}

      <div ref={panelShellRef} className="flex min-h-0 flex-1 flex-col">
        {workspaceTab === "job" ? (
          <JobPane {...jobPaneBase} stackedInSplit={false} />
        ) : workspaceTab === "letter" ? (
          renderLetterPane()
        ) : stackedSplit ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
            <div className="flex min-h-0 max-h-[min(38vh,320px)] shrink-0 flex-col">
              <JobPane {...jobPaneBase} stackedInSplit />
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">{renderLetterPane()}</div>
          </div>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-x-hidden">
            <div
              className={cn(
                "flex min-h-0 min-w-0 shrink-0 flex-col overflow-x-hidden",
                panelDensity === "wide" ? "w-[min(34%,380px)]" : "w-[min(38%,320px)]",
              )}
            >
              <JobPane {...jobPaneBase} stackedInSplit={false} />
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">{renderLetterPane()}</div>
          </div>
        )}
      </div>
    </div>
  );
}
