import type { JobApplication, JobContext } from "../../lib/types";
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
import { ProfileInsightStrip } from "./ProfileInsightStrip";

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
  onRescan: () => void;
  onSave: () => void;
  onGenerateLetter: () => void;
  onTailorResume: () => void;
  alreadySaved?: boolean;
  currentTabSaved?: JobApplication | null;
  preparingInBackground?: boolean;
  onOpenHub?: () => void;
};

export function CurrentJobSection({
  job,
  scrapeBusy,
  scrapeError,
  saveBusy,
  onRescan,
  onSave,
  onGenerateLetter,
  onTailorResume,
  alreadySaved,
  currentTabSaved,
  preparingInBackground,
  onOpenHub,
}: Props) {
  const source = job?.pageUrl ? jobSourceFromUrl(job.pageUrl) : "";
  const detection = detectionState(scrapeBusy, scrapeError, job);
  const canGenerate = Boolean(job?.pageUrl) && !scrapeBusy;

  return (
    <div className="space-y-3">
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

        <div className={cn("border-b px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em]", detectionBarClass[detection])}>
          <span className="inline-flex items-center gap-1.5">
            {detection === "scanning" ? (
              <span className="cc-spinner h-3 w-3 border-[1.5px]" aria-hidden />
            ) : (
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  detection === "detected" ? "bg-emerald-500" : detection === "error" ? "bg-red-500" : "bg-slate-400",
                )}
                aria-hidden
              />
            )}
            {detectionLabel[detection]}
            {source && detection === "detected" ? (
              <span className="normal-case tracking-normal opacity-75">· {source}</span>
            ) : null}
          </span>
        </div>

        <div className="space-y-3 p-3.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Current tab</p>
            <h2 className="mt-1.5 text-[18px] font-bold leading-snug tracking-tight text-slate-900">
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
            <div className="max-h-[130px] overflow-y-auto rounded-xl border border-slate-200/55 bg-white/70 p-3 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]">
              <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
                {job.descriptionText.trim().slice(0, 600)}
                {job.descriptionText.length > 600 ? "…" : ""}
              </p>
            </div>
          ) : !scrapeBusy && detection === "empty" ? (
            <p className={cn(ccMuted, "text-[12px]")}>We will pull title, company, and description from the page you have open.</p>
          ) : null}

          <ProfileInsightStrip />

          {alreadySaved && currentTabSaved ? (
            <div
              className={cn(
                "rounded-xl border px-3 py-2.5 text-[11px] font-medium leading-snug",
                currentJobSavedBannerClass(currentTabSaved),
              )}
            >
              {currentJobSavedBannerMessage(currentTabSaved, Boolean(preparingInBackground))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Quick actions</p>
        <button
          type="button"
          className={cn(ccBtnPrimary, "w-full py-2.5 text-[13px]")}
          disabled={!canGenerate}
          onClick={onGenerateLetter}
        >
          Generate Cover Letter
        </button>
        <button
          type="button"
          className={cn(ccBtnSecondary, "w-full py-2.5 text-[13px]")}
          disabled={!canGenerate}
          onClick={onTailorResume}
        >
          Tailor Resume
        </button>
        <button
          type="button"
          className={cn(ccBtnSecondary, "w-full py-2 text-[12px]")}
          disabled={!job?.pageUrl || saveBusy || scrapeBusy}
          onClick={onSave}
        >
          {saveBusy ? "Saving…" : alreadySaved ? "Save again & re-prepare" : "Save to Hub"}
        </button>
        <p className="px-0.5 text-center text-[10px] leading-snug text-slate-500">
          Generate without saving, or save to track and auto-prepare in the background.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 pt-2">
        {onOpenHub ? (
          <button type="button" className={cn(ccBtnGhost, "flex-1 text-[11px]")} onClick={onOpenHub}>
            Application Hub
          </button>
        ) : null}
        <button
          type="button"
          className={cn(ccBtnGhost, "flex-1 text-[11px]")}
          disabled={scrapeBusy}
          onClick={onRescan}
        >
          Re-scan tab
        </button>
      </div>
    </div>
  );
}
