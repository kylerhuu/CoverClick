import type { JobContext } from "./types";

/** Ensure scrape message fields survive Chrome messaging (no accidental drops). */
export function normalizeScrapedJob(job: JobContext): JobContext {
  return {
    jobTitle: job.jobTitle ?? "",
    companyName: job.companyName ?? "",
    companyCandidates: job.companyCandidates,
    companyResolution: job.companyResolution,
    companyExtractionDebug: job.companyExtractionDebug,
    scrapePipelineVersion: job.scrapePipelineVersion,
    pageUrl: job.pageUrl ?? "",
    descriptionText: job.descriptionText ?? "",
    scrapedAt: job.scrapedAt ?? Date.now(),
  };
}
