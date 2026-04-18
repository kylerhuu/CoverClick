import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { structuredLetterToPlainText } from "./letterModel";
import type { StructuredCoverLetter } from "./types";
import { sanitizeFilenamePart } from "./utils";

/** US Letter in points (jsPDF default). */
const PDF_W = 612;
const PDF_H = 792;
const MARGIN = 48;

/**
 * Renders the letter as plain text in an off-screen print column, captures the full
 * height with html2canvas, then tiles into multi-page US Letter PDFs (no squashing,
 * no clipping from scroll areas or &lt;textarea&gt; quirks).
 */
export async function downloadStructuredCoverLetterPdf(params: {
  letter: StructuredCoverLetter;
  fullName: string;
  companyName: string;
  jobTitle: string;
}): Promise<void> {
  const namePart = sanitizeFilenamePart(params.fullName, "Applicant");
  const companyPart = sanitizeFilenamePart(params.companyName, "Company");
  const rolePart = sanitizeFilenamePart(params.jobTitle, "Role");
  const filename = `${namePart}_CoverLetter_${companyPart}_${rolePart}.pdf`;

  const bodyText = structuredLetterToPlainText(params.letter);
  const root = document.createElement("div");
  root.setAttribute("data-coverclick-pdf-root", "true");
  root.style.cssText = [
    "position:fixed",
    "left:-14000px",
    "top:0",
    "width:504px",
    "padding:44px 40px",
    "background:#ffffff",
    "color:#0f172a",
    'font-family:Georgia,Cambria,"Times New Roman",Times,serif',
    "font-size:11.25pt",
    "line-height:1.75",
    "white-space:pre-wrap",
    "word-break:break-word",
    "box-sizing:border-box",
    "-webkit-font-smoothing:antialiased",
  ].join(";");

  root.textContent = bodyText.trim() ? bodyText : " ";
  document.body.appendChild(root);
  void root.offsetHeight;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  try {
    await document.fonts?.ready?.catch(() => undefined);

    const canvas = await html2canvas(root, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
      width: root.offsetWidth,
      height: root.scrollHeight,
      windowWidth: root.offsetWidth,
      windowHeight: root.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const contentW = PDF_W - MARGIN * 2;
    const contentH = PDF_H - MARGIN * 2;

    const iw = canvas.width;
    const ih = canvas.height;
    if (iw < 1 || ih < 1) {
      throw new Error("Could not render letter for PDF.");
    }

    const scaleToW = contentW / iw;
    const totalHpt = ih * scaleToW;

    let yPt = 0;
    let page = 0;

    while (yPt < totalHpt - 0.25) {
      if (page > 0) pdf.addPage();
      const sliceHpt = Math.min(contentH, totalHpt - yPt);
      const sy = yPt / scaleToW;
      const sH = sliceHpt / scaleToW;

      const shPx = Math.max(1, Math.ceil(sH));
      const temp = document.createElement("canvas");
      temp.width = iw;
      temp.height = shPx;
      const ctx = temp.getContext("2d");
      if (!ctx) throw new Error("Canvas unsupported.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, temp.width, temp.height);
      ctx.drawImage(canvas, 0, sy, iw, sH, 0, 0, iw, sH);

      const dataUrl = temp.toDataURL("image/png", 1.0);
      pdf.addImage(dataUrl, "PNG", MARGIN, MARGIN, contentW, sliceHpt);
      yPt += sliceHpt;
      page++;
    }

    pdf.save(filename);
  } finally {
    root.remove();
  }
}
