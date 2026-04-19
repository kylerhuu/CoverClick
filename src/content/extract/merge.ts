import type { JobContext } from "../../lib/types";
import type { JobExtractionPartial } from "./types";
import { bodyInnerTextFallback } from "./dom";

const MAX_DESCRIPTION = 24_000;

function uniquePreservingOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const k = v.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(v.trim());
  }
  return out;
}

function pickTitle(candidates: string[]): string {
  const c = uniquePreservingOrder(candidates).filter((t) => {
    if (t.length < 2 || t.length > 220) return false;
    if (/^https?:\/\//i.test(t)) return false;
    return true;
  });
  if (!c.length) return "";
  return [...c].sort((a, b) => scoreTitleLike(a) - scoreTitleLike(b))[0] ?? "";
}

function scoreTitleLike(s: string): number {
  const len = s.length;
  // Prefer concise titles; penalize very short and very long.
  const ideal = 48;
  return Math.abs(len - ideal) + (s.includes("\n") ? 40 : 0);
}

const GENERIC_COMPANY = /^(careers|jobs|home|about|apply|company|sign in|log in|linkedin|indeed|glassdoor)$/i;

function isPlausibleCompanyName(s: string): boolean {
  const t = s.trim();
  if (t.length < 2 || t.length > 120) return false;
  if (/^https?:\/\//i.test(t)) return false;
  if (GENERIC_COMPANY.test(t)) return false;
  return true;
}

/** Prefer structured / board extractors in array order; avoid “shortest string wins” picking junk. */
function pickCompanyFromPartials(partials: JobExtractionPartial[]): string {
  for (const p of partials) {
    const c = p.companyName?.trim();
    if (c && isPlausibleCompanyName(c)) return c;
  }
  return "";
}

function scoreCompanyCandidate(s: string): number {
  let score = 0;
  const len = s.length;
  if (len >= 3 && len <= 80) score += 25;
  if (len > 80) score += 10;
  if (/\b(inc|llc|ltd|corp|corporation|company)\b/i.test(s)) score += 8;
  if (GENERIC_COMPANY.test(s)) score -= 50;
  if (/linkedin|indeed|glassdoor|greenhouse|lever\.co/i.test(s)) score -= 25;
  return score;
}

function pickCompanyFromCandidates(candidates: string[]): string {
  const c = uniquePreservingOrder(candidates).filter(isPlausibleCompanyName);
  if (!c.length) return "";
  return [...c].sort((a, b) => scoreCompanyCandidate(b) - scoreCompanyCandidate(a))[0] ?? "";
}

function pickDescription(candidates: string[], doc: Document): string {
  const c = uniquePreservingOrder(candidates).filter((t) => t.length > 40);
  if (!c.length) {
    return bodyInnerTextFallback(doc, MAX_DESCRIPTION);
  }
  const best = [...c].sort((a, b) => b.length - a.length)[0] ?? "";
  if (best.length > MAX_DESCRIPTION) return `${best.slice(0, MAX_DESCRIPTION)}…`;
  return best;
}

/**
 * Merges extractor output: JSON-LD and board-specific runs should appear earlier in the array
 * so tie-breakers favor structured data when lengths are comparable (handled by unique + pick).
 */
export function mergeJobExtractions(partials: JobExtractionPartial[], doc: Document): Omit<JobContext, "pageUrl" | "scrapedAt"> {
  const titles: string[] = [];
  const companies: string[] = [];
  const descriptions: string[] = [];

  for (const p of partials) {
    if (p.jobTitle) titles.push(p.jobTitle);
    if (p.companyName) companies.push(p.companyName);
    if (p.descriptionText) descriptions.push(p.descriptionText);
  }

  let descriptionText = pickDescription(descriptions, doc);
  if (descriptionText.length < 200) {
    const body = bodyInnerTextFallback(doc, MAX_DESCRIPTION);
    if (body.length > descriptionText.length) descriptionText = body;
  }

  const companyFromOrder = pickCompanyFromPartials(partials);
  const companyName = companyFromOrder || pickCompanyFromCandidates(companies);

  return {
    jobTitle: pickTitle(titles),
    companyName,
    descriptionText,
  };
}
