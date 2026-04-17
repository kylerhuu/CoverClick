import type { JobExtractionPartial } from "../types";
import { asPartial, firstMatchText, longestTextAmong, pickText } from "../dom";

const DESCRIPTION_SELECTORS = [
  '[itemprop="description"]',
  '[data-testid="jobsearch-JobComponent-description"]',
  ".job-description",
  ".jobDescription",
  "#job-description",
  "#jobDescription",
  '[class*="job-description" i]',
  '[id*="job-description" i]',
  "article",
  "main",
] as const;

export function extractGenericCareersPage(doc: Document): JobExtractionPartial {
  let jobTitle = firstMatchText(doc, [
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

  let companyName = firstMatchText(doc, [
    '[data-testid="jobsearch-CompanyName"]',
    '[itemprop="hiringOrganization"]',
    ".company",
    ".employer",
    ".employer-name",
  ]);

  const ogSite = doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content")?.trim();
  if (!companyName && ogSite) companyName = ogSite;

  const appName = doc.querySelector('meta[name="application-name"]')?.getAttribute("content")?.trim();
  if (!companyName && appName) companyName = appName;

  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim();
  if (!jobTitle && ogTitle && ogTitle.length < 220) {
    const parts = ogTitle.split(/\s[—\-|]\s/u);
    jobTitle = parts[0]?.trim() ?? "";
    if (!companyName) {
      const maybe = parts[1]?.trim();
      if (maybe && maybe.length < 120) companyName = maybe;
    }
  }

  const descriptionText =
    longestTextAmong(doc, [...DESCRIPTION_SELECTORS], 100) ||
    pickText(doc.querySelector('[role="main"]')) ||
    pickText(doc.querySelector("article"));

  return asPartial({ jobTitle, companyName, descriptionText });
}
