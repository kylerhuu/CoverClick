import { cn } from "../lib/classNames";

/** Shared focus ring for extension surfaces (light backgrounds). */
export const ccFocusRing = cn(
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f6f9]",
);

/** Cross-screen page padding. */
export const ccPagePadding = "px-4 py-5";

export const ccHeroTitle = "text-[20px] font-semibold leading-tight tracking-tight text-slate-900";

export const ccHeroSubtitle = "text-[14px] font-medium text-slate-600";

export const ccMetadataLabel = "text-[11px] font-medium text-slate-400";

export const ccMetadataValue = "text-[14px] font-medium text-slate-900";

export const ccTertiaryText = "text-[12px] text-slate-400";

export const ccTextLink = cn(
  "text-[12px] font-medium text-slate-500 hover:text-slate-800",
  "disabled:pointer-events-none disabled:opacity-40",
  ccFocusRing,
);

export const ccBtnPrimary = cn(
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white",
  "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700",
  "disabled:pointer-events-none disabled:opacity-45",
  ccFocusRing,
);

/** Primary Apply CTA — solid indigo, supporting copy stack. */
export const ccBtnApply = cn(
  "inline-flex flex-col items-center justify-center rounded-lg px-4 py-3.5 text-white",
  "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700",
  "disabled:pointer-events-none disabled:opacity-45",
  ccFocusRing,
);

/** Secondary text action. */
export const ccBtnTextSecondary = cn(
  "inline-flex items-center justify-center text-[13px] font-medium text-slate-600",
  "hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40",
  ccFocusRing,
);

export const ccPageTitle = "text-[15px] font-semibold tracking-tight text-slate-900";

export const ccBtnPrimarySm = cn(
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold text-white",
  "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700",
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

/** Segmented control track — aligned with side panel tabs. */
export const ccSegmentTrack = cn(
  "inline-flex rounded-lg bg-slate-100/70 p-0.5",
);

export function ccSegmentTab(active: boolean): string {
  return cn(
    "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors duration-150",
    active
      ? "bg-white text-slate-900 shadow-sm"
      : "text-slate-500 hover:text-slate-700",
  );
}

export const ccEyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";

export const ccSectionTitle = "text-[15px] font-semibold tracking-tight text-slate-900";

export const ccMuted = "text-[13px] leading-relaxed text-slate-600";

export const ccHairline = "h-px w-full bg-slate-100";

/** Quiet surface: no heavy card border. */
export const ccSurfaceQuiet = cn("rounded-xl bg-white/70 ring-1 ring-slate-200/40 shadow-[0_1px_2px_rgba(15,23,42,0.04)]");

/** Dense hub list row — full-width inbox item. */
export const ccHubListRow = cn(
  "block w-full border-b border-slate-100 border-l-[3px] border-l-transparent px-4 py-2 text-left transition-colors duration-100",
  "hover:bg-slate-50",
);

export const ccHubListRowSelected = cn(
  "border-l-indigo-600 bg-indigo-50/80 hover:bg-indigo-50/90",
);

export const ccHubSectionHeader = "flex items-center gap-2 px-4 pb-1 pt-4 text-[11px] font-semibold text-slate-500 first:pt-2";

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
    "relative min-h-[32px] flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors duration-150",
    active
      ? "bg-white text-slate-900 shadow-sm"
      : "text-slate-500 hover:text-slate-700",
  );
}

export const ccSidePanelTabTrack = cn(
  "inline-flex w-full rounded-lg bg-slate-100/70 p-0.5",
);

export const ccCountBadge = cn(
  "ml-1.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700",
);
