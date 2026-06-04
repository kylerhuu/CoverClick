import { AlignmentType, BorderStyle, Document, Packer, Paragraph, TextRun } from "docx";
import type { StructuredResume } from "./types";
import { experienceEntryKey, projectEntryKey } from "./resumeLayoutEngine";
import {
  exportDisplayText,
  formatContactLine,
  formatEducationBlock,
  formatExperiencePrimary,
  formatExperienceSecondary,
  formatProjectPrimary,
  formatProjectSecondary,
  formatSkillRenderLines,
  getResumeRenderModel,
  type ResumeRenderOptions,
} from "./resumeRender";
import { sanitizeExportBasename } from "./utils";

const BODY_FONT = "Calibri" as const;

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function run(text: string, opts?: { bold?: boolean; size?: number; color?: string }): TextRun {
  return new TextRun({
    text: text.trim() || " ",
    font: BODY_FONT,
    size: opts?.size ?? 20,
    bold: opts?.bold,
    color: opts?.color,
  });
}

function heading(text: string, before: number, after: number): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before, after },
    border: {
      bottom: {
        color: "5B6470",
        style: BorderStyle.SINGLE,
        size: 4,
        space: 1,
      },
    },
    // no characterSpacing to avoid spaced-out letters bug
    children: [new TextRun({ text, font: BODY_FONT, size: 19, bold: true, color: "374151" })],
  });
}

function line(text: string, after: number, size: number, bold = false, secondary = false): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after, line: 258 },
    children: [run(text, { bold, size, color: secondary ? "4B5563" : "111827" })],
  });
}

function bullet(text: string, after: number, size: number): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after, line: 252 },
    indent: { left: 320, hanging: 170 },
    children: [run(`• ${text.replace(/^\s*[-•]\s*/, "")}`, { size, color: "111827" })],
  });
}

