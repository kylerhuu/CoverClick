import { useCallback, useEffect, useState } from "react";
import type { JobApplication } from "../../lib/types";
import { formatApplicationApiError, getApplication, listApplications, updateApplication } from "../../lib/applicationsApi";
import { loadSettings } from "../../lib/storage";
import { ApplicationDetailPanel } from "../../hub/components/ApplicationDetailPanel";
import { ApplicationListRow } from "../../hub/components/ApplicationListRow";
import { WorkspaceApp } from "../../workspace/WorkspaceApp";

export type HubSubview = "list" | "detail" | "materials";

type Props = {
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
  subview: HubSubview;
  onSubviewChange: (view: HubSubview) => void;
  onApplicationsChange?: (apps: JobApplication[]) => void;
};

export function SidePanelHubView({
  selectedId,
  onSelectedIdChange,
  subview,
  onSubviewChange,
  onApplicationsChange,
}: Props) {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markAppliedBusy, setMarkAppliedBusy] = useState(false);
  const [settings, setSettings] = useState({ useMock: true, authToken: "", apiBaseUrl: "" });

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const s = await loadSettings();
      setSettings({ useMock: s.useMock, authToken: s.authToken ?? "", apiBaseUrl: s.apiBaseUrl });
      const data = await listApplications(s.apiBaseUrl, s.authToken, s.useMock);
      setApplications(data.applications);
      onApplicationsChange?.(data.applications);
    } catch (e) {
      setError(formatApplicationApiError(e));
    } finally {
      setLoading(false);
    }
  }, [onApplicationsChange]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId || subview === "list") return;
    void (async () => {
      const fresh = await getApplication(settings.apiBaseUrl, settings.authToken, settings.useMock, selectedId);
      if (!fresh) return;
      setApplications((prev) => prev.map((a) => (a.id === fresh.id ? fresh : a)));
    })();
  }, [selectedId, subview, settings]);

  const handleMarkApplied = useCallback(async () => {
    if (!selected) return;
    setMarkAppliedBusy(true);
    try {
      const updated = await updateApplication(
        settings.apiBaseUrl,
        settings.authToken,
        settings.useMock,
        selected.id,
        { status: "APPLIED", dateApplied: new Date().toISOString() },
      );
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (e) {
      setError(formatApplicationApiError(e));
    } finally {
      setMarkAppliedBusy(false);
    }
  }, [selected, settings]);

  if (subview === "materials" && selected) {
    return (
      <WorkspaceApp
        initialApplication={selected}
        onBackToCapture={() => onSubviewChange("detail")}
      />
    );
  }

  if (subview === "detail" && selected) {
    return (
      <ApplicationDetailPanel
        application={selected}
        onBack={() => {
          onSelectedIdChange(null);
          onSubviewChange("list");
        }}
        onOpenJob={() => void chrome.tabs.create({ url: selected.jobUrl })}
        onViewMaterials={() => onSubviewChange("materials")}
        onMarkApplied={() => void handleMarkApplied()}
        markAppliedBusy={markAppliedBusy}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Saved jobs</p>
        <p className="text-[12px] text-slate-600">Tap a job to view details and materials.</p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-900">{error}</p>
      ) : null}

      {loading && applications.length === 0 ? (
        <div className="flex items-center gap-2 py-8 text-[12px] text-slate-500">
          <span className="cc-spinner h-5 w-5 border-2" aria-hidden />
          Loading saved jobs…
        </div>
      ) : applications.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-slate-500">
          No saved jobs yet. Switch to <strong>Current job</strong> and save one.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {applications.map((app) => (
            <li key={app.id}>
              <ApplicationListRow
                application={app}
                selected={app.id === selectedId}
                onClick={() => {
                  onSelectedIdChange(app.id);
                  onSubviewChange("detail");
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
