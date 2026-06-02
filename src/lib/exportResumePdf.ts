import type { StructuredResume } from "./types";
import { RESUME_EXPORT_CONTAINER_ID, RESUME_TEMPLATE_VERSION } from "./resumeRender";
import { captureHtmlToLetterPdf } from "./captureHtmlToLetterPdf";
import { sanitizeExportBasename } from "./utils";

export async function downloadResumePdf(_resume: StructuredResume, fileBaseName: string): Promise<void> {
  const base = sanitizeExportBasename(fileBaseName || "CoverClick_Resume", "CoverClick_Resume");

  if (import.meta.env.DEV) {
    console.debug("[resume-export] formatting version: resume-template-v2", {
      target: "pdf-html-capture",
      template: RESUME_TEMPLATE_VERSION,
      source: RESUME_EXPORT_CONTAINER_ID,
    });
  }

  await captureHtmlToLetterPdf({
    elementId: RESUME_EXPORT_CONTAINER_ID,
    filename: `${base}.pdf`,
  });
}
