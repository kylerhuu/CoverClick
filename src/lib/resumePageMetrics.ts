/** 8.5×11in letter page minus vertical padding (44px top + bottom) at 96dpi. */
export const LETTER_PAGE_CONTENT_MAX_PX = 11 * 96 - 44 * 2;

export function resumeContentOverflows(contentHeightPx: number): boolean {
  return contentHeightPx > LETTER_PAGE_CONTENT_MAX_PX + 1;
}
