import { useState } from "react";
import type { JobApplication, JobContext } from "../../lib/types";
import type { ResumeVariant } from "../../lib/resumeLibrary";
import { currentJobSavedInlineMessage } from "../../hub/applicationDisplay";
import { jobSourceFromUrl } from "../../lib/jobSource";
import { cn } from "../../lib/classNames";
import {
  ccAboutRoleSurface,
  ccBtnApply,
  ccBtnDecisionSecondary,
  ccFocusRing,
  ccHeroTitle,
  ccMetadataLabel,
  ccMuted,
  ccOpportunityCompany,
  ccTertiaryText,
} from "../../ui/ccUi";
import { ResumeVariantSelector } from "./ResumeVariantSelector";

type DetectionState = "scanning" | "detected" | "empty" | "error";

function detectionState(scrapeBusy: boolean, scrapeError: string | null, job: JobContext | null): DetectionState {
  if (scrapeBusy) return "scanning";
  if (scrapeError) return "error";
  if (job?.pageUrl && (job.jobTitle?.trim() || job.descriptionText?.trim())) return "detected";
  return "empty";
}

const detectionDotClass: Record<DetectionState, string> = {
  scanning: "bg-amber-400",
  detected: "bg-[#34D399]",
  empty: "bg-slate-300",
  error: "bg-red-500",
};

const detectionLabel: Record<DetectionState, string> = {
  scanning: "Scanning active tab…",
  detected: "Job detected",
  empty: "No job posting detected",
  error: "Could not read this tab",
};

type Props = {
  job: JobContext | null;
  scrapeBusy: boolean;
  scrapeError: string | null;
  saveBusy: boolean;
  resumeVariants: ResumeVariant[];
  activeResumeVariantId: string;
  onSelectResumeVariant: (id: string) => void;
  onRescan: () => void;
  onApplyNow: () => void;
  onSaveForLater: () => void;
  currentTabSaved?: JobApplication | null;
  preparingInBackground?: boolean;
};

export function CurrentJobSection({
  job,
  scrapeBusy,
  scrapeError,
  saveBusy,
  resumeVariants,
  activeResumeVariantId,
  onSelectResumeVariant,
  onRescan,
  onApplyNow,
  onSaveForLater,
  currentTabSaved,
  preparingInBackground,
}: Props) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const source = job?.pageUrl ? jobSourceFromUrl(job.pageUrl) : "";
  const detection = detectionState(scrapeBusy, scrapeError, job);
  const hasResume = resumeVariants.length > 0;
  const canAct = Boolean(job?.pageUrl) && !scrapeBusy && hasResume;
  const hasDescription = Boolean(job?.descriptionText?.trim());
  const descriptionLong = (job?.descriptionText?.trim().length ?? 0) > 180;

  return (
    <div className="space-y-5">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 text-[12px] text-slate-500">
          <span className="inline-flex min-w-0 items-center gap-2">
            {detection === "scanning" ? (
              <span className="cc-spinner h-2 w-2 border-[1.5px] border-slate-300 border-t-slate-500" aria-hidden />
            ) : (
              <span className={cn("h-2 w-2 shrink-0 rounded-full", detectionDotClass[detection])} aria-hidden />
            )}
            <span className="truncate">
              {detectionLabel[detection]}
              {source && detection === "detected" ? (
                <span className="text-slate-400"> · {source}</span>
              ) : null}
            </span>
          </span>
          <button
            type="button"
            className={cn("shrink-0 font-medium text-slate-500 hover:text-slate-800", ccFocusRing)}
            disabled={scrapeBusy}
            onClick={onRescan}
          >
            {scrapeBusy ? "Scanning…" : "Re-scan"}
          </button>
        </div>

        <div>
          <h1 className={ccHeroTitle}>
            {scrapeBusy ? "Reading posting…" : job?.jobTitle?.trim() || "Open a job posting"}
          </h1>
          {job?.companyName?.trim() ? (
            <p className={cn(ccOpportunityCompany, "mt-1")}>{job.companyName}</p>
          ) : detection === "empty" && !scrapeBusy ? (
            <p className="mt-1 text-[14px] text-slate-500">Navigate to a role, then re-scan</p>
          ) : null}
          {source ? <p className={cn(ccTertiaryText, "mt-0.5")}>{source}</p> : null}
        </div>

        {scrapeError ? (
          <p className="text-[12px] font-medium text-red-700">{scrapeError}</p>
        ) : null}

        <ResumeVariantSelector
          variant="compact"
          variants={resumeVariants}
          activeId={activeResumeVariantId}
          onSelect={onSelectResumeVariant}
        />

        <div className="space-y-2.5">
          <button type="button" className={cn(ccBtnApply, "w-full")} disabled={!canAct} onClick={onApplyNow}>
            <span className="block text-[15px] font-semibold">Apply now</span>
            <span className="mt-0.5 block text-[11px] font-normal text-indigo-100/90">
              Generate your cover letter, review, and download
            </span>
          </button>
          <button
            type="button"
            className={cn(ccBtnDecisionSecondary, "disabled:opacity-45")}
            disabled={!canAct || saveBusy}
            onClick={onSaveForLater}
          >
            <span className="block text-[13px] font-semibold">
              {saveBusy ? "Saving…" : "Save for later"}
            </span>
            <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
              Save to Application Hub and prepare in the background
            </span>
          </button>
        </div>

        {currentTabSaved ? (
          <p className="flex items-center gap-2 text-[12px] text-slate-500">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#34D399]" aria-hidden />
            {currentJobSavedInlineMessage(currentTabSaved, Boolean(preparingInBackground))}
          </p>
        ) : null}

        {!hasResume && !scrapeBusy ? (
          <p className="text-center text-[11px] text-slate-500">
            Add a resume in Profile to apply or save this job.
          </p>
        ) : null}
      </section>

      {hasDescription ? (
        <section className={ccAboutRoleSurface}>
          <p className={ccMetadataLabel}>About this role</p>
          <div className="relative mt-2">
            <p
              className={cn(
                "whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600",
                !descriptionExpanded && "line-clamp-3",
              )}
            >
              {job!.descriptionText!.trim()}
            </p>
            {!descriptionExpanded && descriptionLong ? (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent"
                aria-hidden
              />
            ) : null}
          </div>
          {descriptionLong ? (
            <button
              type="button"
              className={cn("mt-2 text-[12px] font-medium text-indigo-600 hover:text-indigo-800", ccFocusRing)}
              onClick={() => setDescriptionExpanded((v) => !v)}
            >
              {descriptionExpanded ? "Show less" : "View details"}
            </button>
          ) : null}
        </section>
      ) : null}

      {!hasDescription && !scrapeBusy && detection === "empty" ? (
        <p className={cn(ccMuted, "text-[12px]")}>
          We will pull title, company, and description from the page you have open.
        </p>
      ) : null}
    </div>
  );
}
