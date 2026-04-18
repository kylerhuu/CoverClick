import type { JobContext, UserProfile } from "../../lib/types";
import { profileCompleteness } from "../../lib/profileCompleteness";
import { truncate } from "../../lib/utils";
import { cn } from "../../lib/classNames";

type Props = {
  job: JobContext | null;
  profile: UserProfile;
  busy: boolean;
  error: string | null;
  onRefresh: () => void;
};

export function JobPane({ job, profile, busy, error, onRefresh }: Props) {
  const { score, missingLabels } = profileCompleteness(profile);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-4 py-2.5">
        <div>
          <div className="text-[13px] font-semibold tracking-tight text-slate-900">Posting</div>
          <p className="text-[10px] text-slate-500">Extracted job context</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="text-[11px] font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900 disabled:opacity-40"
        >
          Re-read tab
        </button>
      </div>

      <div className="shrink-0 border-b border-slate-100 px-4 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Profile</span>
          <span className="text-[11px] font-medium tabular-nums text-slate-700">{score}%</span>
        </div>
        {missingLabels.length ? (
          <p className="mt-1 text-[10px] leading-snug text-slate-400">Add: {missingLabels.join(", ")}</p>
        ) : (
          <p className="mt-1 text-[10px] text-emerald-700/90">Profile looks complete.</p>
        )}
      </div>

      {error ? <p className="shrink-0 px-4 py-2 text-[11px] text-red-700">{error}</p> : null}

      <div className="shrink-0 space-y-1 border-b border-slate-100 px-4 py-2.5 text-[12px]">
        <div className="flex gap-2">
          <span className="w-12 shrink-0 text-slate-400">Role</span>
          <span className="min-w-0 font-medium text-slate-900">{job?.jobTitle?.trim() || "—"}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-12 shrink-0 text-slate-400">Co.</span>
          <span className="min-w-0 font-medium text-slate-900">{job?.companyName?.trim() || "—"}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-12 shrink-0 text-slate-400">URL</span>
          <span className="min-w-0 break-all text-[11px] text-slate-500">{job?.pageUrl ? truncate(job.pageUrl, 72) : "—"}</span>
        </div>
      </div>

      <div className="cc-label shrink-0 px-4 pt-3">Job description</div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-4 py-2 pb-4",
          "text-[12px] leading-relaxed text-slate-700",
          "whitespace-pre-wrap",
        )}
      >
        {busy ? (
          <span className="text-slate-400">Scanning…</span>
        ) : job?.descriptionText?.trim() ? (
          job.descriptionText
        ) : (
          <span className="text-slate-400">No description extracted.</span>
        )}
      </div>
    </div>
  );
}
