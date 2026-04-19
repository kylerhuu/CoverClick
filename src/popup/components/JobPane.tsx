import type { JobContext, UserProfile } from "../../lib/types";
import { profileCompleteness } from "../../lib/profileCompleteness";
import { truncate } from "../../lib/utils";
import { cn } from "../../lib/classNames";
import { CognitiveLoader } from "./CognitiveLoader";

const SCRAPE_LINES = [
  "Reading the open tab and job signals…",
  "Pulling title, company, and description…",
  "Normalizing posting text for your draft…",
];

type Props = {
  job: JobContext | null;
  profile: UserProfile;
  busy: boolean;
  error: string | null;
  onRefresh: () => void;
  /** When set, role/company/description become editable and sync into generation. */
  onJobChange?: (next: JobContext) => void;
  onRegenerateLetter?: () => void;
  regenLetterBusy?: boolean;
  showRescanButton?: boolean;
  collapsed?: boolean;
  onExpand?: () => void;
  stackedInSplit?: boolean;
  /** AI is normalizing the scraped job description (show overlay on description). */
  descriptionAiCleaning?: boolean;
};

export function JobPane({
  job,
  profile,
  busy,
  error,
  onRefresh,
  onJobChange,
  onRegenerateLetter,
  regenLetterBusy = false,
  showRescanButton = true,
  collapsed = false,
  onExpand,
  stackedInSplit = false,
  descriptionAiCleaning = false,
}: Props) {
  const { score, missingLabels } = profileCompleteness(profile);
  const r = 15.5;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const editable = Boolean(job && onJobChange);

  const patchJob = (partial: Partial<JobContext>) => {
    if (!job || !onJobChange) return;
    onJobChange({ ...job, ...partial });
  };

  if (collapsed) {
    return (
      <div className="flex h-full min-h-0 w-11 shrink-0 flex-col items-center border-r border-slate-200/70 bg-gradient-to-b from-white to-slate-50/90 py-2">
        <button
          type="button"
          onClick={onExpand}
          title="Show job posting"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-[13px] font-semibold text-slate-700 shadow-sm",
            "hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-950",
          )}
        >
          ›
        </button>
        <span
          className={cn(
            "mt-2 inline-flex h-2 w-2 rounded-full",
            busy ? "bg-amber-400" : "bg-emerald-500",
            "shadow-[0_0_0_3px_rgba(16,185,129,0.2)]",
          )}
          title={busy ? "Scanning…" : "Posting linked to this tab"}
        />
        <div className="mt-4 flex flex-1 items-start justify-center pt-1">
          <span
            className="block max-h-[min(200px,40vh)] origin-top rotate-90 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            aria-hidden
          >
            Job
          </span>
        </div>
      </div>
    );
  }

  const inputCls = cn(
    "min-w-0 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-900 shadow-sm",
    "outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/15",
    !editable && "cursor-default bg-slate-50/80 text-slate-700",
  );

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-gradient-to-b from-white via-slate-50/40 to-slate-50/90",
        stackedInSplit ? "border-b border-slate-200/70" : "border-r border-slate-200/70",
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-3 py-2.5 backdrop-blur-sm sm:px-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]" />
            <div className="text-[13px] font-semibold tracking-tight text-slate-900">Active posting</div>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">
            {editable ? "Edit text the scraper got wrong — it drives your next draft." : "Extracted from your current tab"}
          </p>
        </div>
        {showRescanButton ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            className={cn(
              "shrink-0 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800",
              "shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-900",
              "disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            {busy ? "Scanning…" : "Re-scan tab"}
          </button>
        ) : null}
      </div>

      <div className="shrink-0 border-b border-slate-200/60 bg-white/60 px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36" aria-hidden>
              <circle cx="18" cy="18" r="15.5" fill="none" className="text-slate-200" stroke="currentColor" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r={r}
                fill="none"
                className="text-indigo-500 transition-[stroke-dashoffset] duration-500"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={circumference * (1 - pct)}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-slate-800">
              {score}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-slate-900">Profile fit</div>
            {missingLabels.length ? (
              <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                Stronger letters with: <span className="text-slate-700">{missingLabels.join(" · ")}</span>
              </p>
            ) : (
              <p className="mt-0.5 text-[10px] font-medium text-emerald-700">Ready for a sharp first draft.</p>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <div className="shrink-0 border-b border-red-100 bg-red-50/90 px-4 py-2.5 text-[11px] leading-snug text-red-800">
          {error}
        </div>
      ) : null}

      <div className="shrink-0 space-y-2 border-b border-slate-200/50 bg-white/50 px-4 py-3">
        <div className="grid grid-cols-[52px_1fr] items-center gap-x-2 gap-y-2 text-[12px]">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Role</span>
          {editable ? (
            <input
              className={inputCls}
              value={job?.jobTitle ?? ""}
              onChange={(e) => patchJob({ jobTitle: e.target.value })}
              placeholder="Job title"
              aria-label="Job title"
            />
          ) : (
            <span className="min-w-0 font-semibold leading-snug text-slate-900">{job?.jobTitle?.trim() || "—"}</span>
          )}
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Company</span>
          {editable ? (
            <input
              className={inputCls}
              value={job?.companyName ?? ""}
              onChange={(e) => patchJob({ companyName: e.target.value })}
              placeholder="Company name"
              aria-label="Company name"
            />
          ) : (
            <span className="min-w-0 font-semibold leading-snug text-slate-900">{job?.companyName?.trim() || "—"}</span>
          )}
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Link</span>
          <span className="min-w-0 break-all text-[11px] leading-snug text-slate-500">
            {job?.pageUrl ? truncate(job.pageUrl, 80) : "—"}
          </span>
        </div>
        {onRegenerateLetter ? (
          <button
            type="button"
            onClick={onRegenerateLetter}
            disabled={regenLetterBusy || !job}
            className={cn(
              "w-full rounded-lg border border-indigo-200/90 bg-indigo-50/50 py-2 text-[11px] font-semibold text-indigo-950",
              "hover:bg-indigo-50 disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            {regenLetterBusy ? "Regenerating…" : "Regenerate letter from this posting"}
          </button>
        ) : null}
      </div>

      <div className="cc-label shrink-0 px-4 pb-1 pt-3 text-indigo-600/90">Job description</div>
      <div className="relative min-h-0 min-w-0 flex-1">
        {busy ? (
          <div className="absolute inset-0 z-10 flex flex-col bg-slate-50/85 p-4 backdrop-blur-[1px]">
            <CognitiveLoader open={busy} variant="compact" headline="Understanding this page" lines={SCRAPE_LINES} />
            <div className="mt-4 flex flex-1 flex-col gap-2.5 px-1 pt-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={cn("h-2.5 rounded-md bg-slate-200/90", "animate-pulse")}
                  style={{ width: `${68 + ((i * 13) % 28)}%`, animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          </div>
        ) : null}
        {!busy && descriptionAiCleaning ? (
          <div
            className="absolute inset-0 z-[9] flex flex-col items-center justify-center gap-3 bg-white/80 px-6 text-center backdrop-blur-[2px]"
            role="status"
            aria-live="polite"
          >
            <span className="cc-spinner h-7 w-7 shrink-0 border-[3px]" aria-hidden />
            <div>
              <p className="text-[12px] font-semibold text-slate-900">Cleaning posting with AI…</p>
              <p className="mt-1 text-[10px] font-medium leading-snug text-slate-500">
                Tidying the scraped text so it reads clearly before you edit or generate.
              </p>
            </div>
          </div>
        ) : null}
        {editable ? (
          <textarea
            className={cn(
              "box-border h-full min-h-[8rem] min-w-0 w-full resize-none overflow-y-auto break-words px-4 py-2 pb-6",
              "text-[12px] leading-relaxed text-slate-800",
              "border-0 bg-transparent outline-none focus-visible:bg-white/40",
            )}
            value={job?.descriptionText ?? ""}
            onChange={(e) => patchJob({ descriptionText: e.target.value })}
            placeholder="Paste or edit the job description used for your letter…"
            spellCheck
            aria-label="Job description"
          />
        ) : (
          <div
            className={cn(
              "h-full min-w-0 overflow-y-auto overflow-x-hidden break-words px-4 py-2 pb-6",
              "text-[12px] leading-relaxed text-slate-700",
              "whitespace-pre-wrap",
            )}
          >
            {job?.descriptionText?.trim() ? (
              job.descriptionText
            ) : (
              <span className="text-slate-400">No description extracted. Try re-scanning or another job page.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
