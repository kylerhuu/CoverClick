import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { StructuredResume } from "./types";
import { sanitizeExportBasename } from "./utils";

const BODY_FONT = "Calibri" as const;
const BODY_SIZE = 22 as const; // 11pt
const NAME_SIZE = 32 as const; // 16pt
const SECTION_AFTER = 60;
const BLOCK_AFTER = 100;

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function bodyRun(text: string, opts?: { bold?: boolean; size?: number }): TextRun {
  return new TextRun({
    text: text.trim() || " ",
    font: BODY_FONT,
    size: opts?.size ?? BODY_SIZE,
    bold: opts?.bold,
  });
}

/** ALL CAPS section title with a horizontal rule underneath (ATS-friendly). */
function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 200, after: SECTION_AFTER },
    border: {
      bottom: {
        color: "404040",
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        font: BODY_FONT,
        size: BODY_SIZE,
        characterSpacing: 40,
      }),
    ],
  });
}

function bodyParagraph(text: string, after = BLOCK_AFTER): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after, line: 276 },
    children: [bodyRun(text)],
  });
}

function bulletParagraph(text: string, after = 50): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after, line: 276 },
    indent: { left: 360, hanging: 180 },
    children: [bodyRun(`• ${text.replace(/^\s*[-•]\s*/, "")}`)],
  });
}

function roleLine(title: string, company: string): Paragraph {
  const left = title.trim();
  const right = company.trim();
  const text = left && right ? `${left} — ${right}` : left || right;
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 80, after: 40 },
    children: [bodyRun(text, { bold: true })],
  });
}

function metaLine(parts: string[]): Paragraph | null {
  const text = parts.map((p) => p.trim()).filter(Boolean).join("  |  ");
  if (!text) return null;
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 50 },
    children: [new TextRun({ text, font: BODY_FONT, size: 20, italics: true })],
  });
}

export async function downloadResumeDocx(resume: StructuredResume, fileBaseName: string): Promise<void> {
  const base = sanitizeExportBasename(fileBaseName || "CoverClick_Resume", "CoverClick_Resume");
  const children: Paragraph[] = [];

  const name = resume.contact.fullName.trim() || "Candidate Name";
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: name, bold: true, font: BODY_FONT, size: NAME_SIZE })],
    }),
  );

  const contactParts = [
    resume.contact.email.trim(),
    resume.contact.phone.trim(),
    resume.contact.location.trim(),
    ...resume.contact.links,
    ...resume.links,
  ].filter(Boolean);
  if (contactParts.length) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: contactParts.join("  |  "), font: BODY_FONT, size: 20 })],
      }),
    );
  }

  if (resume.summary.trim()) {
    children.push(sectionHeading("Summary"), bodyParagraph(resume.summary, 120));
  }

  if (resume.experience.length) {
    children.push(sectionHeading("Experience"));
    for (const e of resume.experience) {
      if (!e.title.trim() && !e.company.trim() && !e.bullets.length) continue;
      children.push(roleLine(e.title, e.company));
      const meta = metaLine([e.location, e.dates]);
      if (meta) children.push(meta);
      for (const b of e.bullets.slice(0, 6)) children.push(bulletParagraph(b));
    }
  }

  if (resume.projects.length) {
    children.push(sectionHeading("Projects"));
    for (const p of resume.projects) {
      if (!p.name.trim() && !p.role.trim() && !p.bullets.length) continue;
      children.push(roleLine(p.role || p.name, p.role ? p.name : ""));
      const meta = metaLine([p.dates]);
      if (meta) children.push(meta);
      for (const b of p.bullets.slice(0, 5)) children.push(bulletParagraph(b));
    }
  }

  if (resume.education.length) {
    children.push(sectionHeading("Education"));
    for (const e of resume.education) {
      const line = [e.school, e.degree].filter(Boolean).join(" — ");
      if (line) children.push(bodyParagraph(line, 40));
      const dates = metaLine([e.dates]);
      if (dates) children.push(dates);
      for (const d of e.details.slice(0, 3)) children.push(bulletParagraph(d));
    }
  }

  if (resume.skills.length) {
    children.push(sectionHeading("Skills"));
    for (const s of resume.skills) {
      const label = s.category.trim();
      const items = s.items.join(", ");
      if (!items) continue;
      children.push(bodyParagraph(label ? `${label}: ${items}` : items, 60));
    }
  }

  if (resume.certifications.length) {
    children.push(sectionHeading("Certifications"));
    children.push(bodyParagraph(resume.certifications.join(" · "), 80));
  }

  if (resume.leadership.length) {
    children.push(sectionHeading("Leadership"));
    children.push(bodyParagraph(resume.leadership.join(" · "), 80));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${base}.docx`);
}
