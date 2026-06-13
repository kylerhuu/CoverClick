import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApplicationStats, JobApplication, JobApplicationStatus } from "../lib/types";
import { listApplications, updateApplication } from "../lib/applicationsApi";
import { loadSettings } from "../lib/storage";
import { filterApplicationsByHubSearch, hubSummaryCounts } from "./applicationDisplay";
import { ApplicationKanban } from "./components/ApplicationKanban";
import { ApplicationMaterialsPanel } from "./components/ApplicationMaterialsPanel";
import { cn } from "../lib/classNames";
import { WorkspaceHero, WorkspaceStat, wsHeroName, wsPageIntro } from "../ui/workspaceUi";
import { ccFocusRing, ccHubSearchInput } from "../ui/ccUi";

const EMPTY_STATS: ApplicationStats = { saved: 0, readyToApply: 0, applied: 0, interviewing: 0 };

export function ApplicationHubSection() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState<ApplicationStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [materialsApp, setMaterialsApp] = useState<JobApplication | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState({ useMock: true, authToken: "", apiBaseUrl: "" });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await loadSettings();
      setSettings({ useMock: s.useMock, authToken: s.authToken ?? "", apiBaseUrl: s.apiBaseUrl });
      const data = await listApplications(s.apiBaseUrl, s.authToken, s.useMock);
      setApplications(data.applications);
      setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const stored = sessionStorage.getItem("coverclick_view_materials_id");
    if (!stored || applications.length === 0) return;
    const app = applications.find((a) => a.id === stored);
    if (app) setMaterialsApp(app);
    sessionStorage.removeItem("coverclick_view_materials_id");
  }, [applications]);

  const handleStatusChange = useCallback(
    async (id: string, status: JobApplicationStatus) => {
      setStatusBusyId(id);
      try {
        const updated = await updateApplication(settings.apiBaseUrl, settings.authToken, settings.useMock, id, {
          status,
          ...(status === "APPLIED" ? { dateApplied: new Date().toISOString() } : {}),
        });
        setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
        const data = await listApplications(settings.apiBaseUrl, settings.authToken, settings.useMock);
        setStats(data.stats);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update status.");
      } finally {
        setStatusBusyId(null);
      }
    },
    [settings],
  );

  const openJob = useCallback((url: string) => {
    void chrome.tabs.create({ url });
  }, []);

  const viewMaterials = useCallback((app: JobApplication) => {
    setMaterialsApp(app);
  }, []);

  const filteredApplications = useMemo(
    () => filterApplicationsByHubSearch(applications, searchQuery),
    [applications, searchQuery],
  );
  const summary = hubSummaryCounts(applications);
  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <div className="cc-fade-in mt-4 space-y-6">
      <WorkspaceHero>
        <h2 className={wsHeroName}>Application Hub</h2>
        <p className={cn(wsPageIntro, "mt-1 max-w-2xl")}>
          Your job pipeline — saved opportunities, prepared materials, and application progress in one place.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <WorkspaceStat label="Ready to apply" value={summary.ready} highlight={summary.ready > 0} />
          <WorkspaceStat label="Preparing" value={summary.preparing} />
          <WorkspaceStat label="Saved" value={summary.saved} />
          <WorkspaceStat label="Applied" value={stats.applied} />
        </div>
      </WorkspaceHero>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-900">{error}</p>
      ) : null}

      {applications.length > 0 ? (
        <div className="relative max-w-md">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or company"
            aria-label="Search applications"
            className={cn(ccHubSearchInput, hasSearchQuery && "pr-14")}
          />
          {hasSearchQuery ? (
            <button
              type="button"
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:text-slate-800",
                ccFocusRing,
              )}
              onClick={() => setSearchQuery("")}
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      {loading && applications.length === 0 ? (
        <div className="flex items-center gap-2 py-12 text-[13px] text-slate-500">
          <span className="cc-spinner h-5 w-5 border-2" aria-hidden />
          Loading applications…
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-xl border border-slate-200/90 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-[14px] font-semibold text-slate-800">No saved jobs yet</p>
          <p className="mt-2 text-[13px] text-slate-600">
            Open a job posting, click the CoverClick side panel, and choose <strong>Save for later</strong>.
          </p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-slate-500">
          No jobs match &ldquo;{searchQuery.trim()}&rdquo;.
        </p>
      ) : (
        <>
          {materialsApp ? (
            <ApplicationMaterialsPanel application={materialsApp} onClose={() => setMaterialsApp(null)} />
          ) : null}
          <ApplicationKanban
            applications={filteredApplications}
            onOpenJob={openJob}
            onViewMaterials={viewMaterials}
            onStatusChange={(id, status) => void handleStatusChange(id, status)}
            statusBusyId={statusBusyId}
          />
        </>
      )}
    </div>
  );
}
