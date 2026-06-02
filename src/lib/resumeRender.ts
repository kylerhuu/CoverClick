import type { ResumeEducationItem, ResumeSectionKey, StructuredResume } from "./types";

export type ResumeSectionRender = {
  key: ResumeSectionKey;
  label: string;
};

export type ResumeEducationBlock = {
  schoolLine: string;
  degreeLine: string;
  majorLine: string;
  gpaLine: string;
};

export type ResumeSpacingProfile = "comfortable" | "balanced" | "compact";

export type ResumeSpacingTokens = {
  profile: ResumeSpacingProfile;
  sectionGap: number;
  sectionHeaderAfter: number;
  entryGap: number;
  subLineGap: number;
  bulletGap: number;
  bulletLineHeight: number;
  contactGap: number;
};


export type ResumeTypographyTokens = {
  namePt: number;
  contactPt: number;
  sectionHeaderPt: number;
  primaryLinePt: number;
  secondaryLinePt: number;
  bulletPt: number;
};

export type ResumeRenderModel = {
  templateVersion: "resume-template-v2";
  resume: StructuredResume;
  sections: ResumeSectionRender[];
  spacing: ResumeSpacingTokens;
  typography: ResumeTypographyTokens;
};

export const RESUME_TEMPLATE_VERSION = "resume-template-v2" as const;
export const RESUME_EXPORT_CONTAINER_ID = "resume-container" as const;

const SECTION_LABELS: Record<ResumeSectionKey, string> = {
  summary: "SUMMARY",
  experience: "EXPERIENCE",
  projects: "PROJECTS",
  education: "EDUCATION",
  skills: "SKILLS",
};

function trim(v: string): string {
  return v.trim();
}

/** Collapse OCR-like letter-separated text: "T o o k  p r o d u c t" -> "Took product". */
export function cleanupSpacedLetters(input: string): string {
  const text = input.replace(/\s+/g, " ").trim();
  if (!text) return "";
  const tokenCount = text.split(" ").length;
  if (tokenCount < 6) return text;

  const lettersOnly = text.match(/^[A-Za-z](?:\s+[A-Za-z])+(?:\s{2,}[A-Za-z](?:\s+[A-Za-z])+)*$/);
  if (!lettersOnly) return text;

  const phraseParts = text.split(/\s{2,}/).map((chunk) => chunk.replace(/\s+/g, ""));
  return phraseParts.join(" ").trim();
}

function sanitizeLines(lines: string[]): string[] {
  return lines.map((s) => cleanupSpacedLetters(trim(s))).filter(Boolean);
}

export function normalizeResumeForRender(resume: StructuredResume): StructuredResume {
  return {
    ...resume,
    contact: {
      ...resume.contact,
      fullName: cleanupSpacedLetters(trim(resume.contact.fullName)),
      email: trim(resume.contact.email),
      phone: trim(resume.contact.phone),
      location: cleanupSpacedLetters(trim(resume.contact.location)),
      links: sanitizeLines(resume.contact.links),
    },
    summary: cleanupSpacedLetters(trim(resume.summary)),
    links: sanitizeLines(resume.links),
    experience: resume.experience.map((e) => ({
      ...e,
      company: cleanupSpacedLetters(trim(e.company)),
      companySubtitle: cleanupSpacedLetters(trim(e.companySubtitle ?? "")),
      title: cleanupSpacedLetters(trim(e.title)),
      dates: trim(e.dates),
      location: cleanupSpacedLetters(trim(e.location)),
      bullets: sanitizeLines(e.bullets),
    })),
    projects: resume.projects.map((p) => ({
      ...p,
      name: cleanupSpacedLetters(trim(p.name)),
      subtitle: cleanupSpacedLetters(trim(p.subtitle)),
      techStack: sanitizeLines(p.techStack),
      bullets: sanitizeLines(p.bullets),
    })),
    education: resume.education.map((e) => ({
      ...e,
      school: cleanupSpacedLetters(trim(e.school)),
      degree: cleanupSpacedLetters(trim(e.degree)),
      major: cleanupSpacedLetters(trim(e.major)),
      concentrationOrMinor: cleanupSpacedLetters(trim(e.concentrationOrMinor ?? "")),
      gpa: trim(e.gpa ?? ""),
      graduationDate: trim(e.graduationDate),
      details: sanitizeLines(e.details),
    })),
    skills: resume.skills.map((s) => ({
      ...s,
      category: cleanupSpacedLetters(trim(s.category)),
      items: sanitizeLines(s.items),
    })),
  };
}

export function formatContactLine(resume: StructuredResume): string {
  return [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.location,
    ...resume.contact.links,
    ...resume.links,
  ]
    .map(trim)
    .filter(Boolean)
    .join("  |  ");
}

