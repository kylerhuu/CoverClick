import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/classNames";

const STEPS = [
  "Reading your file…",
  "Pulling text from the document…",
  "Structuring profile fields…",
  "Sending to the model for extraction…",
];

export type ResumeExtractionOutcome = "neutral" | "success" | "error";

type Props = {
  /** True while the import API request is in flight. */
  active: boolean;
  /** Set when the request finishes (same tick as `active` going false is fine). */
  outcome: ResumeExtractionOutcome;
};

/**
 * Progress UI while resume extraction runs (no server-side streaming — smooth, staged feedback).
 * Effect depends only on `active` so parent profile updates do not cancel the completion timeout.
 */
export function ResumeExtractionProgress({ active, outcome }: Props) {
  const [step, setStep] = useState(0);
  const [pct, setPct] = useState(0);
  const [show, setShow] = useState(false);
  const wasActive = useRef(false);
  const outcomeRef = useRef(outcome);
  outcomeRef.current = outcome;

  useEffect(() => {
    if (active) {
      wasActive.current = true;
      setShow(true);
      setStep(0);
      setPct(5);
      const start = Date.now();
      const id = window.setInterval(() => {
        const elapsed = Date.now() - start;
        setStep(() => Math.min(STEPS.length - 1, Math.floor(elapsed / 1000)));
        const t = 1 - Math.exp(-elapsed / 3200);
        setPct(5 + t * 82);
      }, 180);
      return () => window.clearInterval(id);
    }

    if (wasActive.current) {
      wasActive.current = false;
      const oc = outcomeRef.current;
      if (oc === "error") {
        setShow(false);
        setPct(0);
        setStep(0);
        return undefined;
      }
      setStep(STEPS.length - 1);
      setPct(100);
      const hide = window.setTimeout(() => {
        setShow(false);
        setPct(0);
        setStep(0);
      }, 500);
      return () => window.clearTimeout(hide);
    }
    return undefined;
  }, [active]);

  if (!show && !active) return null;

  const running = active;

  return (
    <div className="overflow-hidden rounded-xl border border-indigo-200/60 bg-gradient-to-b from-indigo-50/90 to-white px-4 py-3 shadow-sm" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-slate-900">{running ? STEPS[step] : "Extraction complete"}</p>
        <span className="tabular-nums text-[11px] font-semibold text-indigo-700">{Math.round(running ? pct : 100)}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/90">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 transition-[width] duration-500 ease-out",
            running && pct < 95 && "motion-safe:animate-pulse",
          )}
          style={{ width: `${running ? pct : 100}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] leading-snug text-slate-600">
        {running
          ? "Usually a few seconds. If your profile already has data, we will show a side-by-side comparison next."
          : "Processing results…"}
      </p>
    </div>
  );
}
