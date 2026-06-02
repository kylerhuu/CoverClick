import type { StructuredCoverLetter } from "./types";
import { captureHtmlToLetterPdf } from "./captureHtmlToLetterPdf";
import { sanitizeExportBasename, sanitizeFilenamePart } from "./utils";

const LETTER_CONTAINER_ID = "letter-container";

/**
 * Captures the dedicated `#letter-container` node (structured US Letter page with
 * internal margins). Tiles onto portrait Letter PDF pages at full width — no extra
 * jsPDF margins, so content is not double-inset.
 */
export async function downloadStructuredCoverLetterPdf(args: {
  letter: StructuredCoverLetter;
  fullName: string;
  companyName: string;
  jobTitle: string;
  /** Optional basename without extension; overrides auto naming when non-empty after sanitize. */
  fileBaseName?: string;
}): Promise<void> {
  void args.letter;
  const { fullName, companyName, jobTitle, fileBaseName } = args;
  const namePart = sanitizeFilenamePart(fullName, "Applicant");
  const companyPart = sanitizeFilenamePart(companyName, "Company");
  const rolePart = sanitizeFilenamePart(jobTitle, "Role");
  const legacyBase = `${namePart}_CoverLetter_${companyPart}_${rolePart}`;
  const base = fileBaseName?.trim() ? sanitizeExportBasename(fileBaseName, legacyBase) : legacyBase;
  await captureHtmlToLetterPdf({
    elementId: LETTER_CONTAINER_ID,
    filename: `${base}.pdf`,
  });
}
