import type { JobBoardId } from "../types";
import type { JobExtractionPartial } from "../types";
import { normalizeCompanyCandidate } from "../companyPlatform";
import { isKnownJobBoard } from "../board";
import { asPartial, firstMatchText } from "../dom";
import { longestDescriptionFromRoots, readDescriptionFromRoot } from "../descriptionDom";

const DESCRIPTION_SELECTORS = [
  '[itemprop="description"]',
  '[data-testid="jobsearch-JobComponent-description"]',
  '[data-testid="jobDetailedDescription"]',
  ".job-description",
  ".jobDescription",
  "#job-description",
  "#jobDescription",
  '[class*="job-description"]',
  '[id*="job-description"]',
  '[class*="JobDescription"]',
  "article",
  "main",
] as const;

const COMPANY_DOM_SELECTORS = [
  '[data-testid="jobsearch-CompanyName"]',
  ".jobs-unified-top-card__company-name a",
  ".jobs-unified-top-card__company-name",
  'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
  '[itemprop="hiringOrganization"]',
  '[itemprop="name"][itemscope]',
  '[class*="employer-name"]',
  '[class*="EmployerName"]',
  '[class*="employer"]',
  ".employer",
  ".employer-name",
  'header [class*="company"] a',
  'header a[href*="/company/"]',
] as const;

/** Avoid Handshake/LinkedIn UI "CompanyName" classes on job-board pages. */
const COMPANY_DOM_SELECTORS_KNOWN_BOARD = COMPANY_DOM_SELECTORS.filter(
  (s) => !s.includes("CompanyName") && !s.includes("company-name"),
);

export function extractGenericCompanyDom(
  doc: Document,
  board: JobBoardId,
  hostname: string,
): string | undefined {
  const selectors = isKnownJobBoard(board) ? COMPANY_DOM_SELECTORS_KNOWN_BOARD : [...COMPANY_DOM_SELECTORS];
  const raw = firstMatchText(doc, selectors);
  const result = normalizeCompanyCandidate(raw, { hostname, board });
  return result.ok ? result.value : undefined;
}

export function extractGenericCompanyMeta(doc: Document, board: JobBoardId, hostname: string): string | undefined {
  if (isKnownJobBoard(board)) return undefined;

  const ogSite = doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content")?.trim();
  let candidate = ogSite;
  const appName = doc.querySelector('meta[name="application-name"]')?.getAttribute("content")?.trim();
  if (!candidate && appName) candidate = appName;

  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim();
  if (!candidate && ogTitle && ogTitle.length < 220) {
    const parts = ogTitle.split(/\s[—\-|]\s/u);
    const maybe = parts[1]?.trim();
    if (maybe && maybe.length < 120) candidate = maybe;
  }

  const result = normalizeCompanyCandidate(candidate, { hostname, board });
  return result.ok ? result.value : undefined;
}

export function extractGenericCareersPage(doc: Document): JobExtractionPartial {
  const jobTitle = firstMatchText(doc, [
    '[data-testid="jobsearch-JobInfoHeader-title"]',
    '[itemprop="title"]',
    ".job-title",
    ".jobTitle",
    "#job-title",
    "article h1",
    "main h1",
    '[itemtype*="JobPosting"] h1',
    "h1",
  ]);

  const descriptionText =
    longestDescriptionFromRoots(doc, [...DESCRIPTION_SELECTORS], 100) ||
    readDescriptionFromRoot(doc.querySelector('[role="main"]')) ||
    readDescriptionFromRoot(doc.querySelector("article"));

  return asPartial({ jobTitle, descriptionText });
}
