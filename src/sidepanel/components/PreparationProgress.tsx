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
      <p className="text-[13px] font-semibold text-slate-800">Preparing application…</p>
      <ul className="space-y-2">
        {STEPS.map((step, idx) => {
          const done = current[step.key];
          const prevDone = idx === 0 || current[STEPS[idx - 1].key];
          const active = !done && prevDone;
          return (
            <li key={step.key} className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "border-2 border-indigo-400 bg-indigo-50 text-indigo-600"
                      : "border border-slate-200 bg-slate-50 text-slate-400",
                )}
                aria-hidden
              >
                {done ? "✓" : active ? "…" : ""}
              </span>
              <span
                className={cn(
                  "text-[12px] font-medium",
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
