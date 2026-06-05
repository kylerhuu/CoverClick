import type { JobApplication, JobContext } from "../../lib/types";
import { currentJobSavedBannerClass, currentJobSavedBannerMessage } from "../../hub/applicationDisplay";
import { jobSourceFromUrl } from "../../lib/jobSource";
import { cn } from "../../lib/classNames";
import { ccBtnGhost, ccBtnPrimary, ccHeroCard, ccMetaChip, ccMuted } from "../../ui/ccUi";

type Props = {
  job: JobContext | null;
  scrapeBusy: boolean;
  scrapeError: string | null;
  saveBusy: boolean;
  onRescan: () => void;
  onSave: () => void;
  alreadySaved?: boolean;
  currentTabSaved?: JobApplication | null;
  preparingInBackground?: boolean;
  onOpenHub?: () => void;
};

export function DetectedJobCard({
  job,
  scrapeBusy,
  scrapeError,
  saveBusy,
  onRescan,
  onSave,
  alreadySaved,
  currentTabSaved,
  preparingInBackground,
  onOpenHub,
}: Props) {
  const source = job?.pageUrl ? jobSourceFromUrl(job.pageUrl) : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <div className={cn(ccHeroCard, "flex min-h-0 flex-1 flex-col gap-3.5")}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Current tab</p>
          <h2 className="mt-1.5 text-[17px] font-bold leading-snug tracking-tight text-slate-900">
            {scrapeBusy ? "Scanning tab…" : job?.jobTitle?.trim() || "No job detected"}
          </h2>
          {job?.companyName?.trim() ? (
            <p className="mt-1 text-[14px] font-semibold text-indigo-700">{job.companyName}</p>
          ) : null}
          {source ? (
            <span className={cn(ccMetaChip("mt-2 bg-indigo-50/80 text-indigo-600 ring-indigo-200/50"))}>{source}</span>
          ) : null}
        </div>

        {scrapeError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] font-medium text-red-900">
            {scrapeError}
          </p>
        ) : null}

        {job?.descriptionText?.trim() ? (
          <div className="max-h-[150px] overflow-y-auto rounded-xl border border-slate-200/50 bg-slate-50/60 p-3">
            <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
              {job.descriptionText.trim().slice(0, 600)}
              {job.descriptionText.length > 600 ? "…" : ""}
            </p>
          </div>
        ) : !scrapeBusy ? (
          <p className={ccMuted}>Open a job posting in your browser tab, then rescan.</p>
        ) : null}

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

      <div className="mt-auto flex flex-col gap-2 px-0.5">
        <button
          type="button"
          className={cn(ccBtnPrimary, "w-full py-2.5 text-[13px]")}
          disabled={!job?.pageUrl || saveBusy || scrapeBusy}
          onClick={onSave}
        >
          {saveBusy ? "Saving…" : alreadySaved ? "Save again & re-prepare" : "Save Job"}
        </button>
        <div className="flex items-center justify-between gap-2">
          {onOpenHub ? (
            <button type="button" className={cn(ccBtnGhost, "flex-1 text-[11px]")} onClick={onOpenHub}>
              View saved jobs
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
    </div>
  );
}
