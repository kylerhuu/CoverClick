import type { JobApplication } from "../../lib/types";
import { hubSummaryCounts, sortApplicationsByStatusPriority } from "../../hub/applicationDisplay";
import { ApplicationListRow } from "../../hub/components/ApplicationListRow";
import { HubSummaryChips } from "../../hub/components/HubSummaryChips";
import { cn } from "../../lib/classNames";
import { ccBtnGhost, ccEyebrow, ccFocusRing } from "../../ui/ccUi";

const RECENT_LIMIT = 4;

type Props = {
  applications: JobApplication[];
  loading?: boolean;
  onSelectApplication: (app: JobApplication) => void;
  onViewAll: () => void;
  className?: string;
};

export function RecentApplicationsSection({
  applications,
  loading,
  onSelectApplication,
  onViewAll,
  className,
}: Props) {
  const sorted = sortApplicationsByStatusPriority(applications).slice(0, RECENT_LIMIT);
  const summary = hubSummaryCounts(applications);

  if (!loading && applications.length === 0) {
    return null;
  }

  return (
    <section className={cn("space-y-2.5", className)}>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className={ccEyebrow}>Recent applications</p>
          <p className="text-[11px] font-medium text-slate-500">Pick up where you left off</p>
        </div>
        {applications.length > RECENT_LIMIT ? (
          <button type="button" className={cn(ccBtnGhost, "shrink-0 text-[10px]")} onClick={onViewAll}>
            View all
          </button>
        ) : applications.length > 0 ? (
          <button type="button" className={cn(ccBtnGhost, "shrink-0 text-[10px]")} onClick={onViewAll}>
            Hub
          </button>
        ) : null}
      </div>

      {applications.length > 0 ? (
        <HubSummaryChips saved={summary.saved} ready={summary.ready} preparing={summary.preparing} />
      ) : null}

      {loading && applications.length === 0 ? (
        <div className="flex items-center gap-2 py-4 text-[11px] text-slate-500">
          <span className="cc-spinner h-4 w-4 border-2" aria-hidden />
          Loading…
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((app) => (
            <li key={app.id}>
              <ApplicationListRow application={app} onClick={() => onSelectApplication(app)} />
            </li>
          ))}
        </ul>
      )}

      {applications.length > 0 ? (
        <button
          type="button"
          className={cn(
            "w-full rounded-lg border border-slate-200/80 bg-white/80 py-2 text-[11px] font-semibold text-slate-700 shadow-sm",
            "hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-950",
            ccFocusRing,
          )}
          onClick={onViewAll}
        >
          View all applications
        </button>
      ) : null}
    </section>
  );
}
