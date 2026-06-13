import { useState } from "react";
import type { JobApplication } from "../../lib/types";
import { formatRelativeDate } from "../../lib/jobSource";
import {
  detailHeroFitLine,
  detailHeroResumeLine,
  detailHeroStatusLabel,
  getPreparedAssetItems,
} from "../applicationDisplay";
import { PreparedAssets } from "./PreparedAssets";
import { PreparationProgress } from "../../sidepanel/components/PreparationProgress";
import { cn } from "../../lib/classNames";
import {
  ccAboutRoleSurface,
  ccBtnGhost,
  ccBtnSecondarySm,
  ccDetailHeroFit,
  ccDetailHeroResume,
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
  const fitLine = detailHeroFitLine(application);
  const resumeLine = detailHeroResumeLine(application);
  const showMarkApplied =
    application.status !== "APPLIED" && application.status !== "INTERVIEWING" && application.status !== "OFFER";
  const primaryCtaLabel = isReady ? "Continue Application" : "View Materials";
  const description = application.jobDescription?.trim() ?? "";
  const descriptionLong = description.length > 220;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
      <button type="button" className={cn(ccBtnGhost, "self-start px-0")} onClick={onBack}>
        ← Back to Application Hub
      </button>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="space-y-2">
          <span className={detailStatusPillClass(application)}>
            {detailHeroStatusLabel(application)}
          </span>

          <div>
            <h2 className={ccOpportunityTitle}>{application.title || "Untitled role"}</h2>
            <p className={ccOpportunityCompany}>{application.company || "Unknown company"}</p>
            {fitLine ? <p className={cn(ccDetailHeroFit, "mt-1.5")}>{fitLine}</p> : null}
            {resumeLine ? <p className={cn(ccDetailHeroResume, "mt-0.5")}>{resumeLine}</p> : null}
            {application.source && !isReady ? (
              <p className={cn(ccOpportunitySource, "mt-1")}>{application.source}</p>
            ) : null}
            {isReady && preparedItems.length > 0 ? (
              <p className={cn(ccDetailTransitionLine, "mt-2")}>Prepared by CoverClick</p>
            ) : null}
          </div>

          {isReady && preparedItems.length > 0 ? (
            <PreparedAssets application={application} />
          ) : null}

          {isPreparing ? (
            <PreparationProgress
              steps={application.preparationSteps}
              error={application.preparationError}
              className="rounded-xl border border-indigo-200/50 bg-indigo-50/30 p-3"
            />
          ) : null}

          {!isReady && !isPreparing && preparedItems.length > 0 ? (
            <PreparedAssets application={application} />
          ) : null}
        </div>

        <div className="space-y-2">
          {!isPreparing ? (
            <button type="button" className={ccDetailPrimaryCta} onClick={onViewMaterials}>
              <span className="text-[14px] font-semibold">{primaryCtaLabel}</span>
              {isReady ? (
                <span className="mt-0.5 text-[11px] font-normal text-indigo-100/90">
                  Review, edit, and submit your application
                </span>
              ) : null}
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
