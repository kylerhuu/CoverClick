import type { JobApplication, JobContext, ResumeOptimizeForJobResponse, ResumeTailoringResponse } from "../lib/types";

/** Map a saved JobApplication to editor JobContext — never uses the active browser tab. */
export function applicationToJobContext(app: JobApplication): JobContext {
  return {
    jobTitle: app.title,
    companyName: app.company,
    pageUrl: app.jobUrl,
    descriptionText: app.jobDescription,
    scrapedAt: new Date(app.dateSaved).getTime(),
  };
}

/** Best-effort map of saved tailoring payload into Resume Studio optimize preview shape. */
export function tailoringToOptimizePreview(tailoring: ResumeTailoringResponse): ResumeOptimizeForJobResponse {
  return {
    summary: tailoring.summary,
    suggestions: [],
    keywordsToAdd: tailoring.keywordsToInclude,
    warnings: tailoring.warnings,
  };
}
