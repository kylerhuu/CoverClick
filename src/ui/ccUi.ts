import { cn } from "../lib/classNames";

/** App shell background. */
export const ccBgApp = "bg-[#F5F7FB]";

/** Shared focus ring for extension surfaces. */
export const ccFocusRing = cn(
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4CF0]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F7FB]",
);

export const ccPagePadding = "px-4 py-3";

export const ccOpportunityTitle = "text-[18px] font-bold leading-snug tracking-tight text-slate-900";

export const ccHeroTitle = ccOpportunityTitle;

export const ccHeroSubtitle = "text-[14px] font-semibold text-[#5B4CF0]";

export const ccMetadataLabel = "text-[11px] font-medium text-slate-400";

export const ccMetadataValue = "text-[14px] font-medium text-slate-900";

export const ccTertiaryText = "text-[12px] text-slate-500";

export const ccMetadataRow = "flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500";

export const ccTextLink = cn(
  "text-[12px] font-medium text-slate-500 hover:text-slate-800",
  "disabled:pointer-events-none disabled:opacity-40",
  ccFocusRing,
);

export const ccBtnPrimary = cn(
  "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold text-white",
  "bg-[#5B4CF0] hover:bg-[#4f46e5] active:bg-[#4338ca]",
  "disabled:pointer-events-none disabled:opacity-45",
  "transition-all duration-200",
  ccFocusRing,
);

/** Primary CTA — Apply now, Continue Application. */
export const ccPrimaryCtaLg = cn(
  "inline-flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-white",
  "bg-[#5B4CF0] shadow-[0_8px_24px_rgba(91,76,240,0.28)] hover:bg-[#4f46e5] hover:shadow-[0_10px_28px_rgba(91,76,240,0.36)] active:bg-[#4338ca]",
  "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none",
  "transition-all duration-200",
  ccFocusRing,
);

export const ccBtnApply = ccPrimaryCtaLg;

export const ccBtnDecisionSecondary = cn(
  "inline-flex w-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm",
  "hover:border-[#5B4CF0]/30 hover:bg-indigo-50/20",
  "disabled:pointer-events-none disabled:opacity-45",
  "transition-all duration-200",
  ccFocusRing,
);

export const ccBtnTextSecondary = cn(
  "inline-flex items-center justify-center text-[13px] font-medium text-slate-600",
  "hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40",
  ccFocusRing,
);

export const ccPageTitle = "text-[15px] font-semibold tracking-tight text-slate-900";

export const ccBtnPrimarySm = cn(
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white",
  "bg-[#5B4CF0] hover:bg-[#4f46e5]",
  "disabled:pointer-events-none disabled:opacity-45",
  ccFocusRing,
);

export const ccBtnSecondary = cn(
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-800 shadow-sm",
  "hover:border-[#5B4CF0]/25 hover:bg-indigo-50/20",
  "disabled:pointer-events-none disabled:opacity-45",
  "transition-all duration-200",
  ccFocusRing,
);

