import { AlignmentType, BorderStyle, Document, Packer, Paragraph, TextRun } from "docx";
import type { StructuredResume } from "./types";
import { formatContactLine, formatEducationLine, getVisibleResumeSections, normalizeResumeForRender } from "./resumeRender";
import { sanitizeExportBasename } from "./utils";

const BODY_FONT = "Calibri" as const;
const BODY_SIZE = 22 as const;
const NAME_SIZE = 32 as const;

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function run(text: string, opts?: { bold?: boolean; size?: number; italics?: boolean }): TextRun {
  return new TextRun({
    text: text.trim() || " ",
    font: BODY_FONT,
    size: opts?.size ?? BODY_SIZE,
    bold: opts?.bold,
    italics: opts?.italics,
  });
}

function heading(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 220, after: 60 },
    border: {
      bottom: {
        color: "404040",
        style: BorderStyle.SINGLE,
        size: 4,
        space: 1,
      },
    },
    children: [new TextRun({ text, font: BODY_FONT, size: BODY_SIZE, bold: true, characterSpacing: 40 })],
  });
}

function line(text: string, after = 60, bold = false, italics = false): Paragraph {
  return new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after, line: 276 }, children: [run(text, { bold, italics })] });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 36, line: 276 },
    indent: { left: 360, hanging: 180 },
    children: [run(`• ${text.replace(/^\s*[-•]\s*/, "")}`)],
  });
}

export async function downloadResumeDocx(resume: StructuredResume, fileBaseName: string): Promise<void> {
  const base = sanitizeExportBasename(fileBaseName || "CoverClick_Resume", "CoverClick_Resume");
  const r = normalizeResumeForRender(resume);
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 70 },
      children: [new TextRun({ text: r.contact.fullName || "Candidate Name", font: BODY_FONT, size: NAME_SIZE, bold: true })],
    }),
  );

  const contact = formatContactLine(r);
  if (contact) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 150 },
        children: [new TextRun({ text: contact, font: BODY_FONT, size: 20 })],
      }),
    );
  }

  const sections = getVisibleResumeSections(r);
  for (const section of sections) {
    if (section.key === "summary") {
      children.push(heading(section.label), line(r.summary, 76));
      continue;
    }

    if (section.key === "experience") {
      children.push(heading(section.label));
      for (const e of r.experience) {
        if (!e.company && !e.title && !e.bullets.length) continue;
        const top = [e.company, e.companySubtitle ?? ""].filter(Boolean).join(" — ");
        if (top) children.push(line(top, 24, true));
        const meta = [e.title, [e.location, e.dates].filter(Boolean).join(" | ")].filter(Boolean).join(" | ");
        if (meta) children.push(line(meta, 28, false, true));
        for (const b of e.bullets) children.push(bullet(b));
      }
      continue;
    }

    if (section.key === "projects") {
      children.push(heading(section.label));
      for (const p of r.projects) {
        if (!p.name && !p.subtitle && !p.techStack.length && !p.bullets.length) continue;
        const title = [p.name, p.subtitle].filter(Boolean).join(" — ");
        if (title) children.push(line(title, 24, true));
        if (p.techStack.length) children.push(line(p.techStack.join(" • "), 28, false, true));
        for (const b of p.bullets) children.push(bullet(b));
      }
      continue;
    }

    if (section.key === "education") {
      children.push(heading(section.label));
      for (const e of r.education) {
        const f = formatEducationLine(e);
        if (f.schoolLine) children.push(line(f.schoolLine, 24, true));
        if (f.degreeLine) children.push(line(f.degreeLine, 24));
        if (f.gpaLine) children.push(line(f.gpaLine, 24));
        for (const d of e.details) children.push(bullet(d));
      }
      continue;
    }

    children.push(heading(section.label));
    for (const s of r.skills) {
      if (!s.category && !s.items.length) continue;
      children.push(line(`${s.category || "Skills"}: ${s.items.join(", ")}`, 30));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { width: 12240, height: 15840 }, margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${base}.docx`);
}
