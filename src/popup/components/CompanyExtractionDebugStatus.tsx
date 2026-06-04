import type { JobContext } from "../../lib/types";
import { SCRAPE_PIPELINE_VERSION } from "../../lib/scrapePipeline";
import { CompanyExtractionDebugPanel } from "./CompanyExtractionDebugPanel";
import { LinkedInExtractionDebugPanel } from "./LinkedInExtractionDebugPanel";

type Props = {
  job: JobContext | null;
  busy: boolean;
};

export function CompanyExtractionDebugStatus({ job, busy }: Props) {
  const report = job?.companyExtractionDebug;
  const hasReport = Boolean(report);
  const pipelineVersion = job?.scrapePipelineVersion;
  const pipelineOk = pipelineVersion === SCRAPE_PIPELINE_VERSION;
  const candidatesCount = job?.companyCandidates?.length ?? 0;

  return (
    <div className="shrink-0 space-y-2 rounded-lg border-2 border-amber-400/90 bg-amber-50 px-3 py-2.5 text-[11px] leading-snug text-amber-950 shadow-sm">
      <p className="font-bold text-amber-900">Company extraction debug</p>
      <ul className="space-y-0.5 font-mono text-[10px]">
        <li>Debug enabled: yes</li>
        <li>scrapePipelineVersion: {pipelineVersion ?? "missing"} (expected {SCRAPE_PIPELINE_VERSION})</li>
        <li>Has companyExtractionDebug: {hasReport ? "yes" : "no"}</li>
        <li>companyName: {job?.companyName?.trim() ? `"${job.companyName.trim()}"` : "(empty)"}</li>
        <li>companyCandidates: {candidatesCount}</li>
        <li>scrape state: {busy ? "scanning…" : job ? "idle" : "no job loaded"}</li>
      </ul>

      {!pipelineOk ? (
        <p className="rounded border border-red-300 bg-red-50 px-2 py-1.5 text-[10px] font-medium text-red-900">
          Content script looks outdated. Run npm run build:content, reload the extension, reload the job tab, then
          Re-scan.
        </p>
      ) : null}

      {!hasReport ? (
        <p className="rounded border border-amber-300/80 bg-amber-100/60 px-2 py-1.5 text-[10px] font-medium text-amber-950">
          Debug enabled but companyExtractionDebug missing. Content script may be stale or scrape payload is dropping
          the debug field. Check side panel console for the full JobContext log after Re-scan.
        </p>
      ) : null}

      {hasReport && report ? (
        <div className="space-y-1 border-t border-amber-300/70 pt-2">
          <p className="font-semibold text-[10px]">Company: raw / accepted / rejected</p>
          <CompanyExtractionDebugPanel report={report} />
        </div>
      ) : null}

      {job?.linkedinExtractionDebug ? (
        <LinkedInExtractionDebugPanel report={job.linkedinExtractionDebug} />
      ) : null}
    </div>
  );
}
