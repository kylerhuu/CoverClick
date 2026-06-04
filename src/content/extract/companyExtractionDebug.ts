import type { CompanyExtractionDebugReport } from "../../lib/companyExtractionDebugTypes";
import { isCompanyExtractionDebugEnabled } from "../../lib/companyExtractionDebugClient";

export type { CompanyExtractionDebugReport } from "../../lib/companyExtractionDebugTypes";
export type { CompanyCandidateDebugEntry } from "../../lib/companyExtractionDebugTypes";

export function logCompanyExtractionDebug(report: CompanyExtractionDebugReport): void {
  if (!isCompanyExtractionDebugEnabled()) return;

  const lines = [
    "Company Extraction Debug",
    `URL: ${report.pageUrl}`,
    `Board: ${report.board} · Host: ${report.hostname}`,
    `Final: ${report.value || "(empty)"} · Winner: ${report.winner}`,
    "",
    "Raw candidates (found in DOM / structured data):",
    ...(report.rawFound.length
      ? report.rawFound.map(
          (r) => `- "${r.raw}" from ${r.source} (${r.origin})`,
        )
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
      ? report.rejected.map(
          (r) => `- "${r.raw}" from ${r.source} (${r.origin}) → ${r.reason}`,
        )
      : ["- (none)"]),
    "",
    "Per-entry:",
    ...report.candidates.map((c) => {
      const norm = c.normalized ? ` → "${c.normalized}"` : "";
      const why = c.reason ? ` (${c.reason})` : "";
      return `- ${c.source} [${c.origin}]: "${c.raw || "(empty)"}" [${c.status}]${why}${norm}`;
    }),
  ];

  console.groupCollapsed("[CoverClick] Company extraction");
  for (const line of lines) console.log(line);
  console.groupEnd();

  try {
    (window as Window & { __COVERCLICK_LAST_COMPANY_DEBUG__?: CompanyExtractionDebugReport }).__COVERCLICK_LAST_COMPANY_DEBUG__ =
      report;
  } catch {
    /* ignore */
  }
}
