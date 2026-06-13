import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DefaultTone,
  Emphasis,
  JobApplication,
  JobContext,
  LetterLength,
  ResumeOptimizationSuggestion,
  ResumeOptimizeForJobResponse,
  ResponseShapePreference,
  StructuredResume,
  StructuredCoverLetter,
  UserProfile,
} from "../lib/types";
import { EMPTY_PROFILE, EMPTY_STRUCTURED_RESUME } from "../lib/types";
import { applicationToJobContext, tailoringToOptimizePreview } from "../hub/applicationContext";
import { pollApplicationUntilReady } from "../lib/applicationsApi";
import { isProfileReadyForGeneration } from "../lib/profileReadiness";
import { generateCoverLetter, resolveStructuredLetter } from "../lib/api";
import { downloadResumeDocx } from "../lib/exportResumeDocx";
import { downloadResumePdf } from "../lib/exportResumePdf";
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
  saveResumeStudio,
} from "../lib/storage";
import type { AppSettings } from "../lib/types";
import {
  logScrapedJobContextForDebug,
  readCompanyExtractionDebugEnabled,
} from "../lib/companyExtractionDebugClient";
import { useCompanyExtractionDebugEnabled } from "../lib/useCompanyExtractionDebugEnabled";
import { useAccessGate } from "../auth/useAccessGate";
import { applyScrapedCompanyDefaults } from "../lib/jobCompanyScrape";
import { requestJobContextFromActiveTab } from "../lib/tabScrape";
import { requestCleanJobDescription } from "../lib/jobDescriptionCleanApi";
import { shouldUseAiDescriptionClean } from "../lib/jobDescriptionQuality";
import { hasResumeStudioContent, profileToStructuredResume } from "../lib/profileToStructuredResume";
import { getActiveVariant, setActiveVariant } from "../lib/resumeLibrary";
import { normalizeEducationItem } from "../lib/resumeEducation";
import { buildDefaultExportBasename, buildDefaultResumeExportBasename } from "../lib/utils";
import { cn } from "../lib/classNames";
import {
  ccBgApp,
  ccTextLink,
  ccHeroSubtitle,
  ccHeroTitle,
  ccTertiaryText,
} from "../ui/ccUi";
import { apiGenerateResumeSummary, apiOptimizeResumeForJob, ApiHttpError } from "../lib/backendApi";
import { JobPane } from "../popup/components/JobPane";
import { LetterPane } from "../popup/components/LetterPane";
import { ResumeStudioPane } from "../popup/components/ResumeStudioPane";
import { WorkspaceToolbar } from "./components/WorkspaceToolbar";
import { PreparationProgress } from "../sidepanel/components/PreparationProgress";
import { SPLIT_STACK_MAX_WIDTH, type WorkspaceTab, panelDensityFromWidth } from "./workspaceLayout";

export type WorkspaceMode = "capture" | "application" | "library";

const RESUME_AUTOSAVE_MS = 600;

