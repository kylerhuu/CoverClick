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
    if (!job || !previewRef.current) return;
    try {
      setError(null);
      const { downloadLetterPreviewPdf } = await import("../lib/exportPdf");
      await downloadLetterPreviewPdf({
        element: previewRef.current,
        fullName: profile.fullName,
        companyName: job.companyName,
        jobTitle: job.jobTitle,
      });
      setStatus("PDF saved");
      window.setTimeout(() => setStatus(null), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF failed");
    }
  }, [profile.fullName, job]);

  const openProfile = useCallback(() => {
    void chrome.runtime.openOptionsPage();
  }, []);

  return (
    <div
      className={cn(
        "flex h-[680px] w-[800px] flex-col overflow-hidden",
        "bg-slate-50 text-slate-900 antialiased",
      )}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200/90 bg-white px-4 py-2">
        <div>
          <h1 className="text-[14px] font-semibold tracking-tight">CoverClick</h1>
          <p className="text-[10px] text-slate-500">Job pane · letter pane</p>
        </div>
      </header>

      {error ? <div className="shrink-0 bg-red-50 px-4 py-1.5 text-[11px] text-red-800">{error}</div> : null}

      <div className="flex min-h-0 flex-1 divide-x divide-slate-200/90">
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
