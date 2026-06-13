import type { JobApplication, JobContext } from "../../lib/types";
import type { ResumeVariant } from "../../lib/resumeLibrary";
import { currentJobSavedBannerClass, currentJobSavedBannerMessage } from "../../hub/applicationDisplay";
import { jobSourceFromUrl } from "../../lib/jobSource";
import { cn } from "../../lib/classNames";
import {
  ccBtnGhost,
  ccBtnPrimary,
  ccBtnSecondary,
  ccMetaChip,
  ccMuted,
} from "../../ui/ccUi";
import { ResumeVariantSelector } from "./ResumeVariantSelector";

type DetectionState = "scanning" | "detected" | "empty" | "error";

function detectionState(scrapeBusy: boolean, scrapeError: string | null, job: JobContext | null): DetectionState {
  if (scrapeBusy) return "scanning";
  if (scrapeError) return "error";
  if (job?.pageUrl && (job.jobTitle?.trim() || job.descriptionText?.trim())) return "detected";
  return "empty";
}

const detectionBarClass: Record<DetectionState, string> = {
  scanning: "border-amber-300/80 bg-amber-50/90 text-amber-900",
  detected: "border-emerald-300/70 bg-emerald-50/80 text-emerald-900",
  empty: "border-slate-200/80 bg-slate-50/90 text-slate-600",
  error: "border-red-200/90 bg-red-50/90 text-red-900",
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
  const source = job?.pageUrl ? jobSourceFromUrl(job.pageUrl) : "";
  const detection = detectionState(scrapeBusy, scrapeError, job);
  const hasResume = resumeVariants.length > 0;
  const canAct = Boolean(job?.pageUrl) && !scrapeBusy && hasResume;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-indigo-200/55 shadow-[0_4px_22px_rgba(79,70,229,0.09)]",
          "bg-gradient-to-br from-white via-indigo-50/25 to-sky-50/35 ring-1 ring-slate-200/45",
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500/80 via-sky-400/70 to-indigo-500/80"
          aria-hidden
        />

        <div
          className={cn(
            "flex items-center justify-between gap-2 border-b px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em]",
            detectionBarClass[detection],
          )}
        >
          <span className="inline-flex min-w-0 items-center gap-1.5">
            {detection === "scanning" ? (
              <span className="cc-spinner h-3 w-3 border-[1.5px]" aria-hidden />
            ) : (
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  detection === "detected" ? "bg-emerald-500" : detection === "error" ? "bg-red-500" : "bg-slate-400",
                )}
                aria-hidden
              />
            )}
            <span className="truncate">{detectionLabel[detection]}</span>
            {source && detection === "detected" ? (
              <span className="hidden truncate normal-case tracking-normal opacity-75 sm:inline">· {source}</span>
            ) : null}
          </span>
          <button
            type="button"
            className={cn(
              ccBtnGhost,
              "shrink-0 px-1.5 py-0.5 text-[10px] normal-case tracking-normal opacity-80 hover:opacity-100",
            )}
            disabled={scrapeBusy}
            onClick={onRescan}
          >
            {scrapeBusy ? "Scanning…" : "Re-scan"}
          </button>
        </div>

        <div className="space-y-3 p-3.5">
          <div>
            <h2 className="text-[18px] font-bold leading-snug tracking-tight text-slate-900">
              {scrapeBusy ? "Reading posting…" : job?.jobTitle?.trim() || "Open a job posting"}
            </h2>
            {job?.companyName?.trim() ? (
              <p className="mt-1 text-[14px] font-semibold text-indigo-700">{job.companyName}</p>
            ) : detection === "empty" && !scrapeBusy ? (
              <p className="mt-1 text-[13px] font-medium text-slate-500">Navigate to a role, then re-scan</p>
            ) : null}
            {source && detection !== "detected" ? (
              <span className={cn(ccMetaChip("mt-2 bg-indigo-50/80 text-indigo-600 ring-indigo-200/50"))}>{source}</span>
            ) : null}
          </div>

          {scrapeError ? (
            <p className="rounded-xl border border-red-200 bg-red-50/90 px-3 py-2.5 text-[11px] font-medium text-red-900">
              {scrapeError}
            </p>
          ) : null}

          {job?.descriptionText?.trim() ? (
            <div className="max-h-[120px] overflow-y-auto rounded-xl border border-slate-200/55 bg-white/70 p-3 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]">
              <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
                {job.descriptionText.trim().slice(0, 600)}
                {job.descriptionText.length > 600 ? "…" : ""}
              </p>
            </div>
          ) : !scrapeBusy && detection === "empty" ? (
            <p className={cn(ccMuted, "text-[12px]")}>We will pull title, company, and description from the page you have open.</p>
          ) : null}

          {currentTabSaved ? (
            <div
              className={cn(
                "rounded-xl border px-3 py-2 text-[11px] font-medium leading-snug",
                currentJobSavedBannerClass(currentTabSaved),
              )}
            >
              {currentJobSavedBannerMessage(currentTabSaved, Boolean(preparingInBackground))}
            </div>
          ) : null}
        </div>
      </div>

      <ResumeVariantSelector
        variant="compact"
        variants={resumeVariants}
        activeId={activeResumeVariantId}
        onSelect={onSelectResumeVariant}
      />

      <div className="space-y-2">
        <button
          type="button"
          className={cn(ccBtnPrimary, "w-full py-3 text-[13px]")}
          disabled={!canAct}
          onClick={onApplyNow}
        >
          Apply now
        </button>
        <button
          type="button"
          className={cn(ccBtnSecondary, "w-full py-2.5 text-[12px]")}
          disabled={!canAct || saveBusy}
          onClick={onSaveForLater}
        >
          {saveBusy ? "Saving…" : "Save for later"}
        </button>
        {!hasResume && !scrapeBusy ? (
          <p className="text-center text-[10px] leading-snug text-slate-500">
            Add a resume in Profile to apply or save this job.
          </p>
        ) : null}
      </div>
    </div>
  );
}
