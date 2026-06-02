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

export function normalizeResumeForRender(resume: StructuredResume): StructuredResume {
  return {
    ...resume,
    contact: {
      ...resume.contact,
      fullName: trim(resume.contact.fullName),
      email: trim(resume.contact.email),
      phone: trim(resume.contact.phone),
      location: trim(resume.contact.location),
      links: resume.contact.links.map(trim).filter(Boolean),
    },
    summary: trim(resume.summary),
    links: resume.links.map(trim).filter(Boolean),
    experience: resume.experience.map((e) => ({
      ...e,
      company: trim(e.company),
      companySubtitle: trim(e.companySubtitle ?? ""),
      title: trim(e.title),
      dates: trim(e.dates),
      location: trim(e.location),
      bullets: e.bullets.map(trim).filter(Boolean),
    })),
    projects: resume.projects.map((p) => ({
      ...p,
      name: trim(p.name),
      subtitle: trim(p.subtitle),
      techStack: p.techStack.map(trim).filter(Boolean),
      bullets: p.bullets.map(trim).filter(Boolean),
    })),
    education: resume.education.map((e) => ({
      ...e,
      school: trim(e.school),
      degree: trim(e.degree),
      major: trim(e.major),
      concentrationOrMinor: trim(e.concentrationOrMinor ?? ""),
      gpa: trim(e.gpa ?? ""),
      graduationDate: trim(e.graduationDate),
      details: e.details.map(trim).filter(Boolean),
    })),
    skills: resume.skills.map((s) => ({
      ...s,
      category: trim(s.category),
      items: s.items.map(trim).filter(Boolean),
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

export function formatEducationLine(entry: ResumeEducationItem): {
  schoolLine: string;
  degreeLine: string;
  gpaLine: string;
} {
  const b = formatEducationBlock(entry);
  const degreeLine = [b.degreeLine, b.majorLine].filter(Boolean).join(" | ");
  return { schoolLine: b.schoolLine, degreeLine, gpaLine: b.gpaLine };
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
