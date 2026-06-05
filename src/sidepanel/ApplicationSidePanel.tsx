import { useCallback, useEffect, useRef, useState } from "react";
import type { JobApplication, JobContext } from "../lib/types";
import {
  createApplication,
  getApplicationByUrl,
  pollApplicationUntilReady,
  updateApplication,
} from "../lib/applicationsApi";
import { applyScrapedCompanyDefaults } from "../lib/jobCompanyScrape";
import { jobSourceFromUrl } from "../lib/jobSource";
import { requestJobContextFromActiveTab } from "../lib/tabScrape";
import { loadSettings } from "../lib/storage";
import { cn } from "../lib/classNames";
import { DetectedJobCard } from "./components/DetectedJobCard";
import { PreparationProgress } from "./components/PreparationProgress";
import { ReadyToApplyPanel } from "./components/ReadyToApplyPanel";
import { WorkspaceApp } from "../workspace/WorkspaceApp";

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

type View = "capture" | "materials";

export function ApplicationSidePanel() {
  const [view, setView] = useState<View>("capture");
  const [job, setJob] = useState<JobContext | null>(null);
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [scrapeBusy, setScrapeBusy] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [markAppliedBusy, setMarkAppliedBusy] = useState(false);
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

  useEffect(() => {
    void loadSettings().then((s) =>
      setSettings({ useMock: s.useMock, authToken: s.authToken ?? "", apiBaseUrl: s.apiBaseUrl }),
    );
  }, []);

  useEffect(() => {
    void refreshScrape();
  }, [refreshScrape]);

  useEffect(() => {
    if (!job?.pageUrl) {
      setApplication(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const existing = await getApplicationByUrl(
        settings.apiBaseUrl,
        settings.authToken,
        settings.useMock,
        job.pageUrl,
      );
      if (!cancelled) setApplication(existing);
    })();
    return () => {
      cancelled = true;
    };
  }, [job?.pageUrl, settings.apiBaseUrl, settings.authToken, settings.useMock]);

  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

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
        (app) => setApplication(app),
        ac.signal,
      ).catch(() => {
        /* cancelled or failed — UI keeps last known state */
      });
    },
    [settings.apiBaseUrl, settings.authToken, settings.useMock],
  );

  const handleSave = useCallback(async () => {
    if (!job?.pageUrl) return;
    setSaveBusy(true);
    setSaveError(null);
    try {
      const saved = await createApplication(settings.apiBaseUrl, settings.authToken, settings.useMock, {
        company: job.companyName?.trim() || "Unknown company",
        title: job.jobTitle?.trim() || "Untitled role",
        location: "",
        source: jobSourceFromUrl(job.pageUrl),
        jobUrl: job.pageUrl,
        jobDescription: job.descriptionText?.trim() || "",
      });
      setApplication(saved);
      if (saved.status === "PREPARING") startPolling(saved.id);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save job.");
    } finally {
      setSaveBusy(false);
    }
  }, [job, settings, startPolling]);

  const openJob = useCallback(() => {
    if (!application?.jobUrl) return;
    void chrome.tabs.create({ url: application.jobUrl });
  }, [application?.jobUrl]);

  const openHub = useCallback(() => {
    const url = chrome.runtime.getURL("options.html#applications");
    void chrome.tabs.create({ url });
  }, []);

  const handleMarkApplied = useCallback(async () => {
    if (!application) return;
    setMarkAppliedBusy(true);
    try {
      const updated = await updateApplication(
        settings.apiBaseUrl,
        settings.authToken,
        settings.useMock,
        application.id,
        { status: "APPLIED", dateApplied: new Date().toISOString() },
      );
      setApplication(updated);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not update status.");
    } finally {
      setMarkAppliedBusy(false);
    }
  }, [application, settings]);

  if (view === "materials" && application) {
    return (
      <WorkspaceApp
        initialApplication={application}
        onBackToCapture={() => setView("capture")}
      />
    );
  }

  const showPreparing = application?.status === "PREPARING";
  const showReady =
    application?.status === "READY_TO_APPLY" ||
    application?.status === "APPLIED" ||
    application?.status === "INTERVIEWING" ||
    application?.status === "OFFER";

  return (
    <div className="flex h-screen min-h-[360px] w-full min-w-0 flex-col overflow-hidden bg-[#f0f2f6] text-slate-900 antialiased">
      <SidePanelBrand />

      {saveError ? (
        <div className="shrink-0 border-b border-red-200/80 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-900">
          {saveError}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {showReady && application ? (
          <ReadyToApplyPanel
            application={application}
            onOpenJob={openJob}
            onViewMaterials={() => setView("materials")}
            onMarkApplied={() => void handleMarkApplied()}
            onOpenHub={openHub}
            markAppliedBusy={markAppliedBusy}
          />
        ) : showPreparing && application ? (
          <div className="flex flex-col gap-4 p-4">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">{application.title}</h2>
              <p className="text-[12px] font-medium text-indigo-700">{application.company}</p>
            </div>
            <PreparationProgress steps={application.preparationSteps} error={application.preparationError} />
            <p className="text-[11px] text-slate-500">Keep browsing — we&apos;ll prepare everything in the background.</p>
            <button type="button" className="text-[12px] font-semibold text-indigo-600" onClick={openHub}>
              Open Application Hub
            </button>
          </div>
        ) : (
          <DetectedJobCard
            job={job}
            scrapeBusy={scrapeBusy}
            scrapeError={scrapeError}
            saveBusy={saveBusy}
            onRescan={() => void refreshScrape()}
            onSave={() => void handleSave()}
            alreadySaved={Boolean(application)}
          />
        )}
      </div>
    </div>
  );
}
