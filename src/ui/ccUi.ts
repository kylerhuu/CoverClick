import { cn } from "../lib/classNames";

/** App shell background — near-white, not gray. */
export const ccBgApp = "bg-[#FAFBFF]";

/** Shared focus ring for extension surfaces (light backgrounds). */
export const ccFocusRing = cn(
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFBFF]",
);

/** Cross-screen page padding — tight vertical rhythm. */
export const ccPagePadding = "px-4 py-3";

export const ccOpportunityTitle = "text-[18px] font-bold leading-snug tracking-tight text-slate-900";

export const ccHeroTitle = ccOpportunityTitle;

export const ccHeroSubtitle = "text-[14px] font-semibold text-indigo-700";

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

/** Primary CTA — shared by Current Job Apply and Detail Continue. */
export const ccPrimaryCtaLg = cn(
  "inline-flex w-full flex-col items-center justify-center rounded-xl px-4 py-3.5 text-white",
  "bg-[#6366F1] shadow-[0_8px_24px_rgba(99,102,241,0.28)] hover:bg-indigo-500 hover:shadow-[0_10px_28px_rgba(99,102,241,0.38)] active:bg-indigo-700",
  "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none",
  "transition-all duration-180",
  ccFocusRing,
);

/** @deprecated Use ccPrimaryCtaLg */
export const ccBtnApply = ccPrimaryCtaLg;

/** Secondary decision action — Save for later, etc. */
export const ccBtnDecisionSecondary = cn(
  "inline-flex w-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800",
  "hover:border-indigo-200 hover:bg-indigo-50/30",
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

/** Hub list — full bleed on app background, no inner gray slab. */
export const ccHubListSurface = "";

/** Opportunity card — Application Hub queue. */
export const ccHubListCard = cn(
  "group relative flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-left",
  "transition-all duration-180 ease-out",
  "active:scale-[0.99]",
);

export const ccHubListCardSelected = cn(
  "border-indigo-400 bg-indigo-50/60 shadow-[0_4px_16px_rgba(99,102,241,0.14)] ring-2 ring-indigo-200/50",
);

export const ccHubCardReady = cn(
  "border-l-[3px] border-l-[#6366F1] pl-[calc(0.75rem-1px)]",
  "hover:-translate-y-0.5 hover:scale-[1.01] hover:border-indigo-300 hover:shadow-[0_10px_25px_rgba(99,102,241,0.18)]",
);

export const ccHubCardPreparing = "border-l-[3px] border-l-[#F59E0B] pl-[calc(0.75rem-1px)]";

export const ccHubCardApplied = cn(
  "border-l-[3px] border-l-slate-300 pl-[calc(0.75rem-1px)]",
  "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]",
);

export const ccHubListStatusReady = "text-[11px] font-semibold text-[#34D399]";

export const ccHubListStatusPreparing = "text-[11px] font-semibold text-[#F59E0B]";

export const ccHubListStatusApplied = "text-[11px] font-medium text-slate-500";

export const ccHubListMetadata = "mt-0.5 truncate text-[11px] text-slate-400";

export const ccHubListProgress = "mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-indigo-600";

export const ccHubListArrow = cn(
  "shrink-0 text-[16px] font-semibold leading-none text-indigo-500 transition-all duration-180 ease-out",
  "group-hover:translate-x-1 group-hover:text-indigo-600",
);

export const ccHubSectionHeader = "flex items-center gap-2 px-0.5 pb-1.5 pt-2.5 text-[11px] font-semibold text-slate-500 first:pt-1";

export const ccHubListCardGap = "space-y-2";

export const ccDetailStatusPillReady = cn(
  "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/80",
);

export const ccDetailStatusPillPreparing = cn(
  "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200/80",
);

export const ccDetailStatusPillApplied = cn(
  "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/80",
);

export const ccOpportunityCompany = "text-[14px] font-semibold text-indigo-700";

export const ccOpportunitySource = "text-[11px] font-medium text-slate-500";

export const ccDetailHeroFit = "text-[13px] font-semibold text-[#34D399]";

export const ccDetailHeroResume = "text-[12px] font-medium text-slate-500";

/** Transition from job identity → prepared work. */
export const ccDetailTransitionLine = "text-[12px] font-semibold text-emerald-700";

export const ccPreparedAssetsSectionTitle = "text-[12px] font-semibold uppercase tracking-wide text-slate-500";

export const ccPreparedAssetGrid = "grid grid-cols-3 gap-2";

export const ccPreparedAssetCell = cn(
  "flex flex-col items-center rounded-xl border border-slate-200/80 bg-white px-2 py-3 text-center",
);

export const ccPreparedAssetCellIcon = cn(
  "flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-[11px] font-bold text-indigo-600",
);

export const ccPreparedAssetCellLabel = "mt-2 text-[11px] font-semibold leading-tight text-slate-800";

export const ccDetailPrimaryCta = ccPrimaryCtaLg;

/** About this role — only contained surface on detail/current job. */
export const ccAboutRoleSurface = cn(
  "rounded-2xl border border-slate-200/80 bg-white px-4 py-4",
);

/** @deprecated Use ccHubListCard — kept for any legacy imports. */
export const ccHubListRow = ccHubListCard;

/** @deprecated Use ccHubListCardSelected. */
export const ccHubListRowSelected = ccHubListCardSelected;

/** Premium hub list card — clickable row with depth. */
export const ccHubCard = ccHubListCard;

export const ccHubCardSelected = ccHubListCardSelected;

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
