/** Containers that hold the *selected* job in split-view / full-page layouts. */
export const LINKEDIN_DETAIL_ROOT_SELECTORS = [
  '[data-view-name="job-detail-page"]',
  ".jobs-search__job-details",
  ".jobs-details",
  ".job-details-jobs-unified-top-card__container--two-pane",
  ".job-details-jobs-unified-top-card__container",
  "#job-details",
  ".jobs-details__main-content",
  'div[class*="jobs-details"]',
] as const;

export function isLinkedInJobDetailUrl(url: URL): boolean {
  const path = url.pathname.toLowerCase();
  const params = url.searchParams;
  if (/\/jobs\/view\//i.test(path)) return true;
  if (params.has("currentJobId")) return true;
  if (/\/jobs\/collections\//i.test(path)) return true;
  if (/\/jobs\/search\//i.test(path) && params.has("currentJobId")) return true;
  return false;
}

export type LinkedInDetailRoot = {
  root: Element | null;
  selectorUsed: string;
};

export function findLinkedInJobDetailRoot(doc: Document): LinkedInDetailRoot {
  for (const sel of LINKEDIN_DETAIL_ROOT_SELECTORS) {
    const el = doc.querySelector(sel);
    if (el) return { root: el, selectorUsed: sel };
  }
  return { root: null, selectorUsed: "" };
}

export function spinWait(ms: number): void {
  if (ms <= 0) return;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* intentional sync delay for SPA hydration in content script */
  }
}