export function formatEducationBlock(entry: ResumeEducationItem): ResumeEducationBlock {
  const schoolLine = [entry.school, entry.graduationDate ? `Expected Graduation: ${entry.graduationDate}` : ""]
    .map(trim)
    .filter(Boolean)
    .join("        ");

  const degreeLine = trim(entry.degree);

  const majorPieces = [entry.major, entry.concentrationOrMinor ?? ""]
    .map(trim)
    .filter(Boolean);
  const majorLine = majorPieces.join(" | ");

  const gpaLine = trim(entry.gpa ?? "") ? `GPA: ${trim(entry.gpa ?? "")}` : "";

  return { schoolLine, degreeLine, majorLine, gpaLine };
}

export function formatExperiencePrimary(company: string, companySubtitle?: string): string {
  return [trim(company), trim(companySubtitle ?? "")].filter(Boolean).join(" — ");
}

export function formatExperienceSecondary(title: string, location: string, dates: string): string {
  const trailing = [trim(location), trim(dates)].filter(Boolean).join(" | ");
  return [trim(title), trailing].filter(Boolean).join(" | ");
}

export function formatProjectPrimary(name: string, subtitle: string): string {
  return [trim(name), trim(subtitle)].filter(Boolean).join(" — ");
}

export function formatProjectSecondary(techStack: string[]): string {
  return techStack.map(trim).filter(Boolean).join(" • ");
}

function hasSummary(resume: StructuredResume): boolean {
  return trim(resume.summary).length > 0;
}
function hasExperience(resume: StructuredResume): boolean {
  return resume.experience.some((x) => x.company || x.companySubtitle || x.title || x.dates || x.location || x.bullets.length > 0);
}
function hasProjects(resume: StructuredResume): boolean {
  return resume.projects.some((x) => x.name || x.subtitle || x.techStack.length > 0 || x.bullets.length > 0);
}
function hasEducation(resume: StructuredResume): boolean {
  return resume.education.some((x) => x.school || x.degree || x.major || x.graduationDate || x.details.length > 0 || (x.gpa ?? ""));
}
function hasSkills(resume: StructuredResume): boolean {
  return resume.skills.some((x) => x.category || x.items.length > 0);
}

export function getVisibleResumeSections(resume: StructuredResume): ResumeSectionRender[] {
  const normalized = normalizeResumeForRender(resume);
  const all: ResumeSectionKey[] = ["summary", "experience", "projects", "education", "skills"];
  return all
    .filter((k) => normalized.sectionSettings[k]?.isVisible !== false)
    .filter((k) => {
      if (k === "summary") return hasSummary(normalized);
      if (k === "experience") return hasExperience(normalized);
      if (k === "projects") return hasProjects(normalized);
      if (k === "education") return hasEducation(normalized);
      return hasSkills(normalized);
    })
    .sort((a, b) => (normalized.sectionSettings[a]?.order ?? 0) - (normalized.sectionSettings[b]?.order ?? 0))
    .map((k) => ({ key: k, label: SECTION_LABELS[k] }));
}

export function chooseResumeSpacingProfile(resume: StructuredResume): ResumeSpacingTokens {
  const r = normalizeResumeForRender(resume);
  const sections = getVisibleResumeSections(r);
  const entries = r.experience.length + r.projects.length + r.education.length + r.skills.length;
  const bullets = r.experience.reduce((n, e) => n + e.bullets.length, 0) +
    r.projects.reduce((n, p) => n + p.bullets.length, 0) +
    r.education.reduce((n, e) => n + e.details.length, 0);
  const summaryWords = r.summary ? r.summary.split(/\s+/).filter(Boolean).length : 0;

  const load = sections.length * 1.4 + entries * 0.9 + bullets * 0.45 + summaryWords / 55;

  if (load <= 11) {
    return {
      profile: "comfortable",
      sectionGap: 18,
      sectionHeaderAfter: 7,
      entryGap: 11,
      subLineGap: 5,
      bulletGap: 3,
      bulletLineHeight: 1.38,
      contactGap: 16,
    };
  }

  if (load >= 20) {
    return {
      profile: "compact",
      sectionGap: 11,
      sectionHeaderAfter: 4,
      entryGap: 6,
      subLineGap: 2,
      bulletGap: 1,
      bulletLineHeight: 1.26,
      contactGap: 9,
    };
  }

  return {
    profile: "balanced",
    sectionGap: 14,
    sectionHeaderAfter: 6,
    entryGap: 8,
    subLineGap: 3,
    bulletGap: 2,
    bulletLineHeight: 1.31,
    contactGap: 12,
  };
}


export function getResumeTypographyTokens(): ResumeTypographyTokens {
  return {
    namePt: 17,
    contactPt: 9,
    sectionHeaderPt: 9.5,
    primaryLinePt: 10,
    secondaryLinePt: 9.5,
    bulletPt: 10,
  };
}

export function getResumeRenderModel(resume: StructuredResume): ResumeRenderModel {
  const normalized = normalizeResumeForRender(resume);
  return {
    templateVersion: RESUME_TEMPLATE_VERSION,
    resume: normalized,
    sections: getVisibleResumeSections(normalized),
    spacing: chooseResumeSpacingProfile(normalized),
    typography: getResumeTypographyTokens(),
  };
}
