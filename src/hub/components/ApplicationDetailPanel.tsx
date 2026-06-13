import { useState } from "react";
import type { JobApplication } from "../../lib/types";
import { formatRelativeDate } from "../../lib/jobSource";
import {
  detailHeroStatusLabel,
  getPreparedAssetItems,
} from "../applicationDisplay";
import { PreparedAssets } from "./PreparedAssets";
import { PreparationProgress } from "../../sidepanel/components/PreparationProgress";
import { cn } from "../../lib/classNames";
import {
  ccAboutRoleSurface,
  ccBtnGhost,
  ccBtnPrimary,
  ccBtnSecondarySm,
  ccDetailPrimaryCta,
  ccDetailStatusPillApplied,
  ccDetailStatusPillPreparing,
  ccDetailStatusPillReady,
  ccDetailTransitionLine,
  ccMetadataLabel,
  ccOpportunityCompany,
  ccOpportunitySource,
  ccOpportunityTitle,
} from "../../ui/ccUi";

type Props = {
  application: JobApplication;
  onBack: () => void;
  onOpenJob: () => void;
  onViewMaterials: () => void;
  onMarkApplied: () => void;
  markAppliedBusy?: boolean;
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
  markAppliedBusy,
}: Props) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const isPreparing = application.status === "PREPARING";
  const isReady = application.status === "READY_TO_APPLY";
  const preparedItems = getPreparedAssetItems(application);
  const showMarkApplied =
    application.status !== "APPLIED" && application.status !== "INTERVIEWING" && application.status !== "OFFER";
  const primaryCtaLabel = isReady ? "Continue Application" : "View Materials";
  const description = application.jobDescription?.trim() ?? "";
  const descriptionLong = description.length > 220;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 px-4 py-4">
      <button type="button" className={cn(ccBtnGhost, "self-start px-0")} onClick={onBack}>
        ← Back to Application Hub
      </button>

      <div className="flex min-h-0 flex-1 flex-col gap-5">
        <div className="space-y-3">
          <span className={detailStatusPillClass(application)}>
            {detailHeroStatusLabel(application)}
          </span>

          <div>
            <h2 className={ccOpportunityTitle}>{application.title || "Untitled role"}</h2>
            <p className={ccOpportunityCompany}>{application.company || "Unknown company"}</p>
            {application.source ? (
              <p className={ccOpportunitySource}>{application.source}</p>
            ) : null}
          </div>

          {isReady && preparedItems.length > 0 ? (
            <>
              <p className={ccDetailTransitionLine}>Prepared by CoverClick</p>
              <PreparedAssets application={application} />
            </>
          ) : null}

          {isPreparing ? (
            <PreparationProgress
              steps={application.preparationSteps}
              error={application.preparationError}
              className="rounded-2xl border border-indigo-200/60 bg-indigo-50/40 p-3.5"
            />
          ) : null}

          {!isReady && !isPreparing && preparedItems.length > 0 ? (
            <PreparedAssets application={application} />
          ) : null}
        </div>

        <div className="mt-auto space-y-2.5">
          {!isPreparing ? (
            <button
              type="button"
              className={isReady ? ccDetailPrimaryCta : cn(ccBtnPrimary, "w-full rounded-xl py-3")}
              onClick={onViewMaterials}
            >
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

        {description ? (
          <section className={ccAboutRoleSurface}>
            <p className={ccMetadataLabel}>About this role</p>
            <p
              className={cn(
                "mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600",
                !descriptionExpanded && "line-clamp-4",
              )}
            >
              {description}
            </p>
            {descriptionLong ? (
              <button
                type="button"
                className="mt-2 text-[12px] font-medium text-indigo-600 hover:text-indigo-800"
                onClick={() => setDescriptionExpanded((v) => !v)}
              >
                {descriptionExpanded ? "Show less" : "View details"}
              </button>
            ) : null}
            <p className="mt-2 text-[10px] text-slate-400">
              Saved {formatRelativeDate(application.dateSaved).toLowerCase()}
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