export const ccBtnSecondarySm = cn(
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-800 shadow-sm",
  "hover:border-[#5B4CF0]/25 hover:bg-indigo-50/20",
  "disabled:pointer-events-none disabled:opacity-45",
  "transition-all duration-200",
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

export const ccSegmentTrack = "inline-flex rounded-lg bg-slate-100/60 p-0.5";

export function ccSegmentTab(active: boolean): string {
  return cn(
    "rounded-md px-3 py-1.5 text-[12px] font-medium transition-all duration-200",
    active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
  );
}

export const ccEyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";

export const ccSectionTitle = "text-[15px] font-semibold tracking-tight text-slate-900";

export const ccMuted = "text-[13px] leading-relaxed text-slate-600";

export const ccHairline = "h-px w-full bg-slate-100";

export const ccSurfaceCard = cn(
  "rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
);

export const ccInfoBanner = cn(
  "rounded-xl border border-[#5B4CF0]/15 bg-[#5B4CF0]/[0.06] px-3.5 py-2.5 text-[12px] leading-snug text-slate-700",
);

export const ccHubListCard = cn(
  "group relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-2.5 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
  "transition-all duration-200 ease-out",
  "active:scale-[0.99]",
);

export const ccHubListCardSelected = cn(
  "border-[#5B4CF0] bg-indigo-50/70 shadow-[0_4px_20px_rgba(91,76,240,0.2)] ring-2 ring-[#5B4CF0]/25",
);

export const ccHubCardReady = cn(
  "border-l-[3px] border-l-[#22C55E] pl-[calc(0.625rem-1px)]",
  "hover:-translate-y-0.5 hover:scale-[1.01] hover:border-[#5B4CF0]/40 hover:shadow-[0_10px_25px_rgba(91,76,240,0.18)]",
);

export const ccHubCardPreparing = cn(
  "border-l-[3px] border-l-[#F59E0B] pl-[calc(0.625rem-1px)]",
  "hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(245,158,11,0.12)]",
);

export const ccHubCardApplied = cn(
  "border-l-[3px] border-l-slate-300 pl-[calc(0.625rem-1px)]",
  "hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]",
);

export const ccHubRowIcon = cn(
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[#5B4CF0]",
);

export const ccHubRowIconReady = cn(ccHubRowIcon, "bg-emerald-50 text-[#22C55E]");

export const ccHubRowIconPreparing = cn(ccHubRowIcon, "bg-amber-50 text-[#F59E0B]");

export const ccHubStatusChipReady = cn(
  "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/80",
);

export const ccHubStatusChipPreparing = cn(
  "inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200/80",
);

export const ccHubStatusChipApplied = cn(
  "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/80",
);

export const ccHubListStatusReady = "text-[11px] font-semibold text-emerald-700";

export const ccHubListStatusPreparing = "text-[11px] font-medium text-amber-700";

export const ccHubListStatusApplied = "text-[11px] font-medium text-slate-500";

export const ccHubListArrowWrap = "flex shrink-0 items-center gap-2";

export const ccHubListMetadata = "truncate text-[11px] text-slate-400";

export const ccHubListProgress = "mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-[#5B4CF0]";

export const ccHubListArrow = cn(
  "text-[15px] font-semibold leading-none text-[#5B4CF0] transition-all duration-200 ease-out",
  "group-hover:translate-x-1 group-hover:text-[#4f46e5]",
);

export const ccHubSectionHeader = "flex items-center gap-2 px-0.5 pb-1 pt-2 text-[11px] font-semibold text-slate-500 first:pt-0.5";

export const ccHubListCardGap = "space-y-2";

export const ccHubListSurface = "";

export const ccDetailStatusPillReady = ccHubStatusChipReady;

export const ccDetailStatusPillPreparing = cn(
  "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200/80",
);

export const ccDetailStatusPillApplied = ccHubStatusChipApplied;

export const ccOpportunityCompany = "text-[14px] font-semibold text-[#5B4CF0]";

export const ccOpportunitySource = "text-[11px] font-medium text-slate-500";

export const ccDetailHeroFit = "text-[13px] font-semibold text-[#22C55E]";

export const ccDetailHeroResume = "text-[12px] font-medium text-slate-500";

export const ccDetailTransitionLine = "text-[12px] font-semibold text-[#22C55E]";

export const ccPreparedAssetsSectionTitle = "text-[11px] font-semibold uppercase tracking-wide text-slate-500";

export const ccPreparedAssetGrid = "grid grid-cols-3 gap-2";

export const ccPreparedAssetCard = cn(
  "relative flex flex-col rounded-xl border border-slate-200/90 bg-white px-3 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
);

export const ccPreparedAssetCardIcon = cn(
  "flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-[10px] font-bold text-[#5B4CF0]",
);

export const ccPreparedAssetCardTitle = "mt-2 text-[11px] font-semibold leading-tight text-slate-900";

export const ccPreparedAssetCardSubtitle = "mt-0.5 text-[10px] leading-snug text-slate-500";

export const ccPreparedAssetCheck = cn(
  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#22C55E] text-white",
);

export const ccPreparedAssetIcon = ccPreparedAssetCardIcon;
export const ccPreparedAssetTitle = ccPreparedAssetCardTitle;
export const ccPreparedAssetSubtitle = ccPreparedAssetCardSubtitle;

export const ccDetailPrimaryCta = ccPrimaryCtaLg;

export const ccAboutRoleSurface = cn(
  "rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
);

export const ccResumeRowSurface = cn(
  "flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
);

export const ccCtaArrow = "text-[18px] font-semibold leading-none text-white/90";

export const ccHubListRow = ccHubListCard;
export const ccHubListRowSelected = ccHubListCardSelected;
export const ccHubCard = ccHubListCard;
export const ccHubCardSelected = ccHubListCardSelected;

export const ccHeroCard = cn(
  "rounded-xl border border-slate-200/60 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
);

export const ccSurfaceQuiet = ccSurfaceCard;

export function ccStatusPill(colorClasses: string): string {
  return cn(
    "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1",
    colorClasses,
  );
}

export function ccMetaChip(colorClasses: string): string {
  return cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold ring-1", colorClasses);
}

export function ccSummaryChip(active: boolean): string {
  return cn(
    "inline-flex flex-col items-center rounded-xl px-3 py-2 ring-1",
    active ? "bg-white text-slate-900 ring-slate-200/80 shadow-sm" : "bg-slate-50/80 text-slate-600 ring-slate-200/50",
  );
}

export const ccProfileChip = cn(
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/15 text-[11px] font-bold text-white",
  "hover:bg-white/25 transition-colors",
  ccFocusRing,
);

export function ccSidePanelTab(active: boolean): string {
  return cn(
    "relative min-h-[30px] flex-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-200",
    active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
  );
}

export const ccSidePanelTabTrack = "inline-flex w-full rounded-lg bg-slate-100/50 p-0.5";

export const ccCountBadge = cn(
  "ml-1.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-[#5B4CF0]",
);

export const ccWorkspaceToolbar = cn(
  "flex shrink-0 items-center justify-between gap-3 border-b border-slate-100/80 bg-[#F5F7FB]/95 px-3 py-1.5 backdrop-blur-sm",
);

export const ccWorkspaceGenerateBtn = cn(
  ccBtnPrimary,
  "px-3.5 py-1.5 text-[12px] shadow-[0_4px_14px_rgba(91,76,240,0.22)]",
);

export const ccWorkspaceActionLink = "text-[11px] font-medium text-slate-500 hover:text-slate-800";
