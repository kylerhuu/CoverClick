import { experienceEntryKey, projectEntryKey } from "./resumeLayoutEngine";
import type { StructuredResume } from "./types";
import {
  formatContactLine,
  formatEducationBlock,
  formatExperiencePrimary,
  formatExperienceSecondary,
  formatProjectPrimary,
  formatProjectSecondary,
  formatSkillRenderLines,
  type ResumeRenderPlan,
} from "./resumeRender";

/** Render-only text overrides for final export (does not mutate stored resume). */
export type FinalExportOverrides = Record<string, string>;

export function emptyFinalExportOverrides(): FinalExportOverrides {
  return {};
}

export function exportDisplayText(
  overrides: FinalExportOverrides | undefined,
  key: string,
  fallback: string,
): string {
  if (!overrides) return fallback;
  const v = overrides[key];
  return v !== undefined ? v : fallback;
}

export function buildDefaultFinalExportOverrides(
  resume: StructuredResume,
  plan: ResumeRenderPlan,
): FinalExportOverrides {
  const out: FinalExportOverrides = {};
  out["contact:line"] = formatContactLine(resume);
  out.summary = resume.summary;
  resume.experience.forEach((e, i) => {
    const ek = experienceEntryKey(e, i);
    out[`${ek}:primary`] = formatExperiencePrimary(e.company, e.companySubtitle);
    out[`${ek}:secondary`] = formatExperienceSecondary(e.title, e.location, e.dates);
    e.bullets.forEach((b, bi) => {
      out[`${ek}:bullet:${bi}`] = b;
    });
  });
  resume.projects.forEach((p, i) => {
    const pk = projectEntryKey(p, i);
    if (plan.hiddenSections.includes(pk)) return;
    out[`${pk}:primary`] = formatProjectPrimary(p.name, p.subtitle);
    out[`${pk}:secondary`] = formatProjectSecondary(p.techStack);
    p.bullets.forEach((b, bi) => {
      out[`${pk}:bullet:${bi}`] = b;
    });
  });
  resume.education.forEach((e, i) => {
    const id = e.id ?? `edu-${i}`;
    const lines = formatEducationBlock(e);
    out[`education:${id}:school`] = lines.schoolLine;
    out[`education:${id}:degree`] = lines.degreeLine;
    out[`education:${id}:major`] = lines.majorLine;
    out[`education:${id}:gpa`] = lines.gpaLine;
    e.details.forEach((d, di) => {
      out[`education:${id}:detail:${di}`] = d;
    });
  });
  formatSkillRenderLines(resume, plan).forEach((line) => {
    out[`skills:${line.key}`] = line.text;
  });
  return out;
}

function bulletsFromOverrides(
  bullets: string[],
  keyPrefix: string,
  overrides: FinalExportOverrides,
): string[] {
  return bullets
    .map((b, bi) => {
      const k = `${keyPrefix}:bullet:${bi}`;
      if (!(k in overrides)) return b;
      const v = overrides[k];
      if (!v.trim()) return null;
      return v;
    })
    .filter((x): x is string => x != null);
}

/** Applies summary and bullet overrides onto the render model resume. */
export function applyExportOverridesToResume(
  resume: StructuredResume,
  overrides?: FinalExportOverrides,
): StructuredResume {
  if (!overrides || !Object.keys(overrides).length) return resume;
  return {
    ...resume,
    summary: overrides.summary != null ? overrides.summary : resume.summary,
    experience: resume.experience.map((e, i) => {
      const ek = experienceEntryKey(e, i);
      return { ...e, bullets: bulletsFromOverrides(e.bullets, ek, overrides) };
    }),
    projects: resume.projects.map((p, i) => {
      const pk = projectEntryKey(p, i);
      return { ...p, bullets: bulletsFromOverrides(p.bullets, pk, overrides) };
    }),
    education: resume.education.map((e, i) => {
      const id = e.id ?? `edu-${i}`;
      const prefix = `education:${id}`;
      const details = e.details
        .map((d, di) => {
          const k = `${prefix}:detail:${di}`;
          if (!(k in overrides)) return d;
          const v = overrides[k];
          return v.trim() ? v : null;
        })
        .filter((x): x is string => x != null);
      return {
        ...e,
        school: overrides[`${prefix}:school`] ?? e.school,
        degree: overrides[`${prefix}:degree`] ?? e.degree,
        major: overrides[`${prefix}:major`] ?? e.major,
        gpa: overrides[`${prefix}:gpa`]?.replace(/^GPA:\s*/i, "").trim() || e.gpa,
        details,
      };
    }),
  };
}
