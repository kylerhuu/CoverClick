import type { JobApplication } from "../../lib/types";
import { formatRelativeDate } from "../../lib/jobSource";
import { coverLetterStatus, fitScoreLabel, statusBadgeLabel } from "../applicationDisplay";
import { cn } from "../../lib/classNames";
import { ccFocusRing } from "../../ui/ccUi";

type Props = {
  application: JobApplication;
  selected?: boolean;
  onClick: () => void;
};

export function ApplicationListRow({ application, selected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-indigo-300 bg-indigo-50/80 ring-1 ring-indigo-200/60"
          : "border-slate-200/80 bg-white/80 hover:border-indigo-200 hover:bg-white",
        ccFocusRing,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold text-slate-900">{application.title || "Untitled role"}</p>
          <p className="truncate text-[11px] font-medium text-indigo-700">{application.company || "Unknown company"}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600">
          {statusBadgeLabel(application)}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
        <span>
          Source: <strong className="text-slate-700">{application.source || "—"}</strong>
        </span>
        <span>
          Fit: <strong className="text-slate-700">{fitScoreLabel(application)}</strong>
        </span>
        <span>
          Letter: <strong className="text-slate-700">{coverLetterStatus(application)}</strong>
        </span>
        <span>
          Saved: <strong className="text-slate-700">{formatRelativeDate(application.dateSaved)}</strong>
        </span>
      </div>
    </button>
  );
}
