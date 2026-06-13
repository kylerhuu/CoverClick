import { useCallback, useEffect, useRef, useState } from "react";
import type { JobApplication, JobContext } from "../lib/types";
import {
  createApplication,
  formatApplicationApiError,
  getApplicationByUrl,
  listApplications,
  pollApplicationUntilReady,
} from "../lib/applicationsApi";
import { jobSourceFromUrl, normalizeJobUrl } from "../lib/jobSource";
import {
  loadResumeLibrary,
  setActiveVariant,
  type ResumeLibraryStore,
} from "../lib/resumeLibrary";
import { applyScrapedCompanyDefaults } from "../lib/jobCompanyScrape";
import { requestJobContextFromActiveTab } from "../lib/tabScrape";
import { STORAGE_KEYS, loadSettings } from "../lib/storage";
import { WorkspaceApp } from "../workspace/WorkspaceApp";
import { CurrentJobSection } from "./components/CurrentJobSection";
import { SidePanelHeader } from "./components/SidePanelHeader";
import { SidePanelHubView, type HubSubview } from "./components/SidePanelHubView";
import { SidePanelModeNav, type SidePanelMode } from "./components/SidePanelModeNav";
import { ccPagePadding } from "../ui/ccUi";

export type ScanSubview = "home" | "apply";

