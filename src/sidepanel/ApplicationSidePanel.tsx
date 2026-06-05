import { useCallback, useEffect, useRef, useState } from "react";
import type { JobApplication, JobContext } from "../lib/types";
import {
  createApplication,
  formatApplicationApiError,
  getApplicationByUrl,
  pollApplicationUntilReady,
} from "../lib/applicationsApi";
import { jobSourceFromUrl, normalizeJobUrl } from "../lib/jobSource";
import { applyScrapedCompanyDefaults } from "../lib/jobCompanyScrape";
import { requestJobContextFromActiveTab } from "../lib/tabScrape";
import { loadSettings } from "../lib/storage";
import { cn } from "../lib/classNames";
import { DetectedJobCard } from "./components/DetectedJobCard";
import { SidePanelHubView, type HubSubview } from "./components/SidePanelHubView";
import { SidePanelModeNav, type SidePanelMode } from "./components/SidePanelModeNav";

function SidePanelBrand() {
  const [iconFailed, setIconFailed] = useState(false);
  const src =
    typeof chrome !== "undefined" && chrome.runtime?.id != null
      ? chrome.runtime.getURL("icons/coverclick-icon.png")
      : "";
  return (
    <header
      className={cn(
        "flex shrink-0 items-center gap-2.5 border-b border-white/10 px-3 py-2.5",
        "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-[0_4px_20px_rgba(15,23,42,0.28)]",
      )}
    >
      {iconFailed || !src ? (
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-sky-400 text-[12px] font-black">
          CC
        </div>
      ) : (
        <img src={src} alt="" className="h-8 w-8 rounded-xl object-cover" onError={() => setIconFailed(true)} />
      )}
      <div className="min-w-0">
        <h1 className="text-[14px] font-bold tracking-tight">CoverClick</h1>
        <p className="truncate text-[10px] font-medium text-indigo-100/80">Browse · Save · Apply</p>
      </div>
    </header>
  );
}

export function ApplicationSidePanel() {
  const [mode, setMode] = useState<SidePanelMode>("scan");
  const [hubSubview, setHubSubview] = useState<HubSubview>("list");
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const [hubApplications, setHubApplications] = useState<JobApplication[]>([]);

  const [job, setJob] = useState<JobContext | null>(null);
  const [currentTabSaved, setCurrentTabSaved] = useState<JobApplication | null>(null);
  const [scrapeBusy, setScrapeBusy] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [settings, setSettings] = useState({ useMock: true, authToken: "", apiBaseUrl: "" });
  const pollAbortRef = useRef<AbortController | null>(null);

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
    void refreshScrape();
  }, [refreshScrape]);

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

  const handleSave = useCallback(async () => {
    if (!job?.pageUrl) return;
    if (!settings.useMock && (!settings.authToken?.trim() || !settings.apiBaseUrl.trim())) {
      setSaveError("Sign in with an active subscription to save jobs to the cloud.");
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
        },
      );
      upsertHubApplication(saved);
      setCurrentTabSaved(saved);
      setSaveNotice(message ?? "Job saved — preparing in the background. Keep browsing!");
      if (saved.status === "PREPARING") startPolling(saved.id);
    } catch (e) {
      setSaveError(formatApplicationApiError(e));
    } finally {
      setSaveBusy(false);
    }
  }, [job, settings, startPolling, upsertHubApplication]);

  const handleModeChange = useCallback((next: SidePanelMode) => {
    setMode(next);
    if (next === "hub") {
      setHubSubview("list");
      setSelectedHubId(null);
    }
  }, []);

  const preparingCurrentTab = currentTabSaved?.status === "PREPARING";

  return (
    <div className="flex h-screen min-h-[360px] w-full min-w-0 flex-col overflow-hidden bg-[#f0f2f6] text-slate-900 antialiased">
      <SidePanelBrand />
      <SidePanelModeNav mode={mode} hubCount={hubApplications.length} onChange={handleModeChange} />

      {saveNotice && mode === "scan" ? (
        <div className="shrink-0 border-b border-indigo-200/80 bg-indigo-50 px-3 py-2 text-[11px] font-medium text-indigo-900">
          {saveNotice}
        </div>
      ) : null}

      {saveError ? (
        <div className="shrink-0 border-b border-red-200/80 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-900">
          {saveError}
        </div>
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
        ) : (
          <DetectedJobCard
            job={job}
            scrapeBusy={scrapeBusy}
            scrapeError={scrapeError}
            saveBusy={saveBusy}
            onRescan={() => void refreshScrape()}
            onSave={() => void handleSave()}
            alreadySaved={Boolean(currentTabSaved)}
            preparingInBackground={preparingCurrentTab}
            onOpenHub={() => handleModeChange("hub")}
          />
        )}
      </div>
    </div>
  );
}
