import jsPDF from "jspdf";
import type { StructuredResume } from "./types";
import { formatContactLine, formatEducationLine, getVisibleResumeSections, normalizeResumeForRender } from "./resumeRender";
import { sanitizeExportBasename } from "./utils";

function clampY(y: number, pageHeight: number, doc: jsPDF): number {
  if (y <= pageHeight - 14) return y;
  doc.addPage();
  return 18;
}

export async function downloadResumePdf(resume: StructuredResume, fileBaseName: string): Promise<void> {
  const base = sanitizeExportBasename(fileBaseName || "CoverClick_Resume", "CoverClick_Resume");
  const r = normalizeResumeForRender(resume);

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54;
  const contentWidth = pageWidth - margin * 2;

  let y = 34;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(r.contact.fullName || "Candidate Name", pageWidth / 2, y, { align: "center" });
  y += 16;

  const contact = formatContactLine(r);
  if (contact) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(contact, pageWidth / 2, y, { align: "center" });
    y += 16;
  }

  const sections = getVisibleResumeSections(r);

  const drawHeading = (label: string) => {
    y = clampY(y, pageHeight, doc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(label.toUpperCase(), margin, y);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 3, margin + contentWidth, y + 3);
    y += 13;
  };

  const drawText = (text: string, opts?: { bold?: boolean; italic?: boolean; size?: number; indent?: number; spacing?: number }) => {
    if (!text.trim()) return;
    y = clampY(y, pageHeight, doc);
    const indent = opts?.indent ?? 0;
    const x = margin + indent;
    const width = contentWidth - indent;
    doc.setFont("helvetica", opts?.bold ? "bold" : opts?.italic ? "italic" : "normal");
    doc.setFontSize(opts?.size ?? 9.5);
    const lines = doc.splitTextToSize(text, width);
    for (const line of lines) {
      y = clampY(y, pageHeight, doc);
      doc.text(line, x, y);
      y += 11;
    }
    y += opts?.spacing ?? 1;
  };

  for (const section of sections) {
    drawHeading(section.label);

    if (section.key === "summary") {
      drawText(r.summary, { size: 9.5, spacing: 3 });
      continue;
    }

    if (section.key === "experience") {
      for (const e of r.experience) {
        if (!e.company && !e.title && !e.bullets.length) continue;
        drawText([e.company, e.companySubtitle ?? ""].filter(Boolean).join(" — "), { bold: true });
        drawText([e.title, [e.location, e.dates].filter(Boolean).join(" | ")].filter(Boolean).join(" | "), { italic: true });
        for (const b of e.bullets) drawText(`• ${b}`, { indent: 12, spacing: 0 });
        y += 2;
      }
      continue;
    }

    if (section.key === "projects") {
      for (const p of r.projects) {
        if (!p.name && !p.subtitle && !p.techStack.length && !p.bullets.length) continue;
        drawText([p.name, p.subtitle].filter(Boolean).join(" — "), { bold: true });
        if (p.techStack.length) drawText(p.techStack.join(" • "), { italic: true });
        for (const b of p.bullets) drawText(`• ${b}`, { indent: 12, spacing: 0 });
        y += 2;
      }
      continue;
    }

    if (section.key === "education") {
      for (const e of r.education) {
        const f = formatEducationLine(e);
        drawText(f.schoolLine, { bold: true });
        drawText(f.degreeLine);
        if (f.gpaLine) drawText(f.gpaLine);
        for (const d of e.details) drawText(`• ${d}`, { indent: 12, spacing: 0 });
        y += 2;
      }
      continue;
    }

    for (const s of r.skills) {
      if (!s.category && !s.items.length) continue;
      drawText(`${s.category || "Skills"}: ${s.items.join(", ")}`);
    }
  }

  doc.save(`${base}.pdf`);
}
