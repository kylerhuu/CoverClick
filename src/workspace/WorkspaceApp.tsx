import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DefaultTone,
  Emphasis,
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
import { generateCoverLetter, resolveStructuredLetter } from "../lib/api";
import { downloadStructuredCoverLetterDocx } from "../lib/exportDocx";
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
  loadResumeStudio,
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
import { applyScrapedCompanyDefaults } from "../lib/jobCompanyScrape";
import { requestJobContextFromActiveTab } from "../lib/tabScrape";
import { requestCleanJobDescription } from "../lib/jobDescriptionCleanApi";
import { shouldUseAiDescriptionClean } from "../lib/jobDescriptionQuality";
import {
  hasProfileResumeData,
  hasResumeStudioContent,
  isResumeStudioEmpty,
  profileToStructuredResume,
} from "../lib/profileToStructuredResume";
import { buildDefaultExportBasename, buildDefaultResumeExportBasename } from "../lib/utils";
import { cn } from "../lib/classNames";
import { apiGenerateResumeSummary, apiOptimizeResumeForJob, ApiHttpError } from "../lib/backendApi";
import { JobPane } from "../popup/components/JobPane";
import { LetterPane } from "../popup/components/LetterPane";
import { ResumeStudioPane } from "../popup/components/ResumeStudioPane";
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

function stableItemId(prefix: string, idx: number, explicit?: string): string {
  if (explicit && explicit.trim()) return explicit;
  return `${prefix}-${idx + 1}`;
}

function withStableResumeIds(resume: StructuredResume): StructuredResume {
  return {
    ...resume,
    education: resume.education.map((item, idx) => ({ ...item, id: stableItemId("edu", idx, item.id) })),
    experience: resume.experience.map((item, idx) => ({ ...item, id: stableItemId("exp", idx, item.id) })),
    projects: resume.projects.map((item, idx) => ({ ...item, id: stableItemId("proj", idx, item.id) })),
    skills: resume.skills.map((item, idx) => ({ ...item, id: stableItemId("skills", idx, item.id) })),
  };
}

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
  const [resumeTargetRole, setResumeTargetRole] = useState("");
  const [resumeSummaryBusy, setResumeSummaryBusy] = useState(false);
  const [resumeSummaryError, setResumeSummaryError] = useState<string | null>(null);
  const [resumeOptimizeBusy, setResumeOptimizeBusy] = useState(false);
  const [resumeOptimizeError, setResumeOptimizeError] = useState<string | null>(null);
  const [resumeOptimizeResult, setResumeOptimizeResult] = useState<ResumeOptimizeForJobResponse | null>(null);
  const [suggestionDecisions, setSuggestionDecisions] = useState<Record<string, "pending" | "accepted" | "rejected">>({});
  const companyDebugEnabled = useCompanyExtractionDebugEnabled();

  const refreshScrape = useCallback(async () => {
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
    void (async () => {
      const [storedProfile, storedResume] = await Promise.all([loadProfile(), loadResumeStudio()]);
      const normalized = withStableResumeIds(storedResume);
      if (isResumeStudioEmpty(normalized) && hasProfileResumeData(storedProfile)) {
        const fromProfile = withStableResumeIds(profileToStructuredResume(storedProfile));
        setResume(fromProfile);
        void saveResumeStudio(fromProfile);
      } else {
        setResume(normalized);
      }
    })();
  }, []);

  useEffect(() => {
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
          if (e.status === 401 || e.status === 403) {
            setJobDescriptionAiError("AI cleanup needs an active paid session. Refresh access or sign in again.");
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
    if (resumeExportDirtyRef.current) return;
    setResumeExportBasename(buildDefaultResumeExportBasename(resume, job, resumeTargetRole));
  }, [resume.contact.fullName, job?.jobTitle, job?.companyName, resumeTargetRole, resume, job]);

  const onResumeExportBasenameChange = useCallback((value: string) => {
    resumeExportDirtyRef.current = true;
    setResumeExportBasename(value);
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

  const onResumeChange = useCallback((next: StructuredResume) => {
    const normalized = withStableResumeIds(next);
    setResume(normalized);
    void saveResumeStudio(normalized);
    setResumeOptimizeResult(null);
    setSuggestionDecisions({});
    setResumeOptimizeError(null);
  }, []);

  const onImportResumeFromProfile = useCallback(() => {
    const mapped = withStableResumeIds(profileToStructuredResume(profileRef.current));
    if (hasResumeStudioContent(resume)) {
      const ok = window.confirm(
        "This will replace your current resume draft with your profile info. Continue?",
      );
      if (!ok) return;
    }
    onResumeChange(mapped);
  }, [resume, onResumeChange]);

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
    try {
      await downloadResumeDocx(resume, resumeExportBasename || "CoverClick_Resume", ctx?.renderOptions);
      setStatus("Resume DOCX saved");
      window.setTimeout(() => setStatus(null), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resume DOCX failed");
    }
  }, [resume, resumeExportBasename]);

  const onResumePdf = useCallback(async () => {
    try {
      await downloadResumePdf(resume, resumeExportBasename || "CoverClick_Resume");
      setStatus("Resume PDF saved");
      window.setTimeout(() => setStatus(null), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resume PDF failed");
    }
  }, [resume, resumeExportBasename]);

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
        ) : workspaceTab === "resume" ? (
          <ResumeStudioPane
            resume={resume}
            exportFileBaseName={resumeExportBasename}
            onExportFileBaseNameChange={onResumeExportBasenameChange}
            targetRole={resumeTargetRole}
            summaryBusy={resumeSummaryBusy}
            summaryError={resumeSummaryError}
            jobAvailable={Boolean(job)}
            optimizeBusy={resumeOptimizeBusy}
            optimizeError={resumeOptimizeError}
            optimizeResult={resumeOptimizeResult}
            suggestionDecisions={suggestionDecisions}
            onTargetRoleChange={setResumeTargetRole}
            onResumeChange={onResumeChange}
            onGenerateSummary={() => void onGenerateResumeSummary()}
            onOptimizeForJob={() => void runResumeOptimizeForJob()}
            onAcceptSuggestion={onAcceptOptimizeSuggestion}
            onRejectSuggestion={onRejectOptimizeSuggestion}
            onExportDocx={(ctx) => void onResumeDocx(ctx)}
            onExportPdf={() => void onResumePdf()}
            onImportFromProfile={onImportResumeFromProfile}
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
