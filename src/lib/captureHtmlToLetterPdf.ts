import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PDF_W = 612;
const PDF_H = 792;

type CaptureOptions = {
  elementId: string;
  filename: string;
  backgroundColor?: string;
  scale?: number;
};

export async function captureHtmlToLetterPdf(options: CaptureOptions): Promise<void> {
  const { elementId, filename, backgroundColor = "#ffffff", scale = 2.25 } = options;
  const el = document.getElementById(elementId);
  if (!el || !(el instanceof HTMLElement)) {
    throw new Error(
      `Missing #${elementId}. Open the CoverClick side panel so the export layout can mount, then try PDF again.`,
    );
  }

  void el.offsetHeight;
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  await document.fonts?.ready?.catch(() => undefined);

  const canvas = await html2canvas(el, {
    scale,
    backgroundColor,
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
    throw new Error("Could not render the page for PDF.");
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
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
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, temp.width, temp.height);
    ctx.drawImage(canvas, 0, syPx, iw, sHPx, 0, 0, iw, sHPx);

    const dataUrl = temp.toDataURL("image/png", 1.0);
    pdf.addImage(dataUrl, "PNG", 0, 0, imgWpt, sliceHpt);
    ySrcPt += sliceHpt;
    page++;
  }

  pdf.save(filename);
}
