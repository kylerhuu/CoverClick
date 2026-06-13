import { useCallback, useEffect, useState } from "react";
import type { JobApplication } from "../../lib/types";
import {
  formatApplicationApiError,
  getApplication,
  listApplications,
  updateApplication,
} from "../../lib/applicationsApi";
import { loadSettings } from "../../lib/storage";
import {
  groupApplicationsForHubList,
  hubSectionDotClass,
  hubSectionTitle,
  hubSummaryCounts,
} from "../../hub/applicationDisplay";
import { ApplicationDetailPanel } from "../../hub/components/ApplicationDetailPanel";
import { ApplicationListRow } from "../../hub/components/ApplicationListRow";
import { HubSummaryChips } from "../../hub/components/HubSummaryChips";
import { WorkspaceApp } from "../../workspace/WorkspaceApp";
import { cn } from "../../lib/classNames";
import { ccHubListSurface, ccHubSectionHeader, ccPagePadding, ccPageTitle } from "../../ui/ccUi";

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

  const sections = groupApplicationsForHubList(applications);
  const summary = hubSummaryCounts(applications);

  const openApplication = (app: JobApplication) => {
    onSelectedIdChange(app.id);
    setSelectedApplication(app);
    onSubviewChange("detail");
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", ccPagePadding)}>
      <h2 className={ccPageTitle}>Application Hub</h2>

      {applications.length > 0 ? (
        <div className="mt-3">
          <HubSummaryChips saved={summary.saved} ready={summary.ready} preparing={summary.preparing} />
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-[12px] font-medium text-red-700">{error}</p>
      ) : null}

      {loading && applications.length === 0 ? (
        <div className="flex items-center gap-2 py-10 text-[12px] text-slate-500">
          <span className="cc-spinner h-4 w-4 border-2" aria-hidden />
          Loading saved jobs…
        </div>
      ) : applications.length === 0 ? (
        <p className="py-10 text-center text-[12px] leading-relaxed text-slate-500">
          No saved jobs yet. Switch to Current job and choose Save for later.
        </p>
      ) : (
        <div
          className={cn(
            "-mx-4 mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-slate-200/80 px-3 py-2",
            ccHubListSurface,
          )}
        >
          {sections.map((section) => (
            <section key={section.status}>
              <h3 className={ccHubSectionHeader}>
                <span
                  className={cn("h-1.5 w-1.5 shrink-0 rounded-full", hubSectionDotClass(section.status))}
                  aria-hidden
                />
                <span>
                  {hubSectionTitle(section.status)} ({section.applications.length})
                </span>
              </h3>
              <div className="space-y-1.5 pb-2.5">
                {section.applications.map((app) => (
                  <ApplicationListRow
                    key={app.id}
                    application={app}
                    selected={app.id === selectedId}
                    onClick={() => openApplication(app)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