export function WorkspaceApp({
  mode = "capture",
  initialApplication,
  initialJob,
  initialWorkspaceTab,
  libraryVariantId,
  libraryVariantName,
  onBackToCapture,
  onBackToLibrary,
}: {
  mode?: WorkspaceMode;
  initialApplication?: JobApplication | null;
  /** Seed job from side panel scrape — skips initial re-scrape in capture mode. */
  initialJob?: JobContext | null;
  initialWorkspaceTab?: WorkspaceTab;
  /** When mode=library, optionally activate this variant before editing. */
  libraryVariantId?: string;
  libraryVariantName?: string;
  onBackToCapture?: () => void;
  onBackToLibrary?: () => void;
} = {}) {
  const gate = useAccessGate();
  const isApplicationMode = mode === "application";
  const isLibraryMode = mode === "library";
  const [applicationRecord, setApplicationRecord] = useState<JobApplication | null>(
    isApplicationMode && initialApplication ? initialApplication : null,
  );

function stableItemId(prefix: string, idx: number, explicit?: string): string {
  if (explicit && explicit.trim()) return explicit;
  return `${prefix}-${idx + 1}`;
}

function withStableResumeIds(resume: StructuredResume): StructuredResume {
  return {
    ...resume,
    education: resume.education.map((item, idx) =>
      normalizeEducationItem({ ...item, id: stableItemId("edu", idx, item.id) }),
    ),
    experience: resume.experience.map((item, idx) => ({ ...item, id: stableItemId("exp", idx, item.id) })),
    projects: resume.projects.map((item, idx) => ({ ...item, id: stableItemId("proj", idx, item.id) })),
    skills: resume.skills.map((item, idx) => ({ ...item, id: stableItemId("skills", idx, item.id) })),
  };
}

  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [job, setJob] = useState<JobContext | null>(() =>
    !isApplicationMode && initialJob?.pageUrl ? initialJob : null,
  );
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
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(
    isLibraryMode ? "resume" : (initialWorkspaceTab ?? "letter"),
  );
  const [saveBusy, setSaveBusy] = useState(false);
  const [exportBasename, setExportBasename] = useState(() => buildDefaultExportBasename(EMPTY_PROFILE, null));
  const exportDirtyRef = useRef(false);
  const [resumeExportBasename, setResumeExportBasename] = useState(() =>
    buildDefaultResumeExportBasename(EMPTY_STRUCTURED_RESUME, null),
  );
  const resumeExportDirtyRef = useRef(false);
  const panelShellRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(640);
  const [docEditEpoch, setDocEditEpoch] = useState(0);
  const [jobDescriptionAiBusy, setJobDescriptionAiBusy] = useState(false);
  const [jobDescriptionAiError, setJobDescriptionAiError] = useState<string | null>(null);
  const aiCleanAttemptedRef = useRef<string>("");
  const aiCleanGenerationRef = useRef(0);
  const [liveSettings, setLiveSettings] = useState<Pick<AppSettings, "useMock" | "authToken" | "apiBaseUrl">>(() => ({
    useMock: true,
    authToken: undefined,
    apiBaseUrl: "",
  }));
  const [resume, setResume] = useState<StructuredResume>(EMPTY_STRUCTURED_RESUME);
  const resumeRef = useRef<StructuredResume>(EMPTY_STRUCTURED_RESUME);
  const resumeDirtyRef = useRef(false);
  const resumeLoadGenerationRef = useRef(0);
  const resumeSaveGenerationRef = useRef(0);
  const resumeSaveTimerRef = useRef<number | null>(null);
  const [resumeVariantName, setResumeVariantName] = useState(libraryVariantName ?? "General");
  const [resumeTargetRole, setResumeTargetRole] = useState("");
  const [resumeSummaryBusy, setResumeSummaryBusy] = useState(false);
  const [resumeSummaryError, setResumeSummaryError] = useState<string | null>(null);
  const [resumeOptimizeBusy, setResumeOptimizeBusy] = useState(false);
  const [resumeOptimizeError, setResumeOptimizeError] = useState<string | null>(null);
  const [resumeOptimizeResult, setResumeOptimizeResult] = useState<ResumeOptimizeForJobResponse | null>(null);
  const [suggestionDecisions, setSuggestionDecisions] = useState<Record<string, "pending" | "accepted" | "rejected">>({});
  const companyDebugEnabled = useCompanyExtractionDebugEnabled();
  const applicationPollRef = useRef<AbortController | null>(null);

  const applyApplicationRecord = useCallback((app: JobApplication) => {
    setApplicationRecord(app);
    const ctx = applicationToJobContext(app);
    setJob(ctx);
    if (app.coverLetterDraft) {
      setLetter(app.coverLetterDraft);
    } else {
      setLetter(emptyStructuredFromContext(profileRef.current, ctx));
    }
    if (app.resumeSuggestions) {
      setResumeOptimizeResult(tailoringToOptimizePreview(app.resumeSuggestions));
    }
  }, []);

  const refreshScrape = useCallback(async () => {
    if (isApplicationMode) return;
    setScrapeBusy(true);
    setScrapeError(null);
    try {
      const debugOn = await readCompanyExtractionDebugEnabled();
      const scraped = await requestJobContextFromActiveTab();
      const next = applyScrapedCompanyDefaults(scraped);
      if (debugOn) {
        logScrapedJobContextForDebug(next, "JobContext after Re-scan (side panel)");
      }
      setJob(next);
    } catch (e) {
      setScrapeError(e instanceof Error ? e.message : "Scrape failed");
      setJob(null);
    } finally {
      setScrapeBusy(false);
    }
  }, [isApplicationMode]);

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
    setResumeOptimizeResult(null);
    setSuggestionDecisions({});
    setResumeOptimizeError(null);
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
    let cancelled = false;
    const loadGeneration = ++resumeLoadGenerationRef.current;
    void (async () => {
      if (isLibraryMode && libraryVariantId) {
        await setActiveVariant(libraryVariantId);
      }
      const active = await getActiveVariant();
      if (cancelled || loadGeneration !== resumeLoadGenerationRef.current || resumeDirtyRef.current) return;
      const normalized = withStableResumeIds(active.resume);
      setResume(normalized);
      resumeRef.current = normalized;
      setResumeVariantName(libraryVariantName ?? active.name);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLibraryMode, libraryVariantId, libraryVariantName]);

  const flushResumeSave = useCallback(async () => {
    if (resumeSaveTimerRef.current != null) {
      window.clearTimeout(resumeSaveTimerRef.current);
      resumeSaveTimerRef.current = null;
    }
    if (!resumeDirtyRef.current) return;
    resumeSaveGenerationRef.current += 1;
    const normalized = withStableResumeIds(resumeRef.current);
    await saveResumeStudio(normalized);
  }, []);

  const scheduleResumeSave = useCallback(() => {
    if (resumeSaveTimerRef.current != null) {
      window.clearTimeout(resumeSaveTimerRef.current);
    }
    const saveGeneration = ++resumeSaveGenerationRef.current;
    resumeSaveTimerRef.current = window.setTimeout(() => {
      resumeSaveTimerRef.current = null;
      if (saveGeneration !== resumeSaveGenerationRef.current) return;
      const normalized = withStableResumeIds(resumeRef.current);
      void saveResumeStudio(normalized);
    }, RESUME_AUTOSAVE_MS);
  }, []);

  useEffect(() => {
    return () => {
      void flushResumeSave();
    };
  }, [flushResumeSave]);

  useEffect(() => {
    if (isApplicationMode) {
      setJobDescriptionAiBusy(false);
      setJobDescriptionAiError(null);
      return;
    }
    if (!job?.pageUrl) {
      setJobDescriptionAiBusy(false);
      setJobDescriptionAiError(null);
      return;
    }
    const raw = job.descriptionText;
    if (!shouldUseAiDescriptionClean(raw)) {
      setJobDescriptionAiBusy(false);
      setJobDescriptionAiError(null);
      return;
    }
    if (liveSettings.useMock) {
      setJobDescriptionAiBusy(false);
      setJobDescriptionAiError(null);
      return;
    }
    if (!liveSettings.authToken?.trim() || !liveSettings.apiBaseUrl.trim()) {
      aiCleanAttemptedRef.current = "";
      setJobDescriptionAiBusy(false);
      setJobDescriptionAiError(null);
      return;
    }
    const key = `${job.pageUrl}|${job.scrapedAt}`;
    if (aiCleanAttemptedRef.current === key) return;

    const gen = ++aiCleanGenerationRef.current;
    let cancelled = false;
    aiCleanAttemptedRef.current = key;
    setJobDescriptionAiBusy(true);
    setJobDescriptionAiError(null);

    void (async () => {
      try {
        if (cancelled) return;
        const cleaned = await requestCleanJobDescription(liveSettings.apiBaseUrl, raw, liveSettings.authToken);
        if (cancelled || !cleaned.trim()) return;
        setJob((j) => (j && j.pageUrl === job.pageUrl && j.scrapedAt === job.scrapedAt ? { ...j, descriptionText: cleaned } : j));
      } catch (e) {
        aiCleanAttemptedRef.current = "";
        if (cancelled) return;
        if (e instanceof ApiHttpError) {
          if (e.status === 401) {
            setJobDescriptionAiError("Sign in to use AI job description cleanup.");
            return;
          }
          if (e.status === 429) {
            setJobDescriptionAiError("AI cleanup is rate-limited right now. Try again in a minute.");
            return;
          }
          setJobDescriptionAiError(e.message);
          return;
        }
        setJobDescriptionAiError(
          e instanceof Error ? e.message : "AI cleanup failed. You can still edit the posting manually.",
        );
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
  }, [isApplicationMode, job?.pageUrl, job?.scrapedAt, liveSettings.useMock, liveSettings.authToken, liveSettings.apiBaseUrl]);

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
    if (isLibraryMode || isApplicationMode) return;
    if (!initialJob?.pageUrl) {
      void refreshScrape();
    }
  }, [refreshScrape, isApplicationMode, isLibraryMode, initialJob?.pageUrl]);

  useEffect(() => {
    if (!isApplicationMode || !initialApplication) return;
    applyApplicationRecord(initialApplication);
  }, [isApplicationMode, initialApplication?.id, initialApplication?.updatedAt, applyApplicationRecord]);

  useEffect(() => {
    if (!isApplicationMode || !initialApplication?.id) return;
    if (initialApplication.status !== "PREPARING") return;

    applicationPollRef.current?.abort();
    const ac = new AbortController();
    applicationPollRef.current = ac;

    void pollApplicationUntilReady(
      liveSettings.apiBaseUrl,
      liveSettings.authToken,
      liveSettings.useMock,
      initialApplication.id,
      (app) => applyApplicationRecord(app),
      ac.signal,
    ).catch(() => {
      /* cancelled */
    });

    return () => {
      ac.abort();
    };
  }, [
    isApplicationMode,
    initialApplication?.id,
    initialApplication?.status,
    liveSettings.apiBaseUrl,
    liveSettings.authToken,
    liveSettings.useMock,
    applyApplicationRecord,
  ]);

  useEffect(() => {
    return () => {
      applicationPollRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (isApplicationMode) return;
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
  }, [isApplicationMode, job?.pageUrl]);

  useEffect(() => {
    if (isApplicationMode) return;
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
    if (resumeExportDirtyRef.current) return;
    setResumeExportBasename(buildDefaultResumeExportBasename(resume, job, resumeTargetRole));
  }, [resume.contact.fullName, job?.jobTitle, job?.companyName, resumeTargetRole, resume, job]);

  const onResumeExportBasenameChange = useCallback((value: string) => {
    resumeExportDirtyRef.current = true;
    setResumeExportBasename(value);
  }, []);

  useEffect(() => {
    if (isApplicationMode) return;
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
  }, [isApplicationMode, letter, job?.pageUrl]);

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
      if (changes[STORAGE_KEYS.resumeLibrary]) {
        void getActiveVariant().then((v) => {
          setResumeVariantName(v.name);
          if (!resumeDirtyRef.current) {
            const normalized = withStableResumeIds(v.resume);
            setResume(normalized);
            resumeRef.current = normalized;
          }
        });
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
    const profileNow = profileRef.current;
    if (!isProfileReadyForGeneration(profileNow)) {
      setError("Set up your profile first — import your resume and review Profile in Options.");
      return;
    }
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
      if (!isApplicationMode) {
        await saveCachedLetter({ pageUrl: job.pageUrl, structured, updatedAt: Date.now() });
      }
      setStatus("Done");
      window.setTimeout(() => setStatus(null), 1200);
      if (!isLibraryMode) setWorkspaceTab("letter");
      void gate.refresh();
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === "FREE_CREDITS_EXHAUSTED") {
        setError(err.message || "You've used all free cover letter generations.");
        void gate.refresh();
        return;
      }
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenBusy(false);
    }
  }, [profile, job, tone, emphasis, length, responseShape, isApplicationMode, isLibraryMode, gate]);

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

  const onSaveLetter = useCallback(async () => {
    if (!job?.pageUrl) return;
    setSaveBusy(true);
    setError(null);
    try {
      await saveCachedLetter({ pageUrl: job.pageUrl, structured: letter, updatedAt: Date.now() });
      if (isApplicationMode && applicationRecord) {
        setApplicationRecord({ ...applicationRecord, coverLetterDraft: letter });
      }
      setStatus("Saved");
      window.setTimeout(() => setStatus(null), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaveBusy(false);
    }
  }, [job?.pageUrl, letter, isApplicationMode, applicationRecord]);

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

  const onResumeChange = useCallback(
    (next: StructuredResume) => {
      const normalized = withStableResumeIds(next);
      resumeDirtyRef.current = true;
      resumeRef.current = normalized;
      setResume(normalized);
      scheduleResumeSave();
      setResumeOptimizeResult(null);
      setSuggestionDecisions({});
      setResumeOptimizeError(null);
    },
    [scheduleResumeSave],
  );

  const onPersistResumeChange = useCallback(
    async (next: StructuredResume) => {
      const normalized = withStableResumeIds(next);
      resumeDirtyRef.current = true;
      resumeRef.current = normalized;
      setResume(normalized);
      await flushResumeSave();
      setResumeOptimizeResult(null);
      setSuggestionDecisions({});
      setResumeOptimizeError(null);
    },
    [flushResumeSave],
  );

  const onImportResumeFromProfile = useCallback(() => {
    const mapped = withStableResumeIds(profileToStructuredResume(profileRef.current));
    if (hasResumeStudioContent(resume)) {
      const ok = window.confirm(
        "This will replace your saved resume with your profile info. Continue?",
      );
      if (!ok) return;
    }
    resumeDirtyRef.current = true;
    resumeRef.current = mapped;
    setResume(mapped);
    void flushResumeSave();
    setResumeOptimizeResult(null);
    setSuggestionDecisions({});
    setResumeOptimizeError(null);
  }, [resume, flushResumeSave]);

  const handleBackToCapture = useCallback(() => {
    void (async () => {
      await flushResumeSave();
      onBackToCapture?.();
    })();
  }, [flushResumeSave, onBackToCapture]);

  const handleBackToLibrary = useCallback(() => {
    void (async () => {
      await flushResumeSave();
      onBackToLibrary?.();
    })();
  }, [flushResumeSave, onBackToLibrary]);

  const onGenerateResumeSummary = useCallback(async () => {
    setResumeSummaryBusy(true);
    setResumeSummaryError(null);
    try {
      const settings = await loadSettings();
      if (settings.useMock) {
        const name = resume.contact.fullName.trim() || "Candidate";
        const role = resumeTargetRole.trim() || "target role";
        onResumeChange({
          ...resume,
          summary: `${name} is a motivated candidate with hands-on experience and a practical, results-focused approach. Ready to contribute in ${role} through strong execution, communication, and ownership.`,
        });
        return;
      }
      const token = settings.authToken?.trim();
      const base = settings.apiBaseUrl.trim();
      if (!token || !base) throw new Error("Sign in and configure API access to generate summary.");
      const out = await apiGenerateResumeSummary(base, token, { targetRole: resumeTargetRole, resume });
      onResumeChange({ ...resume, summary: out.summary });
    } catch (e) {
      setResumeSummaryError(e instanceof Error ? e.message : "Summary generation failed");
    } finally {
      setResumeSummaryBusy(false);
    }
  }, [onResumeChange, resume, resumeTargetRole]);

  const runResumeOptimizeForJob = useCallback(async () => {
    if (!job) {
      setResumeOptimizeError("Scrape a job posting before optimizing.");
      return;
    }
    setResumeOptimizeBusy(true);
    setResumeOptimizeError(null);
    try {
      const settings = await loadSettings();
      if (settings.useMock) {
        setResumeOptimizeResult({
          summary: "Mock optimization: sharpen wording and align key bullets to job requirements.",
          suggestions: [],
          keywordsToAdd: ["stakeholder management", "cross-functional collaboration"],
          warnings: ["Disable mock mode to run full AI optimization."],
        });
        setSuggestionDecisions({});
        return;
      }
      const token = settings.authToken?.trim();
      const base = settings.apiBaseUrl.trim();
      if (!token || !base) throw new Error("Sign in and configure API access to optimize resume.");
      const out = await apiOptimizeResumeForJob(base, token, { resume, job });
      setResumeOptimizeResult(out);
      setSuggestionDecisions(Object.fromEntries(out.suggestions.map((sg) => [sg.id, "pending"] as const)));
    } catch (e) {
      setResumeOptimizeError(e instanceof Error ? e.message : "Resume optimization failed");
    } finally {
      setResumeOptimizeBusy(false);
    }
  }, [job, resume]);

  function applyAcceptedSuggestion(baseResume: StructuredResume, sg: ResumeOptimizationSuggestion): StructuredResume {
    const next = withStableResumeIds({ ...baseResume });
    const applyByText = (items: string[], currentText: string, suggestedText: string): string[] => {
      if (!suggestedText.trim()) return items;
      const current = currentText.trim();
      const idx = current ? items.findIndex((x) => x.trim() === current) : -1;
      if (sg.changeType === "add") return [...items, suggestedText.trim()];
      if (idx < 0) return items;
      if (sg.changeType === "remove") return items.filter((_, i) => i !== idx);
      if (sg.changeType === "rewrite" || sg.changeType === "emphasize") {
        const copy = [...items];
        copy[idx] = suggestedText.trim();
        return copy;
      }
      return items;
    };

    if (sg.section === "summary") {
      if ((sg.changeType === "rewrite" || sg.changeType === "emphasize" || sg.changeType === "add") && sg.suggestedText.trim()) {
        return { ...next, summary: sg.suggestedText.trim() };
      }
      return next;
    }

    if (sg.section === "experience") {
      const idx = next.experience.findIndex((e) => e.id === sg.targetId);
      if (idx < 0) return next;
      const item = next.experience[idx];
      const copy = [...next.experience];
      if (!sg.fieldPath || sg.fieldPath === "bullets") {
        copy[idx] = { ...item, bullets: applyByText(item.bullets, sg.currentText, sg.suggestedText) };
      }
      return { ...next, experience: copy };
    }

    if (sg.section === "projects") {
      const idx = next.projects.findIndex((e) => e.id === sg.targetId);
      if (idx < 0) return next;
      const item = next.projects[idx];
      const copy = [...next.projects];
      if (!sg.fieldPath || sg.fieldPath === "bullets") {
        copy[idx] = { ...item, bullets: applyByText(item.bullets, sg.currentText, sg.suggestedText) };
      } else if (sg.fieldPath === "techStack") {
        copy[idx] = { ...item, techStack: applyByText(item.techStack, sg.currentText, sg.suggestedText) };
      } else if (sg.fieldPath === "subtitle" && sg.suggestedText.trim()) {
        copy[idx] = { ...item, subtitle: sg.suggestedText.trim() };
      }
      return { ...next, projects: copy };
    }

    if (sg.section === "skills") {
      const idx = next.skills.findIndex((e) => e.id === sg.targetId);
      if (idx < 0) return next;
      const item = next.skills[idx];
      const updated = applyByText(item.items, sg.currentText, sg.suggestedText);
      const copy = [...next.skills];
      copy[idx] = { ...item, items: updated };
      return { ...next, skills: copy };
    }

    if (sg.section === "education") {
      const idx = next.education.findIndex((e) => e.id === sg.targetId);
      if (idx < 0) return next;
      const item = next.education[idx];
      const copy = [...next.education];
      copy[idx] = { ...item, details: applyByText(item.details, sg.currentText, sg.suggestedText) };
      return { ...next, education: copy };
    }

    return next;
  }

  const onAcceptOptimizeSuggestion = useCallback((id: string) => {
    if (!resumeOptimizeResult) return;
    const sg = resumeOptimizeResult.suggestions.find((x) => x.id === id);
    if (!sg) return;

    const safeAutoApply =
      sg.section === "summary" ||
      (sg.targetId &&
        (sg.changeType === "rewrite" || sg.changeType === "add" || sg.changeType === "remove" || sg.changeType === "emphasize"));
    if (!safeAutoApply) {
      setResumeOptimizeError("Suggestion marked accepted but requires manual edit due ambiguous target mapping.");
      setSuggestionDecisions((prev) => ({ ...prev, [id]: "accepted" }));
      return;
    }

    const updated = applyAcceptedSuggestion(resume, sg);
    onResumeChange(updated);
    setSuggestionDecisions((prev) => ({ ...prev, [id]: "accepted" }));
  }, [resumeOptimizeResult, resume, onResumeChange]);

  const onRejectOptimizeSuggestion = useCallback((id: string) => {
    setSuggestionDecisions((prev) => ({ ...prev, [id]: "rejected" }));
  }, []);

  const onResumeDocx = useCallback(async (ctx?: { renderOptions?: import("../lib/resumeRender").ResumeRenderOptions }) => {
    if (!gate.me?.hasPaidAccess && gate.phase !== "mock") {
      setError("Resume export is a Pro feature. Upgrade in Options → Cloud & Billing.");
      return;
    }
    try {
      await downloadResumeDocx(resume, resumeExportBasename || "CoverClick_Resume", ctx?.renderOptions);
      setStatus("Resume DOCX saved");
      window.setTimeout(() => setStatus(null), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resume DOCX failed");
    }
  }, [resume, resumeExportBasename, gate.me?.hasPaidAccess, gate.phase]);

  const onResumePdf = useCallback(async (ctx?: { renderOptions?: import("../lib/resumeRender").ResumeRenderOptions }) => {
    if (!gate.me?.hasPaidAccess && gate.phase !== "mock") {
      setError("Resume export is a Pro feature. Upgrade in Options → Cloud & Billing.");
      return;
    }
    try {
      await downloadResumePdf(resume, resumeExportBasename || "CoverClick_Resume", ctx?.renderOptions);
      setStatus("Resume PDF saved");
      window.setTimeout(() => setStatus(null), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resume PDF failed");
    }
  }, [resume, resumeExportBasename, gate.me?.hasPaidAccess, gate.phase]);

  const handleJobChange = useCallback((next: JobContext) => {
    setJob(next);
  }, []);

  const panelDensity = panelDensityFromWidth(panelWidth);
  const stackedSplit = workspaceTab === "split" && panelWidth < SPLIT_STACK_MAX_WIDTH;

  const jobPaneBase = {
    job,
    profile,
    busy: isApplicationMode ? false : scrapeBusy,
    error: isApplicationMode ? null : scrapeError,
    onRefresh: isApplicationMode ? () => {} : () => void refreshScrape(),
    showRescanButton: false as const,
    onJobChange: handleJobChange,
    onRegenerateLetter: () => void runGeneration(),
    regenLetterBusy: genBusy,
    descriptionAiCleaning: jobDescriptionAiBusy,
    descriptionAiError: jobDescriptionAiError,
    companyDebugEnabled,
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
      saveBusy={saveBusy}
      status={status}
      onGenerate={() => void runGeneration()}
      onRegenerate={() => void runGeneration()}
      onCopy={() => void onCopy()}
      onSave={() => void onSaveLetter()}
      onDownload={() => void onPdf()}
      profile={profile}
      job={job}
      exportBasename={exportBasename}
      onExportBasenameChange={onExportBasenameChange}
      docEditEpoch={docEditEpoch}
      freeGenerationsRemaining={
        gate.me?.hasPaidAccess ? null : (gate.me?.freeCoverLetterGenerationsRemaining ?? 0)
      }
      onUpgrade={() => void gate.openStripeCheckout()}
    />
  );

  const workspaceTitle = isLibraryMode
    ? resumeVariantName
    : job?.jobTitle?.trim() || applicationRecord?.title?.trim() || "Untitled role";
  const workspaceCompany = isLibraryMode
    ? ""
    : job?.companyName?.trim() || applicationRecord?.company?.trim() || "";
  const workspaceResumeLine = isLibraryMode ? null : `Resume: ${resumeVariantName}`;

  return (
    <div className={cn("flex h-screen min-h-[360px] w-full min-w-0 flex-col overflow-hidden text-slate-900 antialiased", ccBgApp)}>
      <header className="shrink-0 border-b border-slate-100/80 bg-white/90 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex min-w-0 items-start gap-3">
          {onBackToLibrary ? (
            <button type="button" onClick={handleBackToLibrary} className={cn(ccTextLink, "shrink-0 pt-0.5")}>
              ← Saved Resumes
            </button>
          ) : onBackToCapture ? (
            <button type="button" onClick={handleBackToCapture} className={cn(ccTextLink, "shrink-0 pt-0.5")}>
              ← Back
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className={cn(ccHeroTitle, "truncate")}>{workspaceTitle}</h1>
            {workspaceCompany ? (
              <p className={cn(ccHeroSubtitle, "mt-0.5 truncate")}>{workspaceCompany}</p>
            ) : null}
            {workspaceResumeLine ? (
              <p className={cn(ccTertiaryText, "mt-1 truncate")}>{workspaceResumeLine}</p>
            ) : null}
          </div>
        </div>
      </header>

      <WorkspaceToolbar
        scrapeBusy={scrapeBusy}
        onRescan={() => void refreshScrape()}
        showRescan={!isApplicationMode && !isLibraryMode}
        resumeOnlyMode={isLibraryMode}
        workspaceTab={workspaceTab}
        onWorkspaceTabChange={setWorkspaceTab}
        onOpenProfile={openProfile}
      />

      {error ? (
        <div className="shrink-0 border-b border-red-200/80 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-900">
          {error}
        </div>
      ) : null}

      {isApplicationMode && applicationRecord?.status === "PREPARING" ? (
        <div className="shrink-0 border-b border-indigo-200/80 bg-indigo-50/80 px-3 py-3">
          <PreparationProgress
            steps={applicationRecord.preparationSteps}
            error={applicationRecord.preparationError}
          />
        </div>
      ) : null}

      <div ref={panelShellRef} className="flex min-h-0 flex-1 flex-col">
        {workspaceTab === "job" ? (
          <JobPane {...jobPaneBase} stackedInSplit={false} />
        ) : workspaceTab === "resume" ? (
          <ResumeStudioPane
            resume={resume}
            resumeVariantName={resumeVariantName}
            exportFileBaseName={resumeExportBasename}
            onExportFileBaseNameChange={onResumeExportBasenameChange}
            targetRole={resumeTargetRole}
            summaryBusy={resumeSummaryBusy}
            summaryError={resumeSummaryError}
            jobAvailable={!isLibraryMode && Boolean(job)}
            optimizeBusy={resumeOptimizeBusy}
            optimizeError={resumeOptimizeError}
            optimizeResult={resumeOptimizeResult}
            suggestionDecisions={suggestionDecisions}
            onTargetRoleChange={setResumeTargetRole}
            onResumeChange={onResumeChange}
            onPersistResumeChange={onPersistResumeChange}
            onGenerateSummary={() => void onGenerateResumeSummary()}
            onOptimizeForJob={() => void runResumeOptimizeForJob()}
            onAcceptSuggestion={onAcceptOptimizeSuggestion}
            onRejectSuggestion={onRejectOptimizeSuggestion}
            onExportDocx={(ctx) => void onResumeDocx(ctx)}
            onExportPdf={(ctx) => void onResumePdf(ctx)}
            onImportFromProfile={onImportResumeFromProfile}
            libraryMode={isLibraryMode}
          />
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
