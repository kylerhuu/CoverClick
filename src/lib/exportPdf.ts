import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { sanitizeFilenamePart } from "./utils";

export async function downloadLetterPreviewPdf(params: {
  element: HTMLElement;
  fullName: string;
  companyName: string;
  jobTitle: string;
}): Promise<void> {
  const namePart = sanitizeFilenamePart(params.fullName, "Applicant");
  const companyPart = sanitizeFilenamePart(params.companyName, "Company");
  const rolePart = sanitizeFilenamePart(params.jobTitle, "Role");
  const filename = `${namePart}_CoverLetter_${companyPart}_${rolePart}.pdf`;

  const el = params.element;
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
  });

  const pageW = 612;
  const pageH = 792;
  const margin = 48;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const imgW = canvas.width;
  const imgH = canvas.height;
  const scale = Math.min(maxW / imgW, maxH / imgH, 1);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const offsetX = margin + (maxW - drawW) / 2;
  const offsetY = margin + (maxH - drawH) / 2;

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const img = canvas.toDataURL("image/png");
  pdf.addImage(img, "PNG", offsetX, offsetY, drawW, drawH);
  pdf.save(filename);
}
