import type { JobApplication } from "../../lib/types";
import { structuredLetterToPlainText } from "../../lib/letterModel";
import { cn } from "../../lib/classNames";
import { ccBtnGhost, ccSectionTitle, ccSurfaceQuiet } from "../../ui/ccUi";

type Props = {
  application: JobApplication;
  onClose: () => void;
};

export function ApplicationMaterialsPanel({ application, onClose }: Props) {
  const letterText = application.coverLetterDraft
    ? structuredLetterToPlainText(application.coverLetterDraft)
    : null;
  const suggestions = application.resumeSuggestions;

  return (
    <div className={cn(ccSurfaceQuiet, "space-y-4 p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Application materials</p>
          <h3 className={ccSectionTitle}>
            {application.title} · {application.company}
          </h3>
        </div>
        <button type="button" className={ccBtnGhost} onClick={onClose}>
          Close
        </button>
      </div>

      <section>
        <h4 className="text-[12px] font-bold text-slate-800">Cover letter draft</h4>
        {letterText ? (
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700">
            {letterText}
          </pre>
        ) : (
          <p className="mt-2 text-[12px] text-slate-500">No cover letter yet — still preparing or not generated.</p>
        )}
      </section>

      {suggestions ? (
        <section className="space-y-3">
          <h4 className="text-[12px] font-bold text-slate-800">Resume suggestions</h4>
          {suggestions.summary ? <p className="text-[12px] text-slate-700">{suggestions.summary}</p> : null}
          {suggestions.keywordsToInclude?.length ? (
            <div>
              <p className="text-[11px] font-semibold text-slate-600">Keywords to include</p>
              <p className="text-[11px] text-slate-700">{suggestions.keywordsToInclude.join(" · ")}</p>
            </div>
          ) : null}
          {suggestions.bulletRewriteSuggestions?.length ? (
            <ul className="space-y-2">
              {suggestions.bulletRewriteSuggestions.slice(0, 4).map((b, i) => (
                <li key={i} className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-700">
                  <p className="font-semibold text-slate-900">{b.improvedBullet}</p>
                  <p className="mt-1 text-slate-500">{b.reason}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        <p className="text-[12px] text-slate-500">Resume suggestions will appear after preparation completes.</p>
      )}
    </div>
  );
}
