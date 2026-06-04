import type { LinkedInExtractionDebugReport, LinkedInFieldCandidate } from "../../../lib/linkedinExtractionDebugTypes";
import type { ScrapeQuality } from "../../../lib/types";
import type { CompanyRawEntry, JobExtractionPartial } from "../types";
import { normalizeCompanyCandidate } from "../companyPlatform";
import { asPartial, orderedMatchTexts, pickText } from "../dom";
import { longestDescriptionFromRoots, readDescriptionFromRoot } from "../descriptionDom";
import {
  findLinkedInJobDetailRoot,
  isLinkedInJobDetailUrl,
  spinWait,
} from "./linkedinJobDetail";

const RETRY_ATTEMPTS = 6;
const RETRY_DELAY_MS = 280;

const TITLE_SELECTORS = [
  "h1[data-test-job-title]",
  ".job-details-jobs-unified-top-card__title",
  ".jobs-unified-top-card__job-title",
  "h1.t-24",
  "h1",
] as const;

const COMPANY_SELECTORS = [
  ".jobs-unified-top-card__company-name a",
  ".jobs-unified-top-card__company-name button",
  ".jobs-unified-top-card__company-name",
  ".job-details-jobs-unified-top-card__company-name a",
  ".job-details-jobs-unified-top-card__company-name",
  'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
  'a[data-view-name="job-details-about-company-name"]',
  ".jobs-company__name",
  ".topcard__org-name-link",
] as const;

const DESCRIPTION_SELECTORS = [
  ".jobs-description__text",
  ".jobs-description-content__text",
  ".jobs-box__html-content",
  ".jobs-description",
  '[class*="jobs-description-content"]',
  '[class*="description-content"]',
  ".jobs-details__main-content",
] as const;

const MIN_DESCRIPTION_OK = 120;
const MIN_TITLE_OK = 2;

export type LinkedInExtractionResult = {
  partial: JobExtractionPartial;
  debug: LinkedInExtractionDebugReport;
  scrapeQuality: ScrapeQuality;
};

function pushCandidate(
  list: LinkedInFieldCandidate[],
  raw: string,
  origin: string,
  status: LinkedInFieldCandidate["status"],
  reason?: string,
): void {
  const t = raw.trim();
  if (!t) return;
  const key = `${origin}\0${t.toLowerCase()}`;
  if (list.some((c) => `${c.origin}\0${c.raw.toLowerCase()}` === key)) return;
  list.push({ raw: t, origin, status, reason });
}

function collectTitles(root: ParentNode): LinkedInFieldCandidate[] {
  const out: LinkedInFieldCandidate[] = [];
  for (const sel of TITLE_SELECTORS) {
    for (const t of orderedMatchTexts(root, [sel])) {
      pushCandidate(out, t, `linkedin:title:${sel}`, "candidate");
    }
  }
  return out;
}

function collectDescriptions(root: ParentNode): LinkedInFieldCandidate[] {
  const out: LinkedInFieldCandidate[] = [];
  for (const sel of DESCRIPTION_SELECTORS) {
    const el = root.querySelector(sel);
    const t = readDescriptionFromRoot(el);
    if (t.length >= 40) {
      pushCandidate(out, `${t.length} chars from ${sel}`, `linkedin:description:${sel}`, "candidate");
    }
  }
  const longest = longestDescriptionFromRoots(root, [...DESCRIPTION_SELECTORS], 80);
  if (longest.length >= 40) {
    pushCandidate(out, `${longest.length} chars (longest in root)`, "linkedin:description:longest", "candidate");
  }
  return out;
}

function pickTitle(candidates: LinkedInFieldCandidate[], root: ParentNode): string {
  for (const sel of TITLE_SELECTORS) {
    const t = pickText(root.querySelector(sel));
    if (t.length >= MIN_TITLE_OK && t.length <= 220) return t;
  }
  const first = candidates.find((c) => c.raw.length >= MIN_TITLE_OK && c.raw.length <= 220);
  return first?.raw ?? "";
}

function pickCompany(
  candidates: LinkedInFieldCandidate[],
  root: ParentNode,
  hostname: string,
): { companyName: string; rawEntries: CompanyRawEntry[] } {
  const rawEntries: CompanyRawEntry[] = [];
  const normCtx = { hostname, board: "linkedin" as const };

  for (const sel of COMPANY_SELECTORS) {
    for (const t of orderedMatchTexts(root, [sel])) {
      const result = normalizeCompanyCandidate(t, normCtx);
      const status = result.ok ? "accepted" : "rejected";
      pushCandidate(candidates, t, `linkedin:company:${sel}`, status, result.ok ? undefined : result.reason);
      if (result.ok) rawEntries.push({ raw: t, origin: `linkedin:company:${sel}` });
    }
  }

  const seen = new Set<string>();
  const unique: CompanyRawEntry[] = [];
  for (const e of rawEntries) {
    const k = e.raw.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(e);
  }

  let companyName = "";
  for (const e of unique) {
    const result = normalizeCompanyCandidate(e.raw, normCtx);
    if (result.ok) {
      companyName = result.value;
      break;
    }
  }

  return { companyName, rawEntries: unique };
}

