import type { PreparationSteps } from "../../lib/types";
import { cn } from "../../lib/classNames";

type StepDef = {
  key: keyof PreparationSteps;
  label: string;
};

const STEPS: StepDef[] = [
  { key: "jobSaved", label: "Job saved" },
  { key: "fitAnalyzed", label: "Resume fit analyzing" },
  { key: "coverLetterDrafted", label: "Cover letter drafting" },
  { key: "resumeSuggestionsGenerated", label: "Resume suggestions generating" },
];

type Props = {
  steps: PreparationSteps | null;
  error?: string | null;
  className?: string;
};

export function PreparationProgress({ steps, error, className }: Props) {
  const current = steps ?? {
    jobSaved: false,
    fitAnalyzed: false,
    coverLetterDrafted: false,
    resumeSuggestionsGenerated: false,
  };

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-[12px] font-bold uppercase tracking-wide text-indigo-900/80">Preparing application…</p>
      <ul className="relative space-y-0">
        {STEPS.map((step, idx) => {
          const done = current[step.key];
          const prevDone = idx === 0 || current[STEPS[idx - 1].key];
          const active = !done && prevDone;
          const isLast = idx === STEPS.length - 1;
          return (
            <li key={step.key} className="relative flex items-start gap-3 pb-3 last:pb-0">
              {!isLast ? (
                <span
                  className={cn(
                    "absolute left-[9px] top-5 h-[calc(100%-12px)] w-px",
                    done ? "bg-emerald-300" : "bg-slate-200",
                  )}
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "relative z-[1] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                  done
                    ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                    : active
                      ? "border-2 border-indigo-400 bg-white text-indigo-600"
                      : "border border-slate-200 bg-slate-50 text-slate-400",
                )}
                aria-hidden
              >
                {done ? "✓" : active ? "…" : ""}
              </span>
              <span
                className={cn(
                  "pt-0.5 text-[12px] font-medium leading-snug",
                  done ? "text-emerald-800" : active ? "text-indigo-900" : "text-slate-500",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-950">
          {error}
        </p>
      ) : null}
    </div>
  );
}