export async function downloadResumeDocx(
  resume: StructuredResume,
  fileBaseName: string,
  renderOptions?: ResumeRenderOptions,
): Promise<void> {
  const base = sanitizeExportBasename(fileBaseName || "CoverClick_Resume", "CoverClick_Resume");
  const model = getResumeRenderModel(resume, renderOptions);
  const r = model.resume;
  const overrides = renderOptions?.finalExportOverrides;
  const spacing = model.spacing;
  const typography = model.typography;
  const sections = model.sections;
  const toHalfPt = (pt: number) => Math.round(pt * 2);
  if (import.meta.env.DEV) {
    console.debug("[resume-export] formatting version: resume-template-v2", { target: "docx" });
  }
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 46 },
      children: [new TextRun({ text: r.contact.fullName || "Candidate Name", font: BODY_FONT, size: toHalfPt(typography.namePt), bold: true, color: "0F172A" })],
    }),
  );

  const contact = exportDisplayText(overrides, "contact:line", formatContactLine(r));
  if (contact) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: spacing.contactGap * 8 },
        children: [new TextRun({ text: contact, font: BODY_FONT, size: toHalfPt(typography.contactPt), color: "334155" })],
      }),
    );
  }

  for (const section of sections) {
    const headerBefore = spacing.sectionGap * 10;
    const headerAfter = spacing.sectionHeaderAfter * 8;

    if (section.key === "summary") {
      const summaryText = exportDisplayText(overrides, "summary", r.summary);
      children.push(heading(section.label, headerBefore, headerAfter), line(summaryText, spacing.entryGap * 6, toHalfPt(typography.primaryLinePt)));
      continue;
    }

    if (section.key === "experience") {
      children.push(heading(section.label, headerBefore, headerAfter));
      for (const [i, e] of r.experience.entries()) {
        if (!e.company && !e.title && !e.bullets.length) continue;
        const ek = experienceEntryKey(e, i);
        const primary = exportDisplayText(overrides, `${ek}:primary`, formatExperiencePrimary(e.company, e.companySubtitle));
        if (primary) children.push(line(primary, Math.max(10, spacing.subLineGap * 5), toHalfPt(typography.primaryLinePt), true));
        const secondary = exportDisplayText(overrides, `${ek}:secondary`, formatExperienceSecondary(e.title, e.location, e.dates));
        if (secondary) children.push(line(secondary, Math.max(8, spacing.subLineGap * 4), toHalfPt(typography.secondaryLinePt), false, true));
        for (const [bi, b] of e.bullets.entries()) {
          const bulletText = exportDisplayText(overrides, `${ek}:bullet:${bi}`, b);
          if (bulletText.trim()) children.push(bullet(bulletText, Math.max(10, spacing.bulletGap * 4), toHalfPt(typography.bulletPt)));
        }
        children.push(new Paragraph({ spacing: { after: Math.max(14, spacing.entryGap * 6) }, children: [run(" ")] }));
      }
      continue;
    }

    if (section.key === "projects") {
      children.push(heading(section.label, headerBefore, headerAfter));
      for (const [i, p] of r.projects.entries()) {
        if (!p.name && !p.subtitle && !p.techStack.length && !p.bullets.length) continue;
        const pk = projectEntryKey(p, i);
        const primary = exportDisplayText(overrides, `${pk}:primary`, formatProjectPrimary(p.name, p.subtitle));
        if (primary) children.push(line(primary, Math.max(10, spacing.subLineGap * 5), toHalfPt(typography.primaryLinePt), true));
        const secondary = exportDisplayText(overrides, `${pk}:secondary`, formatProjectSecondary(p.techStack));
        if (secondary) children.push(line(secondary, Math.max(8, spacing.subLineGap * 4), toHalfPt(typography.secondaryLinePt), false, true));
        for (const [bi, b] of p.bullets.entries()) {
          const bulletText = exportDisplayText(overrides, `${pk}:bullet:${bi}`, b);
          if (bulletText.trim()) children.push(bullet(bulletText, Math.max(10, spacing.bulletGap * 4), toHalfPt(typography.bulletPt)));
        }
        children.push(new Paragraph({ spacing: { after: Math.max(14, spacing.entryGap * 6) }, children: [run(" ")] }));
      }
      continue;
    }

    if (section.key === "education") {
      children.push(heading(section.label, headerBefore, headerAfter));
      for (const [i, e] of r.education.entries()) {
        const f = formatEducationBlock(e);
        const id = e.id ?? `edu-${i}`;
        const prefix = `education:${id}`;
        const school = exportDisplayText(overrides, `${prefix}:school`, f.schoolLine);
        const degree = exportDisplayText(overrides, `${prefix}:degree`, f.degreeLine);
        const major = exportDisplayText(overrides, `${prefix}:major`, f.majorLine);
        const gpa = exportDisplayText(overrides, `${prefix}:gpa`, f.gpaLine);
        if (school) children.push(line(school, Math.max(10, spacing.subLineGap * 5), toHalfPt(typography.primaryLinePt), true));
        if (degree) children.push(line(degree, Math.max(8, spacing.subLineGap * 4), toHalfPt(typography.secondaryLinePt)));
        if (major) children.push(line(major, Math.max(8, spacing.subLineGap * 4), toHalfPt(typography.secondaryLinePt)));
        if (gpa) children.push(line(gpa, Math.max(8, spacing.subLineGap * 4), toHalfPt(typography.secondaryLinePt)));
        for (const [di, d] of e.details.entries()) {
          const detailText = exportDisplayText(overrides, `${prefix}:detail:${di}`, d);
          if (detailText.trim()) children.push(bullet(detailText, Math.max(10, spacing.bulletGap * 4), toHalfPt(typography.bulletPt)));
        }
        children.push(new Paragraph({ spacing: { after: Math.max(14, spacing.entryGap * 6) }, children: [run(" ")] }));
      }
      continue;
    }

    children.push(heading(section.label, headerBefore, headerAfter));
    for (const skillLine of formatSkillRenderLines(r, model.layout.renderPlan)) {
      const skillText = exportDisplayText(overrides, `skills:${skillLine.key}`, skillLine.text);
      if (skillText.trim()) children.push(line(skillText, Math.max(8, spacing.bulletGap * 4), toHalfPt(typography.bulletPt)));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { width: 12240, height: 15840 }, margin: { top: 720, right: 780, bottom: 720, left: 780 } },
        },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${base}.docx`);
}
