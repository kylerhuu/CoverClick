import { AlignmentType, BorderStyle, Document, Packer, Paragraph, TextRun } from "docx";
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

export async function downloadResumeDocx(resume: StructuredResume, fileBaseName: string): Promise<void> {
  const base = sanitizeExportBasename(fileBaseName || "CoverClick_Resume", "CoverClick_Resume");
  const model = getResumeRenderModel(resume);
  const r = model.resume;
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

  const contact = formatContactLine(r);
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
      children.push(heading(section.label, headerBefore, headerAfter), line(r.summary, spacing.entryGap * 6, toHalfPt(typography.primaryLinePt)));
      continue;
    }

    if (section.key === "experience") {
      children.push(heading(section.label, headerBefore, headerAfter));
      for (const e of r.experience) {
        if (!e.company && !e.title && !e.bullets.length) continue;
        const primary = formatExperiencePrimary(e.company, e.companySubtitle);
        if (primary) children.push(line(primary, Math.max(10, spacing.subLineGap * 5), toHalfPt(typography.primaryLinePt), true));
        const secondary = formatExperienceSecondary(e.title, e.location, e.dates);
        if (secondary) children.push(line(secondary, Math.max(8, spacing.subLineGap * 4), toHalfPt(typography.secondaryLinePt), false, true));
        for (const b of e.bullets) children.push(bullet(b, Math.max(10, spacing.bulletGap * 4), toHalfPt(typography.bulletPt)));
        children.push(new Paragraph({ spacing: { after: Math.max(14, spacing.entryGap * 6) }, children: [run(" ")] }));
      }
      continue;
    }

    if (section.key === "projects") {
      children.push(heading(section.label, headerBefore, headerAfter));
      for (const p of r.projects) {
        if (!p.name && !p.subtitle && !p.techStack.length && !p.bullets.length) continue;
        const primary = formatProjectPrimary(p.name, p.subtitle);
        if (primary) children.push(line(primary, Math.max(10, spacing.subLineGap * 5), toHalfPt(typography.primaryLinePt), true));
        const secondary = formatProjectSecondary(p.techStack);
        if (secondary) children.push(line(secondary, Math.max(8, spacing.subLineGap * 4), toHalfPt(typography.secondaryLinePt), false, true));
        for (const b of p.bullets) children.push(bullet(b, Math.max(10, spacing.bulletGap * 4), toHalfPt(typography.bulletPt)));
        children.push(new Paragraph({ spacing: { after: Math.max(14, spacing.entryGap * 6) }, children: [run(" ")] }));
      }
      continue;
    }

    if (section.key === "education") {
      children.push(heading(section.label, headerBefore, headerAfter));
      for (const e of r.education) {
        const f = formatEducationBlock(e);
        if (f.schoolLine) children.push(line(f.schoolLine, Math.max(10, spacing.subLineGap * 5), toHalfPt(typography.primaryLinePt), true));
        if (f.degreeLine) children.push(line(f.degreeLine, Math.max(8, spacing.subLineGap * 4), toHalfPt(typography.secondaryLinePt)));
        if (f.majorLine) children.push(line(f.majorLine, Math.max(8, spacing.subLineGap * 4), toHalfPt(typography.secondaryLinePt)));
        if (f.gpaLine) children.push(line(f.gpaLine, Math.max(8, spacing.subLineGap * 4), toHalfPt(typography.secondaryLinePt)));
        for (const d of e.details) children.push(bullet(d, Math.max(10, spacing.bulletGap * 4), toHalfPt(typography.bulletPt)));
        children.push(new Paragraph({ spacing: { after: Math.max(14, spacing.entryGap * 6) }, children: [run(" ")] }));
      }
      continue;
    }

    children.push(heading(section.label, headerBefore, headerAfter));
    for (const s of r.skills) {
      if (!s.category && !s.items.length) continue;
      children.push(line(`${s.category || "Skills"}: ${s.items.join(", ")}`, Math.max(8, spacing.bulletGap * 4), toHalfPt(typography.bulletPt)));
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
