import { cn } from "../lib/classNames";

/** Shared focus ring for extension surfaces (light backgrounds). */
export const ccFocusRing = cn(
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f6f9]",
);

export const ccBtnPrimary = cn(
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm",
  "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400",
  "active:translate-y-[0.5px] disabled:pointer-events-none disabled:opacity-45",
  ccFocusRing,
);

export const ccBtnPrimarySm = cn(
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm",
  "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400",
  "disabled:pointer-events-none disabled:opacity-45",
  ccFocusRing,
);

export const ccBtnSecondary = cn(
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200/90 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-800 shadow-sm",
  "hover:border-indigo-200/90 hover:bg-slate-50/90 hover:text-indigo-950",
  "disabled:pointer-events-none disabled:opacity-45",
  ccFocusRing,
);

export const ccBtnSecondarySm = cn(
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-800 shadow-sm",
  "hover:border-indigo-200/90 hover:bg-slate-50/80",
  "disabled:pointer-events-none disabled:opacity-45",
  ccFocusRing,
);

export const ccBtnGhost = cn(
  "inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-slate-600",
  "hover:bg-slate-100/90 hover:text-slate-900",
  "disabled:pointer-events-none disabled:opacity-40",
  ccFocusRing,
);

export const ccBtnDangerOutlineSm = cn(
  "inline-flex items-center justify-center rounded-md border border-amber-200/90 bg-amber-50/60 px-3 py-1.5 text-[12px] font-semibold text-amber-950",
  "hover:bg-amber-50 disabled:pointer-events-none disabled:opacity-45",
  ccFocusRing,
);

/** Segmented control track (tabs). */
export const ccSegmentTrack = cn(
  "inline-flex rounded-lg border border-slate-200/80 bg-slate-100/80 p-0.5 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)]",
);

export function ccSegmentTab(active: boolean): string {
  return cn(
    "rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150",
    active
      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70"
      : "text-slate-500 hover:text-slate-800",
  );
}

export const ccEyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";

export const ccSectionTitle = "text-[15px] font-semibold tracking-tight text-slate-900";

export const ccMuted = "text-[13px] leading-relaxed text-slate-600";

export const ccHairline = "h-px w-full bg-gradient-to-r from-transparent via-slate-200/90 to-transparent";

/** Quiet surface: no heavy card border. */
export const ccSurfaceQuiet = cn("rounded-xl bg-white/70 ring-1 ring-slate-200/40 shadow-[0_1px_2px_rgba(15,23,42,0.04)]");
