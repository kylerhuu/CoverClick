import type { JobApplication } from "../../lib/types";
import { formatRelativeDate } from "../../lib/jobSource";
import { coverLetterStatus, fitScoreLabel, statusBadgeLabel } from "../applicationDisplay";
import { PreparationProgress } from "../../sidepanel/components/PreparationProgress";
import { cn } from "../../lib/classNames";
import { ccBtnPrimary, ccBtnSecondarySm, ccSurfaceQuiet } from "../../ui/ccUi";

type Props = {
  application: JobApplication;
  onBack: () => void;
  onOpenJob: () => void;
  onViewMaterials: () => void;
  onMarkApplied: () => void;
  markAppliedBusy?: boolean;
};

export function ApplicationDetailPanel({
  application,
  onBack,
  onOpenJob,
  onViewMaterials,
  onMarkApplied,
  markAppliedBusy,
}: Props) {
  const isPreparing = application.status === "PREPARING";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-[12px] font-semibold text-indigo-600 hover:text-indigo-800"
      >
        ← Back to saved jobs
      </button>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {statusBadgeLabel(application)}
        </p>
        <h2 className="mt-1 text-[16px] font-bold tracking-tight text-slate-900">{application.title || "Untitled role"}</h2>
        <p className="mt-0.5 text-[13px] font-medium text-indigo-700">{application.company || "Unknown company"}</p>
      </div>

      <div className={cn(ccSurfaceQuiet, "grid grid-cols-2 gap-2 p-3 text-[11px]")}>
        <div>
          <p className="text-slate-500">Fit score</p>
          <p className="font-semibold text-slate-900">{fitScoreLabel(application)}</p>
        </div>
        <div>
          <p className="text-slate-500">Cover letter</p>
          <p className="font-semibold text-emerald-700">{coverLetterStatus(application)}</p>
        </div>
        <div>
          <p className="text-slate-500">Source</p>
          <p className="font-semibold text-slate-900">{application.source || "—"}</p>
        </div>
        <div>
          <p className="text-slate-500">Saved</p>
          <p className="font-semibold text-slate-900">{formatRelativeDate(application.dateSaved)}</p>
        </div>
      </div>

      {isPreparing ? (
        <PreparationProgress steps={application.preparationSteps} error={application.preparationError} />
      ) : null}

      <div className="mt-auto grid grid-cols-2 gap-2">
        <button type="button" className={ccBtnSecondarySm} onClick={onOpenJob}>
          Open Job
        </button>
        <button type="button" className={ccBtnSecondarySm} onClick={onViewMaterials}>
          View Materials
        </button>
        {application.status !== "APPLIED" && application.status !== "INTERVIEWING" && application.status !== "OFFER" ? (
          <button type="button" className={ccBtnPrimary} disabled={markAppliedBusy} onClick={onMarkApplied}>
            {markAppliedBusy ? "Updating…" : "Mark Applied"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