function pickDescription(root: ParentNode, candidates: LinkedInFieldCandidate[]): string {
  const fromSelectors = longestDescriptionFromRoots(root, [...DESCRIPTION_SELECTORS], 80);
  if (fromSelectors.length >= MIN_DESCRIPTION_OK) {
    pushCandidate(
      candidates,
      `${fromSelectors.length} chars`,
      "linkedin:description:selected",
      "accepted",
    );
    return fromSelectors;
  }
  const fallback = readDescriptionFromRoot(root.querySelector(".jobs-description"));
  if (fallback.length >= MIN_DESCRIPTION_OK) {
    pushCandidate(candidates, `${fallback.length} chars`, "linkedin:description:fallback", "accepted");
    return fallback;
  }
  return fromSelectors || fallback;
}

function evaluateQuality(
  isJobDetailUrl: boolean,
  detailRootFound: boolean,
  title: string,
  description: string,
): ScrapeQuality {
  if (!isJobDetailUrl) return "linkedin_no_detail_root";
  if (!detailRootFound) return "linkedin_not_ready";
  const titleOk = title.trim().length >= MIN_TITLE_OK;
  const descOk = description.trim().length >= MIN_DESCRIPTION_OK;
  if (titleOk || descOk) return "ok";
  return "linkedin_not_ready";
}

export function extractLinkedIn(
  doc: Document,
  url: URL,
  hostname: string,
  meta: { attempt: number; waitMsTotal: number; scrapePipelineVersion: number },
): LinkedInExtractionResult {
  const isJobDetailUrl = isLinkedInJobDetailUrl(url);
  const { root, selectorUsed } = findLinkedInJobDetailRoot(doc);
  const detailRootFound = Boolean(root);
  const scope: ParentNode = root ?? doc;

  const titleCandidates = collectTitles(scope);
  const companyCandidates: LinkedInFieldCandidate[] = [];
  const descriptionCandidates = collectDescriptions(scope);

  const jobTitle = pickTitle(titleCandidates, scope);
  for (const c of titleCandidates) {
    if (jobTitle && c.raw === jobTitle) {
      c.status = "accepted";
      c.reason = undefined;
    } else {
      c.status = "rejected";
      c.reason = jobTitle ? "not_selected" : "empty";
    }
  }

  const { companyName, rawEntries } = pickCompany(companyCandidates, scope, hostname);
  const descriptionText = pickDescription(scope, descriptionCandidates);

  const scrapeQuality = evaluateQuality(isJobDetailUrl, detailRootFound, jobTitle, descriptionText);

  const debug: LinkedInExtractionDebugReport = {
    board: "linkedin",
    pageUrl: url.href,
    scrapePipelineVersion: meta.scrapePipelineVersion,
    isJobDetailUrl,
    detailRootFound,
    detailRootSelectorUsed: selectorUsed,
    waitAttempts: meta.attempt + 1,
    waitMsTotal: meta.waitMsTotal,
    titleCandidates,
    companyCandidates,
    descriptionCandidates,
    selected: {
      jobTitle,
      companyName,
      descriptionLength: descriptionText.length,
    },
    scrapeQuality,
  };

  return {
    partial: asPartial({
      jobTitle: jobTitle || undefined,
      companyName: companyName || undefined,
      companyRawEntries: rawEntries.length ? rawEntries : undefined,
      companyCandidates: rawEntries.map((e) => e.raw),
      descriptionText: descriptionText || undefined,
    }),
    debug,
    scrapeQuality,
  };
}

/** Phase 1: retry while detail pane hydrates (LinkedIn SPA). */
export function extractLinkedInWithRetry(
  doc: Document,
  url: URL,
  hostname: string,
  scrapePipelineVersion: number,
): LinkedInExtractionResult {
  let waitMsTotal = 0;
  let result = extractLinkedIn(doc, url, hostname, {
    attempt: 0,
    waitMsTotal,
    scrapePipelineVersion,
  });

  for (let attempt = 1; attempt < RETRY_ATTEMPTS; attempt++) {
    if (result.scrapeQuality === "ok") break;
    spinWait(RETRY_DELAY_MS);
    waitMsTotal += RETRY_DELAY_MS;
    result = extractLinkedIn(doc, url, hostname, { attempt, waitMsTotal, scrapePipelineVersion });
  }

  return result;
}
