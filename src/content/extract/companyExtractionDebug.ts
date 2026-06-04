import type { CompanyCandidateSource } from "./types";

export type CompanyCandidateDebugEntry = {
  source: CompanyCandidateSource;
  raw: string;
  status: "accepted" | "rejected" | "skipped";
  reason?: string;
  normalized?: string;
};

export type CompanyExtractionDebugReport = {
  board: string;
  hostname: string;
  winner: CompanyCandidateSource | "none";
  value: string;
  candidates: CompanyCandidateDebugEntry[];
};

const DEV =
  typeof import.meta !== "undefined" &&
  Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);

function debugEnabled(): boolean {
  if (DEV) return true;
  try {
    return localStorage.getItem("coverclick:debugCompanyExtraction") === "1";
  } catch {
    return false;
  }
}

export function logCompanyExtractionDebug(report: CompanyExtractionDebugReport): void {
  if (!debugEnabled()) return;

  const lines = [
    "Company Extraction Debug",
    `Winner: ${report.winner}`,
    `Value: ${report.value || "(empty — UI may show Unknown)"}`,
    "Candidates:",
    ...report.candidates.map((c) => {
      const norm = c.normalized ? ` → "${c.normalized}"` : "";
      const why = c.reason ? ` (${c.reason})` : "";
      return `- ${c.source}: ${c.raw || "(empty)"} [${c.status}]${why}${norm}`;
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
