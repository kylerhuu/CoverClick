/** Full letter page height at 96dpi (8.5×11in). */
export const LETTER_PAGE_HEIGHT_PX = 11 * 96;

/** Vertical padding on export page (44px top + bottom). */
export const LETTER_PAGE_PADDING_Y_PX = 88;

/** Usable content band inside one letter page. */
export const LETTER_PAGE_CONTENT_MAX_PX = LETTER_PAGE_HEIGHT_PX - LETTER_PAGE_PADDING_Y_PX;

export type ResumeTargetLength = 1 | 1.5 | 2;

export function targetLengthToPages(target: ResumeTargetLength): number {
  return target;
}

export function targetContentMaxPx(targetPages: number): number {
  return LETTER_PAGE_HEIGHT_PX * targetPages;
}

/** `scrollHeight` of export-styled resume root (includes vertical padding). */
export function pagesUsedFromHeight(scrollHeightPx: number): number {
  if (scrollHeightPx <= 0) return 0;
  return Math.round((scrollHeightPx / LETTER_PAGE_HEIGHT_PX) * 100) / 100;
}

export function resumeContentOverflows(scrollHeightPx: number, targetPages = 1): boolean {
  return scrollHeightPx > targetContentMaxPx(targetPages) + 1;
}

export type PageFitTone = "ok" | "slight" | "over";

export type PageFitDisplay = {
  pagesUsed: number;
  targetPages: number;
  tone: PageFitTone;
  headline: string;
  detail?: string;
};

/** Latest DOM measurement — rendered page is source of truth when present. */
export type ResumeDomFitContext = {
  pagesUsed: number;
  overflows: boolean;
};

/** Target fill band for force-fit (stop tightening once within range). */
export function healthyPageBand(targetPages: number): { min: number; max: number; idealMin: number; idealMax: number } {
  if (targetPages <= 1) return { min: 0.94, max: 1.0, idealMin: 0.96, idealMax: 0.99 };
  if (targetPages <= 1.5) return { min: 1.41, max: 1.5, idealMin: 1.44, idealMax: 1.485 };
  return { min: 1.88, max: 2.0, idealMin: 1.92, idealMax: 1.98 };
}

export function pagesWithinHealthyBand(pagesUsed: number, targetPages: number): boolean {
  const band = healthyPageBand(targetPages);
  return pagesUsed >= band.min && pagesUsed <= band.max;
}

export function formatPageFitDisplay(pagesUsed: number, targetPages: number): PageFitDisplay {
  const rounded = Math.round(pagesUsed * 100) / 100;
  const label = `${rounded.toFixed(2)} page${rounded === 1 ? "" : "s"}`;

  if (pagesUsed <= targetPages) {
    return {
      pagesUsed: rounded,
      targetPages,
      tone: "ok",
      headline: `✓ Fits target (${targetPages} page${targetPages === 1 ? "" : "s"}): ${label}`,
    };
  }

  const overflow = Math.round((pagesUsed - targetPages) * 100) / 100;
  if (pagesUsed <= targetPages + 0.15) {
    return {
      pagesUsed: rounded,
      targetPages,
      tone: "slight",
      headline: `⚠ Slight overflow: ${label}`,
      detail: `${overflow.toFixed(2)} pages over your ${targetPages}-page target`,
    };
  }

  return {
    pagesUsed: rounded,
    targetPages,
    tone: "over",
    headline: `❌ Too long: ${label}`,
    detail: `${overflow.toFixed(2)} pages over your ${targetPages}-page target`,
  };
}
