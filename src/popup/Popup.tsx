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
import { requestJobContextFromActiveTab } from "../lib/tabScrape";
import { cn } from "../lib/classNames";
import { JobPane } from "./components/JobPane";
import { LetterPane } from "./components/LetterPane";

export function Popup() {
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
  const previewRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const [genBusy, setGenBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [scrapeBusy, setScrapeBusy] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      if (!changes[STORAGE_KEYS.profile]) return;
      void loadProfile().then(setProfile);
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
      });
      setStatus("DOCX saved");
      window.setTimeout(() => setStatus(null), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "DOCX failed");
    }
  }, [letter, profile.fullName, job]);

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
      });
      setStatus("PDF saved");
      window.setTimeout(() => setStatus(null), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF failed");
    } finally {
      setPdfBusy(false);
    }
  }, [letter, profile.fullName, job]);

  const openProfile = useCallback(() => {
    void chrome.runtime.openOptionsPage();
  }, []);

  return (
    <div
      className={cn(
        "flex h-[680px] w-[800px] flex-col overflow-hidden",
        "bg-slate-100 text-slate-900 antialiased",
      )}
    >
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5",
          "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-sky-400 text-[13px] font-black tracking-tight text-white shadow-lg shadow-indigo-900/40">
            CC
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold tracking-tight">CoverClick</h1>
            <p className="truncate text-[10px] font-medium text-indigo-100/90">Job-aware cover letters · local-first</p>
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 sm:flex">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-indigo-200/90">Beta</span>
        </div>
      </header>

      {error ? (
        <div className="shrink-0 border-b border-red-200/80 bg-red-50 px-4 py-2 text-[11px] font-medium text-red-900">
          {error}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 divide-x divide-slate-200/80 shadow-inner">
        <JobPane
          job={job}
          profile={profile}
          busy={scrapeBusy}
          error={scrapeError}
          onRefresh={() => void refreshScrape()}
        />
        <LetterPane
          letter={letter}
          onLetterChange={setLetter}
          previewRef={previewRef}
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
          onEditProfile={openProfile}
          profile={profile}
          job={job}
        />
      </div>
    </div>
  );
}
