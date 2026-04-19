import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { StructuredCoverLetter } from "./types";
import { sanitizeExportBasename, sanitizeFilenamePart } from "./utils";

/** US Letter in points (jsPDF). */
const PDF_W = 612;
const PDF_H = 792;

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
  const filename = `${base}.pdf`;

  const el = document.getElementById(LETTER_CONTAINER_ID);
  if (!el || !(el instanceof HTMLElement)) {
    throw new Error(
      `Missing #${LETTER_CONTAINER_ID}. Open the CoverClick side panel so the print layout can mount, then try PDF again.`,
    );
  }

  void el.offsetHeight;
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  await new Promise<void>((r) => requestAnimationFrame(() => r()));

  await document.fonts?.ready?.catch(() => undefined);

  const scale = 2.25;
  const canvas = await html2canvas(el, {
    scale,
    backgroundColor: "#ffffff",
    logging: false,
    useCORS: true,
    width: el.offsetWidth,
    height: el.scrollHeight,
    windowWidth: el.offsetWidth,
    windowHeight: el.scrollHeight,
    scrollX: 0,
    scrollY: 0,
    x: 0,
    y: 0,
  });

  const iw = canvas.width;
  const ih = canvas.height;
  if (iw < 1 || ih < 1) {
    throw new Error("Could not render the letter page for PDF.");
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });

  /** Image fitted to full page width; height in pt preserves aspect ratio. */
  const imgWpt = PDF_W;
  const imgHpt = (ih * PDF_W) / iw;

  let ySrcPt = 0;
  let page = 0;

  while (ySrcPt < imgHpt - 0.2) {
    if (page > 0) pdf.addPage();
    const sliceHpt = Math.min(PDF_H, imgHpt - ySrcPt);
    const syPx = (ySrcPt / imgHpt) * ih;
    const sHPx = (sliceHpt / imgHpt) * ih;

    const shPx = Math.max(1, Math.ceil(sHPx));
    const temp = document.createElement("canvas");
    temp.width = iw;
    temp.height = shPx;
    const ctx = temp.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, temp.width, temp.height);
    ctx.drawImage(canvas, 0, syPx, iw, sHPx, 0, 0, iw, sHPx);

    const dataUrl = temp.toDataURL("image/png", 1.0);
    pdf.addImage(dataUrl, "PNG", 0, 0, imgWpt, sliceHpt);
    ySrcPt += sliceHpt;
    page++;
  }

  pdf.save(filename);
}
