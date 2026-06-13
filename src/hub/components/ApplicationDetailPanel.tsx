import type { JobApplication } from "../../lib/types";
import { formatRelativeDate } from "../../lib/jobSource";
import {
  coverLetterStatus,
  detailHeroStatusClass,
  detailHeroStatusLabel,
  detailReadinessLines,
  fitScoreChipClass,
  fitScoreLabel,
  fitScoreTone,
  letterChipClass,
  resumeVariantChipClass,
  resumeVariantChipLabel,
  statusBadgeLabel,
  statusPillClass,
} from "../applicationDisplay";
import { PreparationProgress } from "../../sidepanel/components/PreparationProgress";
import { cn } from "../../lib/classNames";
import {
  ccBtnGhost,
  ccBtnPrimary,
  ccBtnSecondarySm,
  ccDetailHeroStatus,
  ccDetailReadinessBlock,
  ccDetailReadinessLine,
  ccHeroCard,
  ccMetaChip,
  ccStatusPill,
} from "../../ui/ccUi";

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
  const isReady = application.status === "READY_TO_APPLY";
  const fit = fitScoreLabel(application);
  const fitTone = fitScoreTone(application);
  const resumeLabel = resumeVariantChipLabel(application);
  const readinessLines = detailReadinessLines(application);
  const showMarkApplied =
    application.status !== "APPLIED" && application.status !== "INTERVIEWING" && application.status !== "OFFER";
  const primaryCtaLabel = isReady ? "Continue Application" : "View Materials";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 p-3">
      <button type="button" className={cn(ccBtnGhost, "self-start px-1")} onClick={onBack}>
        ← Back to Application Hub
      </button>

      {isReady ? (
        <div className="space-y-3">
          <p className={cn(ccDetailHeroStatus, detailHeroStatusClass(application.status))}>
            {detailHeroStatusLabel(application)}
          </p>
          <div>
            <h2 className="text-[17px] font-bold leading-snug tracking-tight text-slate-900">
              {application.title || "Untitled role"}
            </h2>
            <p className="mt-1 text-[14px] font-semibold text-indigo-700">
              {application.company || "Unknown company"}
            </p>
            {application.source ? (
              <p className="mt-1.5 text-[10px] font-medium text-slate-500">{application.source}</p>
            ) : null}
          </div>

          <div className={ccDetailReadinessBlock}>
            <ul className="space-y-2">
              {readinessLines.map((line) => (
                <li key={line.label} className={ccDetailReadinessLine}>
                  <span className="shrink-0 text-emerald-600" aria-hidden>
                    ✓
                  </span>
                  <span>{line.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className={ccHeroCard}>
          <div className="flex items-start justify-between gap-2">
            <span className={ccStatusPill(statusPillClass(application.status))}>
              {statusBadgeLabel(application)}
            </span>
            <span className="shrink-0 text-[10px] font-medium text-slate-400">
              {formatRelativeDate(application.dateSaved)}
            </span>
          </div>

          <h2 className="mt-3 text-[17px] font-bold leading-snug tracking-tight text-slate-900">
            {application.title || "Untitled role"}
          </h2>
          <p className="mt-1 text-[14px] font-semibold text-indigo-700">{application.company || "Unknown company"}</p>

          {application.source ? (
            <p className="mt-2 text-[10px] font-medium text-slate-500">{application.source}</p>
          ) : null}

          {!isPreparing ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className={ccMetaChip(letterChipClass(application))}>{coverLetterStatus(application)}</span>
              {resumeLabel ? (
                <span className={ccMetaChip(resumeVariantChipClass())}>{resumeLabel}</span>
              ) : null}
              {fit ? (
                <span className={ccMetaChip(fitScoreChipClass(fitTone))}>{fit} fit</span>
              ) : (
                <span className={ccMetaChip(fitScoreChipClass("muted"))}>Fit —</span>
              )}
            </div>
          ) : null}
        </div>
      )}

      {isPreparing ? (
        <PreparationProgress
          steps={application.preparationSteps}
          error={application.preparationError}
          className="rounded-2xl border border-indigo-200/60 bg-indigo-50/50 p-3.5"
        />
      ) : null}

      <div className="mt-auto flex flex-col gap-2">
        {!isPreparing ? (
          <button type="button" className={cn(ccBtnPrimary, "w-full py-2.5")} onClick={onViewMaterials}>
            {primaryCtaLabel}
          </button>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={ccBtnSecondarySm} onClick={onOpenJob}>
            Open Job
          </button>
          {showMarkApplied && !isPreparing ? (
            <button type="button" className={ccBtnSecondarySm} disabled={markAppliedBusy} onClick={onMarkApplied}>
              {markAppliedBusy ? "Updating…" : "Mark Applied"}
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
