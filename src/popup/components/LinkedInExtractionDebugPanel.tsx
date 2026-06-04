import type { LinkedInExtractionDebugReport } from "../../lib/linkedinExtractionDebugTypes";

type Props = {
  report: LinkedInExtractionDebugReport;
};

function formatCandidates(list: LinkedInExtractionDebugReport["titleCandidates"]): string {
  if (!list.length) return "(none)";
  return list
    .map((c) => `"${c.raw}" [${c.origin}] ${c.status}${c.reason ? ` (${c.reason})` : ""}`)
    .join("\n");
}

function formatRootCandidates(list: LinkedInExtractionDebugReport["candidateRoots"]): string {
  if (!list.length) return "(none)";
  return list
    .map((c) => {
      const why = c.reason ? ` (${c.reason})` : "";
      const found = c.found ? "found" : "not found";
      return (
        `${c.selector} → ${found}, textLength ${c.textLength}, ` +
        `hasTitle ${c.hasTitle}, hasCompany ${c.hasCompany}, hasDescription ${c.hasDescription} ` +
        `[${c.status}]${why}`
      );
    })
    .join("\n");
}

export function LinkedInExtractionDebugPanel({ report }: Props) {
  return (
    <div className="space-y-1.5 rounded border border-sky-200/90 bg-sky-50/80 p-2 text-[9px] leading-snug text-sky-950">
      <p className="font-semibold text-sky-900">LinkedIn extraction</p>
      <ul className="font-mono space-y-0.5">
        <li>detailRootFound: {String(report.detailRootFound)}</li>
        <li>detailRootSelectorUsed: {report.detailRootSelectorUsed || "(none)"}</li>
        <li>rootResolutionMode: {report.rootResolutionMode}</li>
        <li>isJobDetailUrl: {String(report.isJobDetailUrl)}</li>
        <li>scrapeQuality: {report.scrapeQuality}</li>
        <li>
          wait: {report.waitAttempts} attempt(s), {report.waitMsTotal}ms
        </li>
      </ul>
      <div>
        <p className="font-semibold">Candidate roots</p>
        <pre className="mt-0.5 whitespace-pre-wrap">{formatRootCandidates(report.candidateRoots)}</pre>
      </div>
      <div>
        <p className="font-semibold">Titles</p>
        <pre className="mt-0.5 whitespace-pre-wrap">{formatCandidates(report.titleCandidates)}</pre>
      </div>
      <div>
        <p className="font-semibold">Companies</p>
        <pre className="mt-0.5 whitespace-pre-wrap">{formatCandidates(report.companyCandidates)}</pre>
      </div>
      <div>
        <p className="font-semibold">Descriptions</p>
        <pre className="mt-0.5 whitespace-pre-wrap">{formatCandidates(report.descriptionCandidates)}</pre>
      </div>
      <p className="font-medium">
        Selected: title="{report.selected.jobTitle || "(empty)"}" · company="
        {report.selected.companyName || "(empty)"}" · desc={report.selected.descriptionLength} chars
      </p>
    </div>
  );
}
