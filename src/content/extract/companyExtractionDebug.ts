import type { CompanyExtractionDebugReport } from "../../lib/companyExtractionDebugTypes";
import { readCompanyExtractionDebugEnabled } from "../../lib/companyExtractionDebugClient";

export type { CompanyExtractionDebugReport } from "../../lib/companyExtractionDebugTypes";
export type { CompanyCandidateDebugEntry } from "../../lib/companyExtractionDebugTypes";

declare global {
  interface Window {
    __COVERCLICK_LAST_COMPANY_DEBUG__?: CompanyExtractionDebugReport;
    __COVERCLICK_LAST_SCRAPED_JOB__?: unknown;
  }
}

/** Always attach on the job tab (independent of debug flag). */
export function publishCompanyExtractionDebugToPage(
  report: CompanyExtractionDebugReport,
  job?: unknown,
): void {
  try {
    window.__COVERCLICK_LAST_COMPANY_DEBUG__ = report;
    if (job !== undefined) window.__COVERCLICK_LAST_SCRAPED_JOB__ = job;
  } catch {
    /* ignore — cross-origin or restricted */
  }
}

export function logCompanyExtractionDebug(report: CompanyExtractionDebugReport): void {
  publishCompanyExtractionDebugToPage(report);

  void readCompanyExtractionDebugEnabled().then((enabled) => {
    if (!enabled) return;

    const lines = [
      "Company Extraction Debug (job tab)",
      `URL: ${report.pageUrl}`,
      `Board: ${report.board} · Host: ${report.hostname}`,
      `Final: ${report.value || "(empty)"} · Winner: ${report.winner}`,
      "",
      "Raw candidates (found):",
      ...(report.rawFound.length
        ? report.rawFound.map((r) => `- "${r.raw}" from ${r.source} (${r.origin})`)
        : ["- (none)"]),
      "",
      "Accepted:",
      ...(report.accepted.length
        ? report.accepted.map(
            (a) => `- "${a.value}" from ${a.source} (${a.origin}) confidence=${a.confidence}`,
          )
        : ["- (none)"]),
      "",
      "Rejected:",
      ...(report.rejected.length
        ? report.rejected.map((r) => `- "${r.raw}" from ${r.source} (${r.origin}) → ${r.reason}`)
        : ["- (none)"]),
    ];

    console.groupCollapsed("[CoverClick] Company extraction (job tab)");
    for (const line of lines) console.log(line);
    console.log("(Side panel: re-scan with debug flag to see JobContext + panel block.)");
    console.groupEnd();
  });
}
