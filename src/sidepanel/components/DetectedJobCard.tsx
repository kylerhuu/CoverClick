import type { JobContext } from "../../lib/types";
import { jobSourceFromUrl } from "../../lib/jobSource";
import { cn } from "../../lib/classNames";
import { ccBtnPrimary, ccMuted, ccSurfaceQuiet } from "../../ui/ccUi";

type Props = {
  job: JobContext | null;
  scrapeBusy: boolean;
  scrapeError: string | null;
  saveBusy: boolean;
  onRescan: () => void;
  onSave: () => void;
  alreadySaved?: boolean;
};

export function DetectedJobCard({
  job,
  scrapeBusy,
  scrapeError,
  saveBusy,
  onRescan,
  onSave,
  alreadySaved,
}: Props) {
  const source = job?.pageUrl ? jobSourceFromUrl(job.pageUrl) : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Current job</p>
        <h2 className="mt-1 text-[16px] font-bold tracking-tight text-slate-900">
          {scrapeBusy ? "Scanning tab…" : job?.jobTitle?.trim() || "No job detected"}
        </h2>
        {job?.companyName?.trim() ? (
          <p className="mt-0.5 text-[13px] font-medium text-indigo-700">{job.companyName}</p>
        ) : null}
        {source ? <p className="mt-1 text-[11px] text-slate-500">Source: {source}</p> : null}
      </div>

      {scrapeError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-900">
          {scrapeError}
        </p>
      ) : null}

      {job?.descriptionText?.trim() ? (
        <div className={cn(ccSurfaceQuiet, "max-h-[140px] overflow-y-auto p-3")}>
          <p className="line-clamp-6 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
            {job.descriptionText.trim().slice(0, 600)}
            {job.descriptionText.length > 600 ? "…" : ""}
          </p>
        </div>
      ) : !scrapeBusy ? (
        <p className={ccMuted}>Open a job posting in your browser tab, then rescan.</p>
      ) : null}

      <div className="mt-auto flex flex-col gap-2">
        <button type="button" className={ccBtnPrimary} disabled={!job?.pageUrl || saveBusy || scrapeBusy} onClick={onSave}>
          {saveBusy ? "Saving…" : alreadySaved ? "Save again & re-prepare" : "Save Job"}
        </button>
        <button
          type="button"
          className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-40"
          disabled={scrapeBusy}
          onClick={onRescan}
        >
          Re-scan tab
        </button>
      </div>
    </div>
  );
}
