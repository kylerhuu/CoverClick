import type { JobContext } from "../../lib/types";
import { truncate } from "../../lib/utils";
import { cn } from "../../lib/classNames";

type Props = {
  job: JobContext | null;
  busy: boolean;
  error: string | null;
  onRefresh: () => void;
};

export function JobSection({ job, busy, error, onRefresh }: Props) {
  return (
    <section className="px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="cc-label">Posting</span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="text-[11px] font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900 disabled:opacity-40"
        >
          Re-read tab
        </button>
      </div>

      {error ? <p className="mt-1.5 text-[11px] leading-snug text-red-700">{error}</p> : null}

      <dl className="mt-2 space-y-1 text-[12px]">
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-slate-400">Role</dt>
          <dd className="min-w-0 font-medium leading-snug text-slate-900">{job?.jobTitle?.trim() || "—"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-slate-400">Co.</dt>
          <dd className="min-w-0 font-medium leading-snug text-slate-900">{job?.companyName?.trim() || "—"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-slate-400">URL</dt>
          <dd className="min-w-0 break-all text-[11px] leading-snug text-slate-500">
            {job?.pageUrl ? truncate(job.pageUrl, 96) : "—"}
          </dd>
        </div>
      </dl>

      <div
        className={cn(
          "mt-2 max-h-[72px] overflow-y-auto border-l-2 border-slate-200 pl-2.5",
          "text-[11px] leading-relaxed text-slate-600",
        )}
      >
        {busy ? (
          <span className="text-slate-400">Scanning page…</span>
        ) : job?.descriptionText?.trim() ? (
          truncate(job.descriptionText, 720)
        ) : (
          <span className="text-slate-400">No description detected.</span>
        )}
      </div>
    </section>
  );
}
