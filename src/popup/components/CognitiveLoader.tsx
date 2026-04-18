import { useEffect, useState } from "react";
import { cn } from "../../lib/classNames";

type Props = {
  open: boolean;
  headline: string;
  lines: string[];
  /** 'letter' = large centered card; 'compact' = inline strip */
  variant?: "letter" | "compact";
};

export function CognitiveLoader({ open, headline, lines, variant = "letter" }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!open || lines.length === 0) return;
    setIdx(0);
    const t = window.setInterval(() => {
      setIdx((n) => (n + 1) % lines.length);
    }, 2400);
    return () => window.clearInterval(t);
  }, [open, lines.length]);

  if (!open || lines.length === 0) return null;

  const line = lines[idx % lines.length];

  if (variant === "compact") {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-indigo-200/60 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm"
        role="status"
        aria-live="polite"
      >
        <span className="cc-spinner shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-900">{headline}</p>
          <p className="truncate text-[10px] text-slate-500 transition-opacity duration-500">{line}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/[0.12] p-6 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative w-full max-w-[320px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl ring-1 ring-indigo-500/[0.08]">
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 shadow-md">
              <span className="cc-spinner-light" aria-hidden />
            </div>
            <div>
              <p className="text-[12px] font-semibold tracking-tight text-slate-900">{headline}</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-indigo-600/90">CoverClick</p>
            </div>
          </div>
          <div className="mt-5 min-h-[2.75rem]">
            <p key={idx} className="cc-fade-in text-[12px] leading-snug text-slate-600">
              {line}
            </p>
          </div>
          <div className="mt-4 flex gap-1">
            {lines.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-500",
                  i === idx ? "bg-indigo-500" : "bg-slate-200",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
