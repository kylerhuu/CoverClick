import { useMemo } from "react";
import type { StructuredResume } from "../../../lib/types";
import { cn } from "../../../lib/classNames";
import {
  buildDefaultFinalExportOverrides,
  getResumeRenderModel,
  type FinalExportOverrides,
  type ResumeRenderOptions,
} from "../../../lib/resumeRender";
import { formatPageFitDisplay, healthyPageBand } from "../../../lib/resumePageMetrics";
import { ResumePreview } from "./ResumePreview";

export type ResumeExportContext = {
  renderOptions: ResumeRenderOptions;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onEditResume: () => void;
  resume: StructuredResume;
  renderOptions: ResumeRenderOptions;
  pagesUsed: number | null;
  targetLength: number;
  manualEditMode: boolean;
  onEnterManualEdit: () => void;
  onDoneManualEdit: () => void;
  onResetManualEdits: () => void;
  onFinalOverrideChange: (key: string, value: string) => void;
  onExportDocx: (ctx: ResumeExportContext) => void;
  onExportPdf: (ctx: ResumeExportContext) => void;
};

export function ResumeDownloadReview({
  open,
  onClose,
  onEditResume,
  resume,
  renderOptions,
  pagesUsed,
  targetLength,
  manualEditMode,
  onEnterManualEdit,
  onDoneManualEdit,
  onResetManualEdits,
  onFinalOverrideChange,
  onExportDocx,
  onExportPdf,
}: Props) {
  const model = useMemo(() => getResumeRenderModel(resume, renderOptions), [resume, renderOptions]);
  const omittedNotes = model.layout.renderPlan.omittedNotes;
  const pageFit = pagesUsed != null ? formatPageFitDisplay(pagesUsed, targetLength) : null;
  const band = healthyPageBand(targetLength);
  const exportCtx: ResumeExportContext = { renderOptions };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/40 p-3 backdrop-blur-[2px] sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-download-review-title"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <header className="shrink-0 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="resume-download-review-title" className="text-[14px] font-semibold text-slate-900">
                {manualEditMode ? "Edit final resume" : "Review before download"}
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {manualEditMode
                  ? "Final export preview with inline editing."
                  : "Final export preview — same layout as your PDF and DOCX files."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
          {pagesUsed == null ? (
            <p className="mt-2 text-[11px] text-slate-500">Measuring page length…</p>
          ) : pageFit ? (
            <div className="mt-2 space-y-1">
              <p
                className={cn(
                  "text-[11px] font-semibold",
                  pageFit.tone === "ok" ? "text-emerald-700" : pageFit.tone === "slight" ? "text-amber-800" : "text-red-700",
                )}
              >
                {pageFit.headline}
              </p>
              <p className="text-[10px] text-slate-600">
                Target fill: {band.min.toFixed(2)}–{band.max.toFixed(2)} pages (ideal{" "}
                {band.idealMin.toFixed(2)}–{band.idealMax.toFixed(2)})
              </p>
              {pageFit.detail ? <p className="text-[10px] text-slate-500">{pageFit.detail}</p> : null}
            </div>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 px-4 py-4 sm:px-5">
          {manualEditMode ? (
            <section className="mb-3 rounded-lg border-2 border-indigo-400 bg-indigo-50 px-3 py-3 shadow-sm">
              <p className="text-[12px] font-bold text-indigo-950">Manual Edit Mode ON</p>
              <p className="mt-1 text-[11px] leading-snug text-indigo-900">
                Click directly into the resume to make final export edits.
              </p>
              <p className="mt-1 text-[10px] text-indigo-800/90">
                These edits affect the final export only and do not change your saved structured resume.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onDoneManualEdit}
                  className="rounded-lg border border-indigo-500 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-950"
                >
                  Done Editing
                </button>
                <button
                  type="button"
                  onClick={onResetManualEdits}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800"
                >
                  Reset Manual Edits
                </button>
              </div>
            </section>
          ) : null}
          {omittedNotes.length > 0 ? (
            <section className="mb-3 rounded-lg border border-amber-200/90 bg-amber-50/80 p-3">
              <h3 className="text-[11px] font-semibold text-amber-950">Auto-fit changes</h3>
              <p className="mt-0.5 text-[10px] text-amber-900/80">Layout adjustments applied for export (not saved to your resume).</p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[10px] text-amber-900/90">
                {omittedNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          ) : null}
          <ResumePreview
            resume={resume}
            template="ats-classic"
            variant="preview"
            renderOptions={renderOptions}
            showPageBoundary
            className="mx-auto"
            editable={manualEditMode}
            onFinalOverrideChange={onFinalOverrideChange}
          />
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEditResume}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[12px] font-semibold text-slate-800"
            >
              Edit Resume
            </button>
            {!manualEditMode ? (
              <button
                type="button"
                onClick={onEnterManualEdit}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-[12px] font-semibold text-indigo-950"
              >
                Manually Edit Final Resume
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onExportDocx(exportCtx)}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-[12px] font-semibold text-indigo-950"
            >
              Download DOCX
            </button>
            <button
              type="button"
              onClick={() => onExportPdf(exportCtx)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white"
            >
              Download PDF
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function seedFinalExportOverrides(
  resume: StructuredResume,
  renderOptions: ResumeRenderOptions,
  current: FinalExportOverrides,
): FinalExportOverrides {
  if (Object.keys(current).length > 0) return current;
  const model = getResumeRenderModel(resume, renderOptions);
  return buildDefaultFinalExportOverrides(model.resume, model.layout.renderPlan);
}
