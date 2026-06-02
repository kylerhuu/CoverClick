import jsPDF from "jspdf";
import type { StructuredResume } from "./types";
import {
  formatContactLine,
  formatEducationBlock,
  formatExperiencePrimary,
  formatExperienceSecondary,
  formatProjectPrimary,
  formatProjectSecondary,
  getResumeRenderModel,
} from "./resumeRender";
import { sanitizeExportBasename } from "./utils";

function clampY(y: number, pageHeight: number, doc: jsPDF): number {
  if (y <= pageHeight - 14) return y;
  doc.addPage();
  return 18;
}

export async function downloadResumePdf(resume: StructuredResume, fileBaseName: string): Promise<void> {
  const base = sanitizeExportBasename(fileBaseName || "CoverClick_Resume", "CoverClick_Resume");
  const model = getResumeRenderModel(resume);
  const r = model.resume;
  const spacing = model.spacing;
  const typography = model.typography;
  if (import.meta.env.DEV) {
    console.debug("[resume-export] formatting version: resume-template-v2", { target: "pdf" });
  }

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54;
  const contentWidth = pageWidth - margin * 2;

  let y = 34;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(typography.namePt);
  doc.text(r.contact.fullName || "Candidate Name", pageWidth / 2, y, { align: "center" });
  y += 16;

  const contact = formatContactLine(r);
  if (contact) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(typography.sectionHeaderPt);
    doc.text(contact, pageWidth / 2, y, { align: "center" });
    y += Math.max(12, spacing.contactGap);
  }

  const sections = model.sections;

  const drawHeading = (label: string) => {
    y = clampY(y, pageHeight, doc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(typography.contactPt);
    doc.text(label.toUpperCase(), margin, y);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 3, margin + contentWidth, y + 3);
    y += Math.max(10, spacing.sectionHeaderAfter + 8);
  };

  const drawText = (text: string, opts?: { bold?: boolean; italic?: boolean; size?: number; indent?: number; spacing?: number; lineHeight?: number }) => {
    if (!text.trim()) return;
    y = clampY(y, pageHeight, doc);
    const indent = opts?.indent ?? 0;
    const x = margin + indent;
    const width = contentWidth - indent;
    doc.setFont("helvetica", opts?.bold ? "bold" : opts?.italic ? "italic" : "normal");
    doc.setFontSize(opts?.size ?? typography.bulletPt);
    const lines = doc.splitTextToSize(text, width);
    for (const line of lines) {
      y = clampY(y, pageHeight, doc);
      doc.text(line, x, y);
      y += opts?.lineHeight ?? Math.max(10, spacing.bulletLineHeight * 8);
    }
    y += opts?.spacing ?? Math.max(1, spacing.bulletGap);
  };

  for (const section of sections) {
    drawHeading(section.label);

    if (section.key === "summary") {
      drawText(r.summary, { size: typography.primaryLinePt, spacing: spacing.entryGap, lineHeight: spacing.bulletLineHeight * 8 });
      continue;
    }

    if (section.key === "experience") {
      for (const e of r.experience) {
        if (!e.company && !e.title && !e.bullets.length) continue;
        const primary = formatExperiencePrimary(e.company, e.companySubtitle);
        const secondary = formatExperienceSecondary(e.title, e.location, e.dates);
        if (primary) drawText(primary, { bold: true, size: typography.primaryLinePt, spacing: Math.max(1, spacing.subLineGap) });
        if (secondary) drawText(secondary, { italic: true, size: typography.secondaryLinePt, spacing: Math.max(1, spacing.subLineGap) });
        for (const b of e.bullets) drawText(`• ${b}`, { indent: 12, spacing: spacing.bulletGap, size: typography.bulletPt, lineHeight: spacing.bulletLineHeight * 8 });
        y += spacing.entryGap;
      }
      continue;
    }

    if (section.key === "projects") {
      for (const p of r.projects) {
        if (!p.name && !p.subtitle && !p.techStack.length && !p.bullets.length) continue;
        const primary = formatProjectPrimary(p.name, p.subtitle);
        const secondary = formatProjectSecondary(p.techStack);
        if (primary) drawText(primary, { bold: true, size: typography.primaryLinePt, spacing: Math.max(1, spacing.subLineGap) });
        if (secondary) drawText(secondary, { italic: true, size: typography.secondaryLinePt, spacing: Math.max(1, spacing.subLineGap - 1) });
        for (const b of p.bullets) drawText(`• ${b}`, { indent: 12, spacing: spacing.bulletGap, size: typography.bulletPt, lineHeight: spacing.bulletLineHeight * 8 });
        y += spacing.entryGap;
      }
      continue;
    }

    if (section.key === "education") {
      for (const e of r.education) {
        const f = formatEducationBlock(e);
        drawText(f.schoolLine, { bold: true, size: typography.primaryLinePt, spacing: Math.max(1, spacing.subLineGap) });
        drawText(f.degreeLine, { size: typography.secondaryLinePt, spacing: Math.max(1, spacing.subLineGap) });
        if (f.majorLine) drawText(f.majorLine, { size: typography.secondaryLinePt, spacing: Math.max(1, spacing.subLineGap - 1) });
        if (f.gpaLine) drawText(f.gpaLine, { size: typography.secondaryLinePt, spacing: Math.max(1, spacing.subLineGap - 1) });
        for (const d of e.details) drawText(`• ${d}`, { indent: 12, spacing: spacing.bulletGap, size: typography.bulletPt, lineHeight: spacing.bulletLineHeight * 8 });
        y += spacing.entryGap;
      }
      continue;
    }

    for (const s of r.skills) {
      if (!s.category && !s.items.length) continue;
      drawText(`${s.category || "Skills"}: ${s.items.join(", ")}`, { size: typography.bulletPt, spacing: Math.max(1, spacing.bulletGap), lineHeight: spacing.bulletLineHeight * 8 });
    }
  }

  doc.save(`${base}.pdf`);
}
