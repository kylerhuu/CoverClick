import { useCallback, useEffect, useMemo, useState } from "react";
import type { JobApplication } from "../../lib/types";
import {
  formatApplicationApiError,
  getApplication,
  listApplications,
  updateApplication,
  deleteApplication,
} from "../../lib/applicationsApi";
import { loadSettings } from "../../lib/storage";
import {
  filterApplicationsByHubSearch,
  groupApplicationsForHubList,
  hubSectionDotClass,
  hubSectionTitle,
  hubSummaryCounts,
} from "../../hub/applicationDisplay";
import { ApplicationDetailPanel } from "../../hub/components/ApplicationDetailPanel";
import { ApplicationListRow } from "../../hub/components/ApplicationListRow";
import { HubSummaryChips } from "../../hub/components/HubSummaryChips";
import { WorkspaceApp } from "../../workspace/WorkspaceApp";
import { ProLockedPanel } from "../../ui/ProLockedPanel";
import { cn } from "../../lib/classNames";
import {
  ccFocusRing,
  ccHubListCardGap,
  ccHubSearchInput,
  ccHubSectionHeader,
  ccPagePadding,
  ccPageTitle,
} from "../../ui/ccUi";

export type HubSubview = "list" | "detail" | "materials";

type Props = {
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
  subview: HubSubview;
  onSubviewChange: (view: HubSubview) => void;
  onApplicationsChange?: (apps: JobApplication[]) => void;
  isPro?: boolean;
  onUpgrade?: () => void;
};

export function SidePanelHubView({
  selectedId,
  onSelectedIdChange,
  subview,
  onSubviewChange,
  onApplicationsChange,
  isPro = true,
  onUpgrade,
}: Props) {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markAppliedBusy, setMarkAppliedBusy] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState({ useMock: true, authToken: "", apiBaseUrl: "" });

  const refresh = useCallback(async () => {
    if (!isPro) {
      setLoading(false);
      setApplications([]);
      onApplicationsChange?.([]);
      return;
    }
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
  }, [isPro, onApplicationsChange, selectedId]);

  useEffect(() => {
    if (!isPro) return;
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [isPro, refresh]);

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

  const handleRemove = useCallback(async () => {
    if (!selectedApplication) return;
    setRemoveBusy(true);
    setError(null);
    try {
      await deleteApplication(
        settings.apiBaseUrl,
        settings.authToken,
        settings.useMock,
        selectedApplication.id,
      );
      setApplications((prev) => prev.filter((a) => a.id !== selectedApplication.id));
      onSelectedIdChange(null);
      setSelectedApplication(null);
      onSubviewChange("list");
    } catch (e) {
      setError(formatApplicationApiError(e));
    } finally {
      setRemoveBusy(false);
    }
  }, [selectedApplication, settings, onSelectedIdChange, onSubviewChange]);

  const filteredApplications = useMemo(
    () => filterApplicationsByHubSearch(applications, searchQuery),
    [applications, searchQuery],
  );
  const sections = groupApplicationsForHubList(filteredApplications);
  const summary = hubSummaryCounts(applications);
  const hasSearchQuery = searchQuery.trim().length > 0;

  const openApplication = (app: JobApplication) => {
    onSelectedIdChange(app.id);
    setSelectedApplication(app);
    onSubviewChange("detail");
  };

  if (!isPro) {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col", ccPagePadding)}>
        <ProLockedPanel
          title="Application Hub 🔒"
          subtitle="Track jobs across your search."
          bullets={["Save opportunities", "Continue applications later", "Track application status", "Manage your pipeline"]}
          onUpgrade={() => onUpgrade?.()}
        />
      </div>
    );
  }

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
        onRemove={() => void handleRemove()}
        markAppliedBusy={markAppliedBusy}
        removeBusy={removeBusy}
      />
    );
  }

  if (subview === "detail" && selectedId) {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col items-center justify-center", ccPagePadding)}>
        <span className="cc-spinner h-4 w-4 border-2" aria-hidden />
        <p className="mt-2 text-[12px] text-slate-500">Loading application…</p>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", ccPagePadding)}>
      <h2 className={ccPageTitle}>Application Hub</h2>

      {applications.length > 0 ? (
        <div className="mt-2">
          <HubSummaryChips saved={summary.saved} ready={summary.ready} preparing={summary.preparing} />
        </div>
      ) : null}

      {applications.length > 0 ? (
        <div className="relative mt-2.5">
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
            aria-label="Search applications by title or company"
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
              aria-label="Clear search"
            >
              Clear
            </button>
          ) : null}
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
      ) : filteredApplications.length === 0 ? (
        <p className="py-10 text-center text-[12px] leading-relaxed text-slate-500">
          No jobs match &ldquo;{searchQuery.trim()}&rdquo;. Try a different title or company.
        </p>
      ) : (
        <div className="mt-2 -mx-4 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-3">
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
              <div className={cn(ccHubListCardGap, "pb-3")}>
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
