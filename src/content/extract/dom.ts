import type { JobExtractionPartial } from "./types";

export function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function pickText(el: Element | null | undefined): string {
  if (!el) return "";
  return collapseWhitespace(el.textContent || "");
}

export function firstMatchText(doc: Document, selectors: string[]): string {
  for (const sel of selectors) {
    const t = pickText(doc.querySelector(sel));
    if (t) return t;
  }
  return "";
}

export function longestTextAmong(doc: Document, selectors: string[], minLength: number): string {
  let best = "";
  for (const sel of selectors) {
    const t = pickText(doc.querySelector(sel));
    if (t.length >= minLength && t.length > best.length) best = t;
  }
  return best;
}

export function stripHtmlToText(html: string): string {
  if (!html.trim()) return "";
  try {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    return pickText(parsed.body);
  } catch {
    return collapseWhitespace(html.replace(/<[^>]+>/g, " "));
  }
}

/** Greenhouse / Lever often encode company as first path segment: `/acme/jobs/...`. */
export function companyFromFirstPathSegment(url: URL): string | undefined {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return undefined;
  const raw = decodeURIComponent(parts[0] ?? "")
    .replace(/[-_]+/g, " ")
    .trim();
  if (raw.length < 2 || raw.length > 64) return undefined;
  if (/^\d+$/.test(raw)) return undefined;
  const title = raw.replace(/\b\w/g, (c) => c.toUpperCase());
  return title;
}

export function bodyInnerTextFallback(doc: Document, maxLen: number): string {
  const t = collapseWhitespace(doc.body?.innerText || "");
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}

export function asPartial(p: JobExtractionPartial): JobExtractionPartial {
  return {
    jobTitle: p.jobTitle?.trim() || undefined,
    companyName: p.companyName?.trim() || undefined,
    descriptionText: p.descriptionText?.trim() || undefined,
  };
}
