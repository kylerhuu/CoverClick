import { AlignmentType, BorderStyle, Document, Packer, Paragraph, TextRun } from "docx";
import type { ResumeSectionKey, StructuredResume } from "./types";
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
        size: 6,
        space: 1,
      },
    },
    children: [new TextRun({ text: text.toUpperCase(), font: BODY_FONT, size: BODY_SIZE, bold: true, characterSpacing: 40 })],
  });
}

function line(text: string, after = 60, bold = false, italics = false): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after, line: 276 },
    children: [run(text, { bold, italics })],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 40, line: 276 },
    indent: { left: 360, hanging: 180 },
    children: [run(`• ${text.replace(/^\s*[-•]\s*/, "")}`)],
  });
}

function hasSummary(resume: StructuredResume): boolean {
  return resume.summary.trim().length > 0;
}

function hasExperience(resume: StructuredResume): boolean {
  return resume.experience.some((x) => x.company.trim() || x.title.trim() || x.bullets.length);
}

function hasProjects(resume: StructuredResume): boolean {
  return resume.projects.some((x) => x.name.trim() || x.subtitle.trim() || x.techStack.length || x.bullets.length);
}

function hasEducation(resume: StructuredResume): boolean {
  return resume.education.some((x) => x.school.trim() || x.degree.trim() || x.major.trim() || x.graduationDate.trim());
}

function hasSkills(resume: StructuredResume): boolean {
  return resume.skills.some((x) => x.category.trim() || x.items.length);
}

function visibleOrderedSections(resume: StructuredResume): ResumeSectionKey[] {
  const all: ResumeSectionKey[] = ["summary", "experience", "projects", "education", "skills"];
  return all
    .filter((k) => resume.sectionSettings[k]?.isVisible !== false)
    .filter((k) => {
      if (k === "summary") return hasSummary(resume);
      if (k === "experience") return hasExperience(resume);
      if (k === "projects") return hasProjects(resume);
      if (k === "education") return hasEducation(resume);
      return hasSkills(resume);
    })
    .sort((a, b) => (resume.sectionSettings[a]?.order ?? 0) - (resume.sectionSettings[b]?.order ?? 0));
}

export async function downloadResumeDocx(resume: StructuredResume, fileBaseName: string): Promise<void> {
  const base = sanitizeExportBasename(fileBaseName || "CoverClick_Resume", "CoverClick_Resume");
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: resume.contact.fullName.trim() || "Candidate Name", font: BODY_FONT, size: NAME_SIZE, bold: true })],
    }),
  );

  const contact = [
    resume.contact.email.trim(),
    resume.contact.phone.trim(),
    resume.contact.location.trim(),
    ...resume.contact.links,
    ...resume.links,
  ]
    .map((x) => x.trim())
    .filter(Boolean)
    .join("  |  ");
  if (contact) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [new TextRun({ text: contact, font: BODY_FONT, size: 20 })],
      }),
    );
  }

  for (const section of visibleOrderedSections(resume)) {
    if (section === "summary") {
      children.push(heading("Summary"), line(resume.summary, 80));
      continue;
    }

    if (section === "experience") {
      children.push(heading("Experience"));
      for (const e of resume.experience) {
        if (!e.company.trim() && !e.title.trim() && !e.bullets.length) continue;
        const header = [e.company.trim(), e.companySubtitle?.trim()].filter(Boolean).join(" — ");
        if (header) children.push(line(header, 30, true));
        const roleLine = [e.title.trim(), [e.location.trim(), e.dates.trim()].filter(Boolean).join(" | ")].filter(Boolean).join(" | ");
        if (roleLine) children.push(line(roleLine, 40, false, true));
        for (const b of e.bullets) children.push(bullet(b));
      }
      continue;
    }

    if (section === "projects") {
      children.push(heading("Projects"));
      for (const p of resume.projects) {
        if (!p.name.trim() && !p.subtitle.trim() && !p.techStack.length && !p.bullets.length) continue;
        const title = [p.name.trim(), p.subtitle.trim()].filter(Boolean).join(" — ");
        if (title) children.push(line(title, 30, true));
        if (p.techStack.length) children.push(line(p.techStack.join(" • "), 40, false, true));
        for (const b of p.bullets) children.push(bullet(b));
      }
      continue;
    }

    if (section === "education") {
      children.push(heading("Education"));
      for (const e of resume.education) {
        const schoolLine = [e.school.trim(), e.graduationDate.trim() ? `Expected Graduation: ${e.graduationDate.trim()}` : ""]
          .filter(Boolean)
          .join("        ");
        if (schoolLine) children.push(line(schoolLine, 30, true));
        const degreeLine = [e.degree.trim(), e.major.trim() ? `${e.major.trim()}` : "", (e.concentrationOrMinor ?? "").trim()]
          .filter(Boolean)
          .join(" | ");
        if (degreeLine) children.push(line(degreeLine, 30));
        if ((e.gpa ?? "").trim()) children.push(line(`GPA: ${e.gpa?.trim()}`, 40));
        for (const d of e.details) children.push(bullet(d));
      }
      continue;
    }

    children.push(heading("Skills"));
    for (const s of resume.skills) {
      if (!s.category.trim() && !s.items.length) continue;
      children.push(line(`${s.category.trim() || "Skills"}: ${s.items.join(", ")}`, 40));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${base}.docx`);
}
