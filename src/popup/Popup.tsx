import { useCallback, useEffect, useState } from "react";
import { generateCoverLetter } from "../lib/api";
import type { DefaultTone, Emphasis, JobContext, LetterLength, UserProfile } from "../lib/types";
import { EMPTY_PROFILE } from "../lib/types";
import { downloadCoverLetterDocx } from "../lib/exportDocx";
import { normalizeLetterText } from "../lib/letterFormatting";
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
import { Header } from "./components/Header";
import { JobSection } from "./components/JobSection";
import { ProfileSection } from "./components/ProfileSection";
import { GenerationControls } from "./components/GenerationControls";
import { OutputSection } from "./components/OutputSection";

export function Popup() {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [job, setJob] = useState<JobContext | null>(null);
  const [tone, setTone] = useState<DefaultTone>("professional");
  const [emphasis, setEmphasis] = useState<Emphasis>("general");
  const [length, setLength] = useState<LetterLength>("medium");
  const [letter, setLetter] = useState("");
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
    (async () => {
      const cache = await loadCachedLetter();
      if (cancelled) return;
      if (cache?.pageUrl === job.pageUrl && cache.coverLetter.trim()) {
        setLetter(normalizeLetterText(cache.coverLetter));
      } else {
        setLetter("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [job?.pageUrl]);

  useEffect(() => {
    if (!job?.pageUrl || !letter.trim()) return;
    const id = window.setTimeout(() => {
      void saveCachedLetter({
        pageUrl: job.pageUrl,
        coverLetter: letter,
        updatedAt: Date.now(),
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

  const persistPrefs = useCallback(async (next: { tone: DefaultTone; emphasis: Emphasis; length: LetterLength }) => {
    setTone(next.tone);
    setEmphasis(next.emphasis);
    setLength(next.length);
    await saveGenerationPrefs(next);
  }, []);

  const runGeneration = useCallback(async () => {
    if (!job) return;
    setGenBusy(true);
    setError(null);
    setStatus(null);
    try {
      const settings = await loadSettings();
      const res = await generateCoverLetter(settings, {
        profile,
        job,
        tone,
        emphasis,
        length,
      });
      const normalized = normalizeLetterText(res.coverLetter);
      setLetter(normalized);
      await saveCachedLetter({ pageUrl: job.pageUrl, coverLetter: normalized, updatedAt: Date.now() });
      setStatus("Done");
      window.setTimeout(() => setStatus(null), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenBusy(false);
    }
  }, [profile, job, tone, emphasis, length]);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setError(null);
      setStatus("Copied");
      window.setTimeout(() => setStatus(null), 900);
    } catch {
      setError("Clipboard blocked.");
    }
  }, [letter]);

  const onDownload = useCallback(async () => {
    if (!job) return;
    try {
      setError(null);
      await downloadCoverLetterDocx({
        fullName: profile.fullName,
        companyName: job.companyName,
        jobTitle: job.jobTitle,
        letterText: letter,
      });
      setStatus("Saved");
      window.setTimeout(() => setStatus(null), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "DOCX failed");
    }
  }, [letter, profile.fullName, job]);

  const openProfile = useCallback(() => {
    void chrome.runtime.openOptionsPage();
  }, []);

  return (
    <div
      className={cn(
        "w-[384px] max-h-[620px] overflow-y-auto",
        "divide-y divide-slate-200/80 bg-white text-slate-900 antialiased",
      )}
    >
      <Header />

      {error ? (
        <div className="px-3.5 py-2 text-[11px] leading-snug text-red-700">{error}</div>
      ) : null}

      <JobSection job={job} busy={scrapeBusy} error={scrapeError} onRefresh={() => void refreshScrape()} />

      <ProfileSection profile={profile} onEdit={openProfile} />

      <GenerationControls
        tone={tone}
        emphasis={emphasis}
        length={length}
        onChange={(next) => void persistPrefs(next)}
      />

      <OutputSection
        letter={letter}
        onLetterChange={setLetter}
        busy={genBusy}
        status={status}
        onGenerate={() => void runGeneration()}
        onRegenerate={() => void runGeneration()}
        onCopy={() => void onCopy()}
        onDownload={() => void onDownload()}
      />
    </div>
  );
}