export function ApplicationSidePanel() {
  const [mode, setMode] = useState<SidePanelMode>("scan");
  const [scanSubview, setScanSubview] = useState<ScanSubview>("home");
  const [hubSubview, setHubSubview] = useState<HubSubview>("list");
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const [hubApplications, setHubApplications] = useState<JobApplication[]>([]);

  const [resumeLibrary, setResumeLibrary] = useState<ResumeLibraryStore | null>(null);

  const [job, setJob] = useState<JobContext | null>(null);
  const [currentTabSaved, setCurrentTabSaved] = useState<JobApplication | null>(null);
  const [scrapeBusy, setScrapeBusy] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [settings, setSettings] = useState({ useMock: true, authToken: "", apiBaseUrl: "" });
  const pollAbortRef = useRef<AbortController | null>(null);

  const refreshResumeLibrary = useCallback(async () => {
    const library = await loadResumeLibrary();
    setResumeLibrary(library);
    return library;
  }, []);

  const refreshScrape = useCallback(async () => {
    setScrapeBusy(true);
    setScrapeError(null);
    try {
      const scraped = await requestJobContextFromActiveTab();
      setJob(applyScrapedCompanyDefaults(scraped));
    } catch (e) {
      setScrapeError(e instanceof Error ? e.message : "Scrape failed");
      setJob(null);
    } finally {
      setScrapeBusy(false);
    }
  }, []);

  const refreshHubApplications = useCallback(async () => {
    try {
      const s = await loadSettings();
      const data = await listApplications(s.apiBaseUrl, s.authToken, s.useMock);
      setHubApplications(data.applications);
    } catch {
      /* keep last list */
    }
  }, []);

  const refreshCurrentTabSaved = useCallback(async () => {
    if (!job?.pageUrl) {
      setCurrentTabSaved(null);
      return;
    }
    const existing = await getApplicationByUrl(
      settings.apiBaseUrl,
      settings.authToken,
      settings.useMock,
      job.pageUrl,
    );
    setCurrentTabSaved(existing);
  }, [job?.pageUrl, settings]);

  useEffect(() => {
    void loadSettings().then((s) =>
      setSettings({ useMock: s.useMock, authToken: s.authToken ?? "", apiBaseUrl: s.apiBaseUrl }),
    );
  }, []);

  useEffect(() => {
    void refreshResumeLibrary();
  }, [refreshResumeLibrary]);

  useEffect(() => {
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local") return;
      if (changes[STORAGE_KEYS.resumeLibrary]) void refreshResumeLibrary();
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => chrome.storage.onChanged.removeListener(onStorage);
  }, [refreshResumeLibrary]);

  useEffect(() => {
    void refreshScrape();
  }, [refreshScrape]);

  useEffect(() => {
    void refreshHubApplications();
    const interval = window.setInterval(() => void refreshHubApplications(), 5000);
    return () => window.clearInterval(interval);
  }, [refreshHubApplications]);

  useEffect(() => {
    void refreshCurrentTabSaved();
  }, [refreshCurrentTabSaved]);

  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

  const upsertHubApplication = useCallback((app: JobApplication) => {
    setHubApplications((prev) => {
      const idx = prev.findIndex((a) => a.id === app.id);
      if (idx < 0) return [app, ...prev];
      const next = [...prev];
      next[idx] = app;
      return next;
    });
    if (job?.pageUrl && normalizeJobUrl(job.pageUrl) === normalizeJobUrl(app.jobUrl)) {
      setCurrentTabSaved(app);
    }
  }, [job?.pageUrl]);

  const startPolling = useCallback(
    (id: string) => {
      pollAbortRef.current?.abort();
      const ac = new AbortController();
      pollAbortRef.current = ac;
      void pollApplicationUntilReady(
        settings.apiBaseUrl,
        settings.authToken,
        settings.useMock,
        id,
        upsertHubApplication,
        ac.signal,
      ).catch(() => {
        /* cancelled or failed */
      });
    },
    [settings, upsertHubApplication],
  );

  const handleSaveForLater = useCallback(async () => {
    if (!job?.pageUrl) return;
    if (!settings.useMock && (!settings.authToken?.trim() || !settings.apiBaseUrl.trim())) {
      setSaveError("Sign in with an active subscription to save jobs to the cloud.");
      return;
    }
    const library = resumeLibrary ?? (await refreshResumeLibrary());
    const active = library.variants.find((v) => v.id === library.activeVariantId) ?? library.variants[0];
    if (!active) {
      setSaveError("No resume variant selected.");
      return;
    }
    setSaveBusy(true);
    setSaveError(null);
    setSaveNotice(null);
    try {
      const { application: saved, message } = await createApplication(
        settings.apiBaseUrl,
        settings.authToken,
        settings.useMock,
        {
          company: job.companyName?.trim() || "Unknown company",
          title: job.jobTitle?.trim() || "Untitled role",
          location: "",
          source: jobSourceFromUrl(job.pageUrl),
          jobUrl: normalizeJobUrl(job.pageUrl),
          jobDescription: job.descriptionText?.trim() || "",
          resumeVariantId: active.id,
          resumeVariantName: active.name,
        },
      );
      upsertHubApplication(saved);
      setCurrentTabSaved(saved);
      setSaveNotice(message ?? "Saved for later — preparing in the background.");
      if (saved.status === "PREPARING") startPolling(saved.id);
    } catch (e) {
      setSaveError(formatApplicationApiError(e));
    } finally {
      setSaveBusy(false);
    }
  }, [job, settings, startPolling, upsertHubApplication, resumeLibrary, refreshResumeLibrary]);

  const handleModeChange = useCallback((next: SidePanelMode) => {
    setMode(next);
    if (next === "hub") {
      setHubSubview("list");
      setSelectedHubId(null);
    } else {
      setScanSubview("home");
    }
  }, []);

  const handleSelectResumeVariant = useCallback(
    async (id: string) => {
      await setActiveVariant(id);
      await refreshResumeLibrary();
    },
    [refreshResumeLibrary],
  );

  const preparingCurrentTab = currentTabSaved?.status === "PREPARING";

  const activeResumeVariantId = resumeLibrary?.activeVariantId ?? "";

  return (
    <div className="flex h-screen min-h-[360px] w-full min-w-0 flex-col overflow-hidden bg-[#f0f2f6] text-slate-900 antialiased">
      <SidePanelHeader />
      <SidePanelModeNav
        mode={mode}
        hubCount={hubApplications.length}
        preparingOnCurrentTab={preparingCurrentTab}
        onChange={handleModeChange}
      />

      {saveNotice && mode === "scan" && scanSubview === "home" ? (
        <div className="shrink-0 px-4 py-2 text-[12px] text-slate-600">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 align-middle" aria-hidden />
          {saveNotice}
        </div>
      ) : null}

      {saveError ? (
        <div className="shrink-0 px-4 py-2 text-[12px] font-medium text-red-700">{saveError}</div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {mode === "hub" ? (
          <SidePanelHubView
            selectedId={selectedHubId}
            onSelectedIdChange={setSelectedHubId}
            subview={hubSubview}
            onSubviewChange={setHubSubview}
            onApplicationsChange={setHubApplications}
          />
        ) : scanSubview === "apply" ? (
          <WorkspaceApp
            mode="capture"
            initialJob={job}
            initialWorkspaceTab="split"
            onBackToCapture={() => setScanSubview("home")}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className={ccPagePadding}>
              <CurrentJobSection
                job={job}
                scrapeBusy={scrapeBusy}
                scrapeError={scrapeError}
                saveBusy={saveBusy}
                resumeVariants={resumeLibrary?.variants ?? []}
                activeResumeVariantId={activeResumeVariantId}
                onSelectResumeVariant={(id) => void handleSelectResumeVariant(id)}
                onRescan={() => void refreshScrape()}
                onApplyNow={() => setScanSubview("apply")}
                onSaveForLater={() => void handleSaveForLater()}
                currentTabSaved={currentTabSaved}
                preparingInBackground={preparingCurrentTab}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
