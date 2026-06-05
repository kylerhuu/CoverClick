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

/** Premium hub list card — clickable row with depth. */
export const ccHubCard = cn(
  "rounded-2xl border border-slate-200/70 bg-white px-3.5 py-3 text-left shadow-[0_1px_3px_rgba(15,23,42,0.05)]",
  "transition-all duration-150 hover:border-indigo-200/90 hover:shadow-[0_4px_14px_rgba(79,70,229,0.08)] hover:-translate-y-px",
);

export const ccHubCardSelected = cn(
  "border-indigo-300/90 bg-indigo-50/40 ring-2 ring-indigo-200/50 shadow-[0_4px_14px_rgba(79,70,229,0.1)]",
);

/** Hero / detail surface. */
export const ccHeroCard = cn(
  "rounded-2xl border border-slate-200/60 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
);

/** Compact status pill — primary visual marker. */
export function ccStatusPill(colorClasses: string): string {
  return cn(
    "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1",
    colorClasses,
  );
}

/** Secondary metadata chip (fit, letter, etc.). */
export function ccMetaChip(colorClasses: string): string {
  return cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold ring-1", colorClasses);
}

/** Hub summary stat chip at list top. */
export function ccSummaryChip(active: boolean): string {
  return cn(
    "inline-flex flex-col items-center rounded-xl px-3 py-2 ring-1",
    active
      ? "bg-white text-slate-900 ring-slate-200/80 shadow-sm"
      : "bg-slate-50/80 text-slate-600 ring-slate-200/50",
  );
}

/** Profile avatar chip in header. */
export const ccProfileChip = cn(
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/15 text-[11px] font-bold text-white",
  "hover:bg-white/25 transition-colors",
  ccFocusRing,
);

/** Side panel mode tab — active state with indigo accent. */
export function ccSidePanelTab(active: boolean): string {
  return cn(
    "relative min-h-[36px] flex-1 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all duration-150",
    active
      ? "bg-white text-indigo-950 shadow-sm ring-1 ring-indigo-200/70"
      : "text-slate-500 hover:bg-white/60 hover:text-slate-800",
  );
}

export const ccSidePanelTabTrack = cn(
  "inline-flex w-full rounded-xl border border-slate-200/70 bg-slate-100/60 p-1 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]",
);

export const ccCountBadge = cn(
  "ml-1.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700",
);
