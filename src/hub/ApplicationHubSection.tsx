import { useCallback, useEffect, useState } from "react";
import type { ApplicationStats, JobApplication, JobApplicationStatus } from "../lib/types";
import { listApplications, updateApplication } from "../lib/applicationsApi";
import { loadSettings } from "../lib/storage";
import { ApplicationKanban } from "./components/ApplicationKanban";
import { ApplicationMaterialsPanel } from "./components/ApplicationMaterialsPanel";
import { cn } from "../lib/classNames";
import { ccEyebrow, ccSectionTitle, ccSurfaceQuiet } from "../ui/ccUi";

const EMPTY_STATS: ApplicationStats = { saved: 0, readyToApply: 0, applied: 0, interviewing: 0 };

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className={cn(ccSurfaceQuiet, "px-4 py-3")}>
      <p className={ccEyebrow}>{label}</p>
      <p className="mt-1 text-[22px] font-bold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

export function ApplicationHubSection() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState<ApplicationStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [materialsApp, setMaterialsApp] = useState<JobApplication | null>(null);
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

  return (
    <div className="space-y-6">
      <div>
        <p className={ccEyebrow}>Application Hub</p>
        <h2 className={ccSectionTitle}>Your job search, organized</h2>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-600">
          Browse jobs normally. Save the ones you like. CoverClick prepares and tracks everything — your Notion
          spreadsheet replacement for applications.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-900">{error}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Saved" value={stats.saved} />
        <StatTile label="Ready to Apply" value={stats.readyToApply} />
        <StatTile label="Applied" value={stats.applied} />
        <StatTile label="Interviewing" value={stats.interviewing} />
      </div>

      {loading && applications.length === 0 ? (
        <div className="flex items-center gap-2 py-12 text-[13px] text-slate-500">
          <span className="cc-spinner h-5 w-5 border-2" aria-hidden />
          Loading applications…
        </div>
      ) : applications.length === 0 ? (
        <div className={cn(ccSurfaceQuiet, "px-6 py-12 text-center")}>
          <p className="text-[14px] font-semibold text-slate-800">No saved jobs yet</p>
          <p className="mt-2 text-[13px] text-slate-600">
            Open a job posting, click the CoverClick side panel, and hit <strong>Save Job</strong>.
          </p>
        </div>
      ) : (
        <>
          {materialsApp ? (
            <ApplicationMaterialsPanel application={materialsApp} onClose={() => setMaterialsApp(null)} />
          ) : null}
          <ApplicationKanban
          applications={applications}
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
