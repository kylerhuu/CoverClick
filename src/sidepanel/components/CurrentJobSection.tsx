import { useState } from "react";
import type { JobApplication, JobContext } from "../../lib/types";
import type { ResumeVariant } from "../../lib/resumeLibrary";
import { currentJobSavedInlineMessage } from "../../hub/applicationDisplay";
import { formatRelativeDate, jobSourceFromUrl } from "../../lib/jobSource";
import { freeGenerationsLabel } from "../../lib/planMessaging";
import { FitScoreRing } from "../../ui/FitScoreRing";
import { cn } from "../../lib/classNames";
import {
  ccAboutRoleSurface,
  ccBtnDecisionSecondary,
  ccCtaArrow,
  ccFocusRing,
  ccInfoBanner,
  ccMetadataLabel,
  ccMetadataRow,
  ccMetadataValue,
  ccMuted,
  ccOpportunityCompany,
  ccOpportunityTitle,
  ccPrimaryCtaLg,
  ccResumeRowSurface,
  ccTextLink,
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
  detected: "bg-[#22C55E]",
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
  profileReady?: boolean;
  saveLocked?: boolean;
  onSaveLockedClick?: () => void;
  scanFitScore?: number | null;
  fitScoreBusy?: boolean;
  freeGenerationsRemaining?: number | null;
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
  profileReady = true,
  saveLocked = false,
  onSaveLockedClick,
  scanFitScore = null,
  fitScoreBusy = false,
  freeGenerationsRemaining = null,
}: Props) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const source = job?.pageUrl ? jobSourceFromUrl(job.pageUrl) : "";
  const detection = detectionState(scrapeBusy, scrapeError, job);
  const hasResume = resumeVariants.length > 0;
  const canAct = Boolean(job?.pageUrl) && !scrapeBusy && hasResume && profileReady;
  const hasDescription = Boolean(job?.descriptionText?.trim());
  const descriptionLong = (job?.descriptionText?.trim().length ?? 0) > 180;
  const activeResume = resumeVariants.find((v) => v.id === activeResumeVariantId) ?? resumeVariants[0];
  const fitScore = currentTabSaved?.fitScore ?? scanFitScore ?? null;

  const metadataParts: string[] = [];
  const location = currentTabSaved?.location?.trim();
  if (location) metadataParts.push(location);
  if (source) metadataParts.push(source);
  if (job?.scrapedAt) {
    const detected = formatRelativeDate(new Date(job.scrapedAt).toISOString());
    if (detected) metadataParts.push(`Posted ${detected.toLowerCase()}`);
  }

  return (
    <div className="space-y-3" data-onboarding-target="apply-workflow">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-[12px] text-slate-500">
          <span className="inline-flex min-w-0 items-center gap-2">
            {detection === "scanning" ? (
              <span className="cc-spinner h-2 w-2 border-[1.5px] border-slate-300 border-t-slate-500" aria-hidden />
            ) : (
              <span className={cn("h-2 w-2 shrink-0 rounded-full", detectionDotClass[detection])} aria-hidden />
            )}
            <span className="truncate">{detectionLabel[detection]}</span>
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

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className={ccOpportunityTitle}>
              {scrapeBusy ? "Reading posting…" : job?.jobTitle?.trim() || "Open a job posting"}
            </h1>
            {job?.companyName?.trim() ? (
              <p className={cn(ccOpportunityCompany, "mt-1")}>{job.companyName}</p>
            ) : detection === "empty" && !scrapeBusy ? (
              <p className="mt-1 text-[14px] text-slate-500">Navigate to a role, then re-scan</p>
            ) : null}
            {metadataParts.length > 0 ? (
              <p className={cn(ccMetadataRow, "mt-1.5")}>
                {metadataParts.map((part, i) => (
                  <span key={part}>
                    {i > 0 ? <span className="text-slate-300"> · </span> : null}
                    {part}
                  </span>
                ))}
              </p>
            ) : source ? (
              <p className={cn(ccTertiaryText, "mt-1")}>{source}</p>
            ) : null}
          </div>

          {fitScore != null ? <FitScoreRing score={fitScore} size="md" className="shrink-0" /> : null}
          {fitScoreBusy && fitScore == null ? (
            <span className="cc-spinner h-8 w-8 shrink-0 border-2 border-slate-200 border-t-[#5B4CF0]" aria-label="Calculating fit score" />
          ) : null}
        </div>

        {scrapeError ? (
          <p className="text-[12px] font-medium text-red-700">{scrapeError}</p>
        ) : null}

        {detection === "detected" ? (
          <div className={ccInfoBanner}>
            CoverClick can prepare your application materials. We&apos;ll generate a tailored cover letter and review
            your fit.
          </div>
        ) : null}

        {hasResume ? (
          <div className={ccResumeRowSurface}>
            <div className="min-w-0">
              <p className={ccMetadataLabel}>Resume</p>
              <p className={cn(ccMetadataValue, "mt-0.5 truncate")}>{activeResume?.name ?? "General"}</p>
            </div>
            {resumeVariants.length > 1 ? (
              <div className="relative shrink-0">
                <span className="text-[12px] font-semibold text-[#5B4CF0]">Change</span>
                <select
                  className="absolute inset-0 cursor-pointer opacity-0"
                  value={activeResume?.id ?? ""}
                  onChange={(e) => onSelectResumeVariant(e.target.value)}
                  aria-label="Change resume version"
                >
                  {resumeVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        ) : (
          <ResumeVariantSelector
            variant="compact"
            variants={resumeVariants}
            activeId={activeResumeVariantId}
            onSelect={onSelectResumeVariant}
          />
        )}

        <div className="space-y-2">
          {!profileReady ? (
            <p className="text-[11px] leading-snug text-amber-800">
              Complete your profile setup above before generating a cover letter.
            </p>
          ) : null}
          {freeGenerationsRemaining != null && freeGenerationsRemaining > 0 ? (
            <p className="text-[11px] font-medium text-slate-500">{freeGenerationsLabel(freeGenerationsRemaining)}</p>
          ) : null}
          <button type="button" className={ccPrimaryCtaLg} disabled={!canAct} onClick={onApplyNow}>
            <div className="text-left">
              <span className="text-[14px] font-semibold">Apply Now</span>
              <span className="mt-0.5 block text-[11px] font-normal text-indigo-100/90">
                Generate your cover letter, review, and download
              </span>
            </div>
            <span className={ccCtaArrow} aria-hidden>
              →
            </span>
          </button>
          <button
            type="button"
            className={cn(ccBtnDecisionSecondary, "disabled:opacity-45")}
            disabled={(!canAct && !saveLocked) || saveBusy}
            onClick={() => {
              if (saveLocked) {
                onSaveLockedClick?.();
                return;
              }
              onSaveForLater();
            }}
          >
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
              {saveLocked ? <span aria-hidden>🔒</span> : null}
              {saveBusy ? "Saving…" : "Save for Later"}
            </span>
            <span className="mt-0.5 text-[11px] font-medium text-slate-500">
              Save to Application Hub and prepare in the background
            </span>
          </button>
        </div>

        {currentTabSaved ? (
          <p className="flex items-center gap-2 text-[12px] text-slate-500">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22C55E]" aria-hidden />
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
              className={cn(ccTextLink, "mt-2 text-[#5B4CF0] hover:text-[#4f46e5]")}
              onClick={() => setDescriptionExpanded((v) => !v)}
            >
              {descriptionExpanded ? "Show less" : "View full details →"}
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
