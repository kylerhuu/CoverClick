import { useCallback, useEffect, useState } from "react";
import type { JobApplication } from "../../lib/types";
import {
  formatApplicationApiError,
  getApplication,
  listApplications,
  updateApplication,
} from "../../lib/applicationsApi";
import { loadSettings } from "../../lib/storage";
import { hubSummaryCounts, sortApplicationsByStatusPriority } from "../../hub/applicationDisplay";
import { ApplicationDetailPanel } from "../../hub/components/ApplicationDetailPanel";
import { ApplicationListRow } from "../../hub/components/ApplicationListRow";
import { HubSummaryChips } from "../../hub/components/HubSummaryChips";
import { WorkspaceApp } from "../../workspace/WorkspaceApp";
import { ccEyebrow, ccMuted } from "../../ui/ccUi";

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
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
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
      if (selectedId) {
        const match = data.applications.find((a) => a.id === selectedId);
        if (match) setSelectedApplication(match);
      }
    } catch (e) {
      setError(formatApplicationApiError(e));
    } finally {
      setLoading(false);
    }
  }, [onApplicationsChange, selectedId]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedApplication(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const fresh = await getApplication(settings.apiBaseUrl, settings.authToken, settings.useMock, selectedId);
      if (!cancelled && fresh) setSelectedApplication(fresh);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, settings.apiBaseUrl, settings.authToken, settings.useMock]);

  const handleMarkApplied = useCallback(async () => {
    if (!selectedApplication) return;
    setMarkAppliedBusy(true);
    try {
      const updated = await updateApplication(
        settings.apiBaseUrl,
        settings.authToken,
        settings.useMock,
        selectedApplication.id,
        { status: "APPLIED", dateApplied: new Date().toISOString() },
      );
      setSelectedApplication(updated);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (e) {
      setError(formatApplicationApiError(e));
    } finally {
      setMarkAppliedBusy(false);
    }
  }, [selectedApplication, settings]);

  const openMaterials = useCallback(async () => {
    if (!selectedId) return;
    try {
      const fresh = await getApplication(settings.apiBaseUrl, settings.authToken, settings.useMock, selectedId);
      if (fresh) setSelectedApplication(fresh);
      onSubviewChange("materials");
    } catch (e) {
      setError(formatApplicationApiError(e));
    }
  }, [selectedId, settings, onSubviewChange]);

  if (subview === "materials" && selectedApplication) {
    return (
      <WorkspaceApp
        mode="application"
        initialApplication={selectedApplication}
        onBackToCapture={() => onSubviewChange("detail")}
      />
    );
  }

  if (subview === "detail" && selectedApplication) {
    return (
      <ApplicationDetailPanel
        application={selectedApplication}
        onBack={() => {
          onSubviewChange("list");
        }}
        onOpenJob={() => void chrome.tabs.create({ url: selectedApplication.jobUrl })}
        onViewMaterials={() => void openMaterials()}
        onMarkApplied={() => void handleMarkApplied()}
        markAppliedBusy={markAppliedBusy}
      />
    );
  }

  const sortedApplications = sortApplicationsByStatusPriority(applications);
  const summary = hubSummaryCounts(applications);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <div>
        <p className={ccEyebrow}>Application Hub</p>
        <p className={ccMuted}>Tap a job to view details and materials.</p>
      </div>

      {applications.length > 0 ? (
        <HubSummaryChips saved={summary.saved} ready={summary.ready} preparing={summary.preparing} />
      ) : null}

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
          {sortedApplications.map((app) => (
            <li key={app.id}>
              <ApplicationListRow
                application={app}
                selected={app.id === selectedId}
                onClick={() => {
                  onSelectedIdChange(app.id);
                  setSelectedApplication(app);
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
