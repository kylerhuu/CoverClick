const REMOVE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "button",
  "form",
  "nav",
  "footer",
  "aside",
  "[role='navigation']",
  "[role='banner']",
  "[role='complementary']",
  "[role='dialog']",
  "[data-testid*='chip']",
  "[data-testid*='job-card']",
  "[class*='chip']",
  "[class*='Chip']",
  "[class*='recommendation']",
  "[class*='similar-job']",
  "[class*='related-job']",
  "[aria-label*='share']",
  "[aria-label*='save']",
  "[aria-label*='dismiss']",
].join(",");

/**
 * Clones a description subtree and strips interactive / chrome nodes before reading text.
 */
export function readDescriptionFromRoot(root: Element | null): string {
  if (!root) return "";
  const clone = root.cloneNode(true) as HTMLElement;
  try {
    clone.querySelectorAll(REMOVE_SELECTORS).forEach((el) => el.remove());
  } catch {
    // ignore invalid selector environments
  }
  const raw = clone.innerText || "";
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function longestDescriptionFromRoots(doc: Document, selectors: string[], minLength: number): string {
  let best = "";
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    const t = readDescriptionFromRoot(el);
    if (t.length >= minLength && t.length > best.length) best = t;
  }
  return best;
}
