import type { LinkedInExtractionDebugReport } from "../../../lib/linkedinExtractionDebugTypes";
import type { JobContext, ScrapeQuality } from "../../../lib/types";
import { longestDescriptionFromRoots, readDescriptionFromRoot } from "../descriptionDom";
import { pickText } from "../dom";
import { getLinkedInCurrentJobId } from "./linkedinJobDetail";

const GUEST_TITLE_SELECTORS = [
  "h1.top-card-layout__title",
  "h2.top-card-layout__title",
  ".topcard__title",
  "h1",
] as const;

const GUEST_COMPANY_SELECTORS = [
  ".topcard__org-name-link",
  ".topcard__flavor a",
  ".sub-nav-cta__optional-url",
] as const;

const GUEST_DESCRIPTION_SELECTORS = [
  ".show-more-less-html__markup",
  ".decorated-job-posting__details",
  ".description__text",
  "div[class*='show-more-less-html__markup']",
] as const;

export async function fetchLinkedInGuestJobHtml(jobId: string): Promise<string | null> {
  const id = jobId.trim();
  if (!id) return null;
  try {
    const res = await fetch(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`, {
      credentials: "include",
      headers: { Accept: "text/html" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (!html || html.length < 200) return null;
    if (/sign in|authwall|join linkedin/i.test(html) && !html.includes("show-more-less-html")) return null;
    return html;
  } catch {
    return null;
  }
}

function pickGuestTitle(doc: Document): string {
  for (const sel of GUEST_TITLE_SELECTORS) {
    const t = pickText(doc.querySelector(sel));
    if (t.length >= 2 && t.length <= 220) return t;
  }
  return "";
}

function pickGuestCompany(doc: Document): string {
  for (const sel of GUEST_COMPANY_SELECTORS) {
    const t = pickText(doc.querySelector(sel));
    if (t.length >= 2 && t.length <= 120) return t;
  }
  return "";
}

function pickGuestDescription(doc: Document): string {
  return (
    longestDescriptionFromRoots(doc, [...GUEST_DESCRIPTION_SELECTORS], 80) ||
    readDescriptionFromRoot(doc.querySelector(".decorated-job-posting__details"))
  );
}

/** LinkedIn-only: fill empty scrape from jobs-guest API when SPA DOM has no detail root. */
export async function maybeEnhanceLinkedInFromGuestApi(job: JobContext): Promise<JobContext> {
  if (!job.pageUrl.includes("linkedin.com")) return job;
  if (job.scrapeQuality === "ok") return job;

  const jobId = getLinkedInCurrentJobId(new URL(job.pageUrl));
  if (!jobId) return job;

  const hasContent =
    (job.jobTitle?.trim().length ?? 0) >= 2 ||
    (job.companyName?.trim().length ?? 0) >= 2 ||
    (job.descriptionText?.length ?? 0) >= 120;
  if (hasContent) return job;

  const html = await fetchLinkedInGuestJobHtml(jobId);
  if (!html) return job;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const jobTitle = pickGuestTitle(doc);
  const companyName = pickGuestCompany(doc);
  const descriptionText = pickGuestDescription(doc);

  if (!jobTitle && !companyName && descriptionText.length < 120) return job;

  const scrapeQuality: ScrapeQuality =
    jobTitle.length >= 2 || descriptionText.length >= 120 ? "ok" : job.scrapeQuality ?? "linkedin_not_ready";

  const debug: LinkedInExtractionDebugReport | undefined = job.linkedinExtractionDebug
    ? {
        ...job.linkedinExtractionDebug,
        detailRootFound: true,
        detailRootSelectorUsed: `guestApi:jobPosting/${jobId}`,
        rootResolutionMode: "fallback",
        sourceDocument: "top",
        scrapeQuality,
        candidateRoots: [
          ...job.linkedinExtractionDebug.candidateRoots,
          {
            selector: `guestApi:jobPosting/${jobId}`,
            found: true,
            textLength: descriptionText.length,
            hasTitle: jobTitle.length >= 2,
            hasCompany: companyName.length >= 2,
            hasDescription: descriptionText.length >= 120,
            status: "accepted",
            reason: "jobs-guest API HTML",
          },
        ],
        selected: {
          jobTitle,
          companyName,
          descriptionLength: descriptionText.length,
        },
      }
    : undefined;

  return {
    ...job,
    jobTitle: jobTitle || job.jobTitle,
    companyName: companyName || job.companyName,
    descriptionText: descriptionText || job.descriptionText,
    scrapeQuality,
    linkedinExtractionDebug: debug,
  };
}
