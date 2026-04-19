/** Main workspace area: job only, letter only, or letter column inside split. */
export type WorkspaceTab = "split" | "job" | "letter";

export type PanelDensity = "narrow" | "comfortable" | "wide";

export function panelDensityFromWidth(w: number): PanelDensity {
  if (w < 420) return "narrow";
  if (w < 720) return "comfortable";
  return "wide";
}

/** Below this width, split uses stacked job/letter so the letter gets full panel width. */
export const SPLIT_STACK_MAX_WIDTH = 560;
