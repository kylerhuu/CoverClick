import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import type { StructuredResume } from "./types";
import { sanitizeExportBasename } from "./utils";

const RUN = { font: "Calibri" as const, size: 22 as const };

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function heading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 220, after: 120 },
    children: [new TextRun({ text, bold: true, ...RUN })],
  });
}

function line(text: string, after = 80): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after, line: 276 },
    children: [new TextRun({ text: text.trim() || " ", ...RUN })],
  });
}

export async function downloadResumeDocx(resume: StructuredResume, fileBaseName: string): Promise<void> {
  const base = sanitizeExportBasename(fileBaseName || "CoverClick_Resume", "CoverClick_Resume");
  const children: Paragraph[] = [];
  const name = resume.contact.fullName.trim() || "Candidate Name";
  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: name, bold: true, size: 30, font: "Calibri" })],
    }),
  );
  const contactLine = [
    resume.contact.email.trim(),
    resume.contact.phone.trim(),
    resume.contact.location.trim(),
    ...resume.contact.links,
    ...resume.links,
  ]
    .filter(Boolean)
    .join(" | ");
  if (contactLine) children.push(line(contactLine, 220));

  if (resume.summary.trim()) {
    children.push(heading("SUMMARY"), line(resume.summary, 100));
  }

  if (resume.experience.length) {
    children.push(heading("EXPERIENCE"));
    for (const e of resume.experience) {
      children.push(line(`${e.title} | ${e.company}`.replace(/^\s*\|\s*|\s*\|\s*$/g, ""), 30));
      const meta = [e.location, e.dates].filter(Boolean).join(" | ");
      if (meta) children.push(line(meta, 30));
      for (const b of e.bullets.slice(0, 4)) children.push(line(`• ${b}`, 40));
    }
  }

  if (resume.projects.length) {
    children.push(heading("PROJECTS"));
    for (const p of resume.projects) {
      children.push(line([p.name, p.role].filter(Boolean).join(" | "), 30));
      if (p.dates) children.push(line(p.dates, 30));
      for (const b of p.bullets.slice(0, 3)) children.push(line(`• ${b}`, 40));
    }
  }

  if (resume.education.length) {
    children.push(heading("EDUCATION"));
    for (const e of resume.education) {
      children.push(line([e.school, e.degree].filter(Boolean).join(" | "), 30));
      if (e.dates) children.push(line(e.dates, 30));
      for (const d of e.details.slice(0, 2)) children.push(line(`• ${d}`, 40));
    }
  }

  if (resume.skills.length) {
    children.push(heading("SKILLS"));
    for (const s of resume.skills) {
      children.push(line(`${s.category}: ${s.items.join(", ")}`.replace(/^:\s*/, ""), 40));
    }
  }

  if (resume.certifications.length) children.push(heading("CERTIFICATIONS"), line(resume.certifications.join(" | "), 40));
  if (resume.leadership.length) children.push(heading("LEADERSHIP"), line(resume.leadership.join(" | "), 40));

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${base}.docx`);
}
