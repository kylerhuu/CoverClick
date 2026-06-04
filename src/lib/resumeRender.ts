import type { ResumeEducationItem, ResumeSectionKey, StructuredResume } from "./types";
import {
  cloneRenderPlan,
  computeOnePageLayoutPlan,
  estimatePageUse,
  experienceEntryKey,
  mergeRenderPlans,
  PAGE_TARGET,
  projectEntryKey,
  selectStrongestBullets,
  spacingTokensForMode,
  type OnePageLayoutResult,
  type ResumeLayoutMode,
  type ResumeRenderPlan,
  type ResumeSpacingTokens,
} from "./resumeLayoutEngine";

export {
  cloneRenderPlan,
  cloneRenderPlanDeep,
  computeOnePageLayoutPlan,
  mergeRenderPlans,
  tightenRenderPlanOneStep,
} from "./resumeLayoutEngine";

export type { ResumeRenderPlan, OnePageLayoutResult, ResumeLayoutMode, ResumeSpacingTokens };

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

export type ResumeSpacingProfile = ResumeLayoutMode;

export type ResumeTypographyTokens = {
  namePt: number;
  contactPt: number;
  sectionHeaderPt: number;
  primaryLinePt: number;
  secondaryLinePt: number;
  bulletPt: number;
};

import type { ResumeFitMode } from "./resumeFitSettings";
import { applyExportOverridesToResume, type FinalExportOverrides } from "./finalExportOverrides";

export type ResumeRenderOptions = {
  fitMode?: ResumeFitMode;
  targetPages?: number;
  /** User-applied manual trims (render-only). */
  manualTrimPlan?: ResumeRenderPlan;
  /** Full render plan override (legacy / force DOM pass). */
  renderPlan?: ResumeRenderPlan;
  /** Show full resume content (no auto/manual trims) after Restore All Content. */
  fullContentPreview?: boolean;
  /** Last-mile text edits for export (review modal). */
  finalExportOverrides?: FinalExportOverrides;
};

export type { FinalExportOverrides } from "./finalExportOverrides";
export { buildDefaultFinalExportOverrides, exportDisplayText, emptyFinalExportOverrides } from "./finalExportOverrides";

export type ResumeRenderModel = {
  templateVersion: "resume-template-v2";
  /** Normalized source resume (full editor content). */
  sourceResume: StructuredResume;
  /** Render/export view after one-page layout plan. */
  resume: StructuredResume;
  sections: ResumeSectionRender[];
  spacing: ResumeSpacingTokens;
  typography: ResumeTypographyTokens;
  layout: OnePageLayoutResult;
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

/** Applies render-only one-page plan; does not mutate stored resume. */
export function applyRenderPlan(normalized: StructuredResume, plan: ResumeRenderPlan): StructuredResume {
  const summaryHidden = plan.hiddenSections.includes("summary");
  const summaryText = summaryHidden
    ? ""
    : plan.summaryText != null
      ? plan.summaryText
      : normalized.summary;

  return {
    ...normalized,
    summary: summaryText,
    experience: normalized.experience.map((e, index) => {
      const key = experienceEntryKey(e, index);
      const limit = plan.bulletLimits[key];
      const bullets = limit != null ? selectStrongestBullets(e.bullets, limit) : e.bullets;
      return { ...e, bullets };
    }),
    projects: normalized.projects.flatMap((p, index) => {
      const key = projectEntryKey(p, index);
      if (plan.hiddenSections.includes(key)) return [];
      const limit = plan.bulletLimits[key];
      const bullets = limit != null ? selectStrongestBullets(p.bullets, limit) : p.bullets;
      return [{ ...p, bullets }];
    }),
    education: normalized.education.map((e) => ({
      ...e,
      concentrationOrMinor: plan.compactEducation ? "" : e.concentrationOrMinor,
      details: plan.compactEducation ? [] : e.details,
    })),
  };
}

export function formatSkillRenderLines(
  resume: StructuredResume,
  plan: ResumeRenderPlan,
): { key: string; text: string }[] {
  const groups = resume.skills.filter((s) => s.category || s.items.length);
  if (!groups.length) return [];

  if (!plan.compactSkills) {
    return groups.map((s, i) => ({
      key: s.id ?? `skills-${i}`,
      text: `${s.category || "Skills"}: ${s.items.join(", ")}`,
    }));
  }

  const merged = groups
    .map((g) => (g.category ? `${g.category}: ${g.items.join(", ")}` : g.items.join(", ")))
    .filter(Boolean)
    .join("  |  ");
  return [{ key: "skills-compact", text: merged }];
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

export function getResumeRenderModel(
  resume: StructuredResume,
  options?: ResumeRenderOptions,
): ResumeRenderModel {
  const sourceResume = normalizeResumeForRender(resume);
  const sectionKeys = getVisibleResumeSections(sourceResume).map((s) => s.key);
  const fitMode = options?.fitMode ?? "preserve";
  const targetPages = options?.targetPages ?? 1;
  const fullContentPreview = options?.fullContentPreview === true;
  const manual = options?.manualTrimPlan ?? cloneRenderPlan();
  const computed = computeOnePageLayoutPlan(
    sourceResume,
    sectionKeys,
    fullContentPreview ? "preserve" : fitMode,
    targetPages,
  );
  const renderPlan = fullContentPreview
    ? cloneRenderPlan()
    : (options?.renderPlan ?? mergeRenderPlans(computed.renderPlan, manual));
  const spacing = spacingTokensForMode(renderPlan.layoutMode);
  const estimatedPageUse = estimatePageUse(sourceResume, renderPlan, spacing, sectionKeys);
  const layout: OnePageLayoutResult = {
    layoutMode: renderPlan.layoutMode,
    estimatedPageUse,
    overflowRisk:
      estimatedPageUse <= PAGE_TARGET * targetPages - 4
        ? "low"
        : estimatedPageUse <= PAGE_TARGET * targetPages + 6
          ? "medium"
          : "high",
    renderPlan,
  };
  let displayResume = applyRenderPlan(sourceResume, renderPlan);
  displayResume = applyExportOverridesToResume(displayResume, options?.finalExportOverrides);
  return {
    templateVersion: RESUME_TEMPLATE_VERSION,
    sourceResume,
    resume: displayResume,
    sections: getVisibleResumeSections(displayResume),
    spacing,
    typography: getResumeTypographyTokens(),
    layout,
  };
}

