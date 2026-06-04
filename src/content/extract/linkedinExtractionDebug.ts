import type { LinkedInExtractionDebugReport } from "../../lib/linkedinExtractionDebugTypes";
import { readCompanyExtractionDebugEnabled } from "../../lib/companyExtractionDebugClient";

export function logLinkedInExtractionDebug(report: LinkedInExtractionDebugReport): void {
  void readCompanyExtractionDebugEnabled().then((enabled) => {
    if (!enabled) return;

    const lines = [
      "LinkedIn Extraction Debug",
      `URL: ${report.pageUrl}`,
      `scrapePipelineVersion: ${report.scrapePipelineVersion}`,
      `isJobDetailUrl: ${report.isJobDetailUrl}`,
      `detailRootFound: ${report.detailRootFound}`,
      `detailRootSelectorUsed: ${report.detailRootSelectorUsed || "(none)"}`,
      `waitAttempts: ${report.waitAttempts} · waitMsTotal: ${report.waitMsTotal}`,
      `scrapeQuality: ${report.scrapeQuality}`,
      "",
      "Title candidates:",
      ...formatCandidates(report.titleCandidates),
      "",
      "Company candidates:",
      ...formatCandidates(report.companyCandidates),
      "",
      "Description candidates:",
      ...formatCandidates(report.descriptionCandidates),
      "",
      "Selected:",
      `- title: "${report.selected.jobTitle || "(empty)"}"`,
      `- company: "${report.selected.companyName || "(empty)"}"`,
      `- description length: ${report.selected.descriptionLength}`,
    ];

    console.groupCollapsed("[CoverClick] LinkedIn extraction");
    for (const line of lines) console.log(line);
    console.log("Full report object:", report);
    console.groupEnd();
  });
}

function formatCandidates(list: LinkedInExtractionDebugReport["titleCandidates"]): string[] {
  if (!list.length) return ["- (none)"];
  return list.map((c) => {
    const why = c.reason ? ` (${c.reason})` : "";
    return `- "${c.raw}" [${c.origin}] ${c.status}${why}`;
  });
}
