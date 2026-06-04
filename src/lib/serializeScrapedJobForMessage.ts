import type { JobContext } from "./types";
import { normalizeScrapedJob } from "./normalizeScrapedJob";

/**
 * Plain JSON-safe job payload for chrome.runtime messaging.
 * Explicit fields so nested debug is never dropped by structured clone edge cases.
 */
export function serializeScrapedJobForMessage(job: JobContext): JobContext {
  const normalized = normalizeScrapedJob(job);
  const payload: JobContext = {
    jobTitle: normalized.jobTitle,
    companyName: normalized.companyName,
    companyCandidates: normalized.companyCandidates,
    companyResolution: normalized.companyResolution,
    companyExtractionDebug: normalized.companyExtractionDebug,
    scrapePipelineVersion: normalized.scrapePipelineVersion,
    pageUrl: normalized.pageUrl,
    descriptionText: normalized.descriptionText,
    scrapedAt: normalized.scrapedAt,
  };
  return JSON.parse(JSON.stringify(payload)) as JobContext;
}
