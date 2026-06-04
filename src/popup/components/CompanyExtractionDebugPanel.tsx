import type { CompanyExtractionDebugReport } from "../../lib/companyExtractionDebugTypes";

type Props = {
  report: CompanyExtractionDebugReport;
};

export function CompanyExtractionDebugPanel({ report }: Props) {
  return (
    <div className="rounded-lg border border-amber-200/90 bg-amber-50/70 p-2.5 text-[10px] leading-snug text-amber-950">
      <p className="font-semibold text-amber-900">Company extraction debug</p>
      <p className="mt-1 break-all text-amber-800/90">
        {report.board} · {report.hostname}
      </p>
      <p className="mt-0.5 break-all text-amber-800/80">{report.pageUrl}</p>
      <p className="mt-1.5 font-medium">
        Final: <span className="font-semibold">{report.value || "(empty)"}</span> · winner: {report.winner}
      </p>

      <div className="mt-2">
        <p className="font-semibold">Raw (found)</p>
        {report.rawFound.length ? (
          <ul className="mt-0.5 list-inside list-disc space-y-0.5">
            {report.rawFound.map((r, i) => (
              <li key={`raw-${i}`}>
                &quot;{r.raw}&quot; — {r.source} ({r.origin})
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-0.5 italic text-amber-800/80">(none — scraper did not find company text)</p>
        )}
      </div>

      <div className="mt-2">
        <p className="font-semibold">Accepted</p>
        {report.accepted.length ? (
          <ul className="mt-0.5 list-inside list-disc space-y-0.5">
            {report.accepted.map((a, i) => (
              <li key={`acc-${i}`}>
                &quot;{a.value}&quot; — {a.source} ({a.origin}) · {a.confidence}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-0.5 italic text-amber-800/80">(none)</p>
        )}
      </div>

      <div className="mt-2">
        <p className="font-semibold">Rejected</p>
        {report.rejected.length ? (
          <ul className="mt-0.5 list-inside list-disc space-y-0.5">
            {report.rejected.map((r, i) => (
              <li key={`rej-${i}`}>
                &quot;{r.raw}&quot; — {r.source} ({r.origin}) → {r.reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-0.5 italic text-amber-800/80">(none)</p>
        )}
      </div>
    </div>
  );
}
