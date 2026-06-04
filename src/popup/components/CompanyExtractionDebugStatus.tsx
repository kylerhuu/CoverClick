import type { JobContext } from "../../lib/types";
import { SCRAPE_PIPELINE_VERSION } from "../../lib/scrapePipeline";
import { CompanyExtractionDebugPanel } from "./CompanyExtractionDebugPanel";

type Props = {
  job: JobContext;
  debugEnabled: boolean;
};

function fmtList(items: string[]): string {
  return items.length ? items.join(", ") : "(none)";
}

export function CompanyExtractionDebugStatus({ job, debugEnabled }: Props) {
  if (!debugEnabled) return null;

  const report = job.companyExtractionDebug;
  const hasReport = Boolean(report);
  const pipelineOk = job.scrapePipelineVersion === SCRAPE_PIPELINE_VERSION;

  return (
    <div className="space-y-2 rounded-lg border border-amber-300/80 bg-amber-50/80 p-2.5 text-[10px] leading-snug text-amber-950">
      <p className="font-semibold text-amber-900">Company extraction debug (side panel)</p>
      <ul className="space-y-0.5 font-mono text-[9px] text-amber-900/95">
        <li>Debug enabled: yes</li>
        <li>Has companyExtractionDebug: {hasReport ? "yes" : "no"}</li>
        <li>scrapePipelineVersion: {job.scrapePipelineVersion ?? "missing"} (expected {SCRAPE_PIPELINE_VERSION})</li>
        <li>companyName: {job.companyName?.trim() ? `"${job.companyName.trim()}"` : "(empty)"}</li>
        <li>companyResolution: {job.companyResolution ?? "(unset)"}</li>
        <li>companyCandidates: {fmtList((job.companyCandidates ?? []).map((c) => c.value))}</li>
      </ul>

      {!pipelineOk ? (
        <p className="rounded border border-red-200/90 bg-red-50/90 px-2 py-1 text-[10px] text-red-900">
          Content script looks outdated. Run <span className="font-semibold">npm run build:content</span>, reload the
          extension, then <span className="font-semibold">reload the job tab</span> and re-scan.
        </p>
      ) : null}

      {!hasReport ? (
        <p className="text-[10px] text-amber-900/90">
          No debug payload on JobContext. Check the side panel console after re-scan (full job is logged when debug is
          on). On the <span className="font-semibold">job tab</span> console,{" "}
          <span className="font-mono">window.__COVERCLICK_LAST_COMPANY_DEBUG__</span> is set after scrape (not in the
          side panel).
        </p>
      ) : null}

      {hasReport && report ? (
        <div className="space-y-1 border-t border-amber-200/80 pt-2">
          <p className="font-semibold">Raw / Accepted / Rejected</p>
          <CompanyExtractionDebugPanel report={report} />
        </div>
      ) : null}
    </div>
  );
}
