import { useState } from "react";
import type { JobApplication } from "../../lib/types";
import { formatRelativeDate } from "../../lib/jobSource";
import {
  detailHeroResumeLine,
  detailHeroStatusLabel,
  getPreparedAssetItems,
} from "../applicationDisplay";
import { PreparedAssets } from "./PreparedAssets";
import { PreparationProgress } from "../../sidepanel/components/PreparationProgress";
import { FitScoreRing } from "../../ui/FitScoreRing";
import { cn } from "../../lib/classNames";
import {
  ccAboutRoleSurface,
  ccBtnGhost,
  ccBtnSecondarySm,
  ccCtaArrow,
  ccDetailHeroResume,
  ccDetailPrimaryCta,
  ccDetailStatusPillApplied,
  ccDetailStatusPillPreparing,
  ccDetailStatusPillReady,
  ccDetailTransitionLine,
  ccMetadataLabel,
  ccMetadataRow,
  ccOpportunityCompany,
  ccOpportunitySource,
  ccOpportunityTitle,
  ccPreparedAssetsSectionTitle,
} from "../../ui/ccUi";

type Props = {
  application: JobApplication;
  onBack: () => void;
  onOpenJob: () => void;
  onViewMaterials: () => void;
  onMarkApplied: () => void;
  onRemove?: () => void;
  markAppliedBusy?: boolean;
  removeBusy?: boolean;
};

function detailStatusPillClass(application: JobApplication): string {
  switch (application.status) {
    case "READY_TO_APPLY":
      return ccDetailStatusPillReady;
    case "PREPARING":
    case "SAVED":
      return ccDetailStatusPillPreparing;
    default:
      return ccDetailStatusPillApplied;
  }
}

export function ApplicationDetailPanel({
  application,
  onBack,
  onOpenJob,
  onViewMaterials,
  onMarkApplied,
  onRemove,
  markAppliedBusy,
  removeBusy,
}: Props) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const isPreparing = application.status === "PREPARING";
  const isReady = application.status === "READY_TO_APPLY";
  const preparedItems = getPreparedAssetItems(application);
  const resumeLine = detailHeroResumeLine(application);
  const showMarkApplied =
    application.status !== "APPLIED" && application.status !== "INTERVIEWING" && application.status !== "OFFER";
  const primaryCtaLabel = isReady ? "Continue Application" : "View Materials";
  const description = application.jobDescription?.trim() ?? "";
  const descriptionLong = description.length > 220;

  const metadataParts: string[] = [];
  if (application.location?.trim()) metadataParts.push(application.location.trim());
  if (application.source?.trim()) metadataParts.push(application.source.trim());
  const savedRelative = formatRelativeDate(application.dateSaved);
  if (savedRelative) metadataParts.push(`Saved ${savedRelative.toLowerCase()}`);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
      <button type="button" className={cn(ccBtnGhost, "self-start px-0")} onClick={onBack}>
        ← Back to Hub
      </button>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <span className={detailStatusPillClass(application)}>
              {detailHeroStatusLabel(application)}
            </span>

            <div>
              <h2 className={ccOpportunityTitle}>{application.title || "Untitled role"}</h2>
              <p className={ccOpportunityCompany}>{application.company || "Unknown company"}</p>
              {metadataParts.length > 0 ? (
                <p className={cn(ccMetadataRow, "mt-1.5")}>
                  {metadataParts.map((part, i) => (
                    <span key={part}>
                      {i > 0 ? <span className="text-slate-300"> · </span> : null}
                      {part}
                    </span>
                  ))}
                </p>
              ) : null}
              {resumeLine ? <p className={cn(ccDetailHeroResume, "mt-1")}>{resumeLine}</p> : null}
              {isReady && preparedItems.length > 0 ? (
                <p className={cn(ccDetailTransitionLine, "mt-2")}>Prepared by CoverClick</p>
              ) : null}
              {application.source && !isReady ? (
                <p className={cn(ccOpportunitySource, "mt-1")}>{application.source}</p>
              ) : null}
            </div>
          </div>

          {application.fitScore != null ? (
            <FitScoreRing score={application.fitScore} size="md" className="shrink-0" />
          ) : null}
        </div>

        {isReady && preparedItems.length > 0 ? (
          <section className="space-y-2">
            <p className={ccPreparedAssetsSectionTitle}>Prepared Assets</p>
            <PreparedAssets application={application} />
          </section>
        ) : null}

        {isPreparing ? (
          <PreparationProgress
            steps={application.preparationSteps}
            error={application.preparationError}
            className="rounded-xl border border-indigo-200/50 bg-indigo-50/30 p-3"
          />
        ) : null}

        {!isReady && !isPreparing && preparedItems.length > 0 ? (
          <section className="space-y-2">
            <p className={ccPreparedAssetsSectionTitle}>Prepared Assets</p>
            <PreparedAssets application={application} />
          </section>
        ) : null}

        <div className="space-y-2">
          {!isPreparing ? (
            <button type="button" className={ccDetailPrimaryCta} onClick={onViewMaterials}>
              <div className="text-left">
                <span className="text-[14px] font-semibold">{primaryCtaLabel}</span>
                {isReady ? (
                  <span className="mt-0.5 block text-[11px] font-normal text-indigo-100/90">
                    Review, edit, and submit your application
                  </span>
                ) : null}
              </div>
              <span className={ccCtaArrow} aria-hidden>
                →
              </span>
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

        {description ? (
          <section className={ccAboutRoleSurface}>
            <p className={ccMetadataLabel}>About this role</p>
            <p
              className={cn(
                "mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600",
                !descriptionExpanded && "line-clamp-3",
              )}
            >
              {description}
            </p>
            {descriptionLong ? (
              <button
                type="button"
                className="mt-2 text-[12px] font-medium text-[#5B4CF0] hover:text-[#4f46e5]"
                onClick={() => setDescriptionExpanded((v) => !v)}
              >
                {descriptionExpanded ? "Show less" : "View full details →"}
              </button>
            ) : null}
            <p className="mt-2 text-[10px] text-slate-400">
              Saved {formatRelativeDate(application.dateSaved).toLowerCase()}
            </p>
          </section>
        ) : null}

        {onRemove ? (
          <div className="mt-auto border-t border-slate-100 pt-3">
            {!confirmRemove ? (
              <button
                type="button"
                className="text-[12px] font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                disabled={removeBusy}
                onClick={() => setConfirmRemove(true)}
              >
                Remove from Hub
              </button>
            ) : (
              <div className="rounded-lg border border-red-200/80 bg-red-50/70 px-3 py-2.5">
                <p className="text-[12px] font-medium text-red-900">
                  Remove this job from your Application Hub? This cannot be undone.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className={cn(ccBtnSecondarySm, "border-red-200 text-red-700 hover:bg-red-100")}
                    disabled={removeBusy}
                    onClick={() => void onRemove()}
                  >
                    {removeBusy ? "Removing…" : "Yes, remove"}
                  </button>
                  <button
                    type="button"
                    className={ccBtnSecondarySm}
                    disabled={removeBusy}
                    onClick={() => setConfirmRemove(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
