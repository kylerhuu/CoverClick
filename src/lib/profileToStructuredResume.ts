import type { DegreeType, StructuredResume, UserProfile } from "./types";
import { EMPTY_STRUCTURED_RESUME } from "./types";

function hasStructuredEntriesData(profile: UserProfile): boolean {
  return (
    (profile.structuredEntries?.experience.length ?? 0) > 0 ||
    (profile.structuredEntries?.projects.length ?? 0) > 0 ||
    (profile.structuredEntries?.education.length ?? 0) > 0 ||
    (profile.structuredEntries?.skills.length ?? 0) > 0
  );
}

function degreeLabel(degreeType: DegreeType): string {
  switch (degreeType) {
    case "Bachelor's":
      return "Bachelor's Degree";
    case "Master's":
      return "Master's Degree";
    case "High School":
      return "High School Diploma";
    default:
      return degreeType === "Other" ? "Degree" : degreeType;
  }
}

/** True when the CoverClick profile has fields worth mapping into Resume Studio. */
export function hasProfileResumeData(profile: UserProfile): boolean {
  if (
    profile.fullName.trim() ||
    profile.email.trim() ||
    profile.phone.trim() ||
    profile.location.trim() ||
    profile.linkedin.trim() ||
    profile.portfolio.trim() ||
    profile.summary.trim() ||
    profile.school.trim() ||
    profile.major.trim() ||
    profile.graduationYear.trim()
  ) {
    return true;
  }
  return (
    hasStructuredEntriesData(profile) ||
    profile.skills.length > 0 ||
    profile.experienceBullets.length > 0 ||
    profile.projectBullets.length > 0
  );
}

/** True when the stored resume draft has any user-visible content. */
export function hasResumeStudioContent(resume: StructuredResume): boolean {
  const c = resume.contact;
  if (
    c.fullName.trim() ||
    c.email.trim() ||
    c.phone.trim() ||
    c.location.trim() ||
    c.links.some((l) => l.trim())
  ) {
    return true;
  }
  if (resume.summary.trim()) return true;
  if (resume.certifications.length || resume.leadership.length || resume.links.some((l) => l.trim())) {
    return true;
  }
  if (
    resume.education.some(
      (e) =>
        e.school.trim() ||
        e.degree.trim() ||
        e.major.trim() ||
        (e.concentrationOrMinor ?? "").trim() ||
        (e.gpa ?? "").trim() ||
        e.graduationDate.trim() ||
        e.details.length,
    )
  ) {
    return true;
  }
  if (
    resume.experience.some(
      (e) =>
        e.company.trim() ||
        e.title.trim() ||
        e.dates.trim() ||
        e.location.trim() ||
        e.bullets.length,
    )
  ) {
    return true;
  }
  if (resume.projects.some((p) => p.name.trim() || p.subtitle.trim() || p.techStack.length || p.bullets.length)) {
    return true;
  }
  if (resume.skills.some((s) => s.category.trim() || s.items.length)) return true;
  return false;
}

export function isResumeStudioEmpty(resume: StructuredResume): boolean {
  return !hasResumeStudioContent(resume);
}

/**
 * Map Options / chrome.storage profile into the structured resume model.
 * Does not use resumeText (unstructured); user can paste or generate summary separately.
 */
export function profileToStructuredResume(profile: UserProfile): StructuredResume {
  const contactLinks = [profile.linkedin.trim(), profile.portfolio.trim()].filter(Boolean);

  const structured = profile.structuredEntries;
  const hasStructured = hasStructuredEntriesData(profile);

  const education = hasStructured
    ? (structured?.education ?? []).map((e, idx) => ({
        id: `edu-${idx + 1}`,
        school: e.school,
        degreeType: e.degreeType,
        degree: e.degree || degreeLabel(e.degreeType),
        major: e.major ?? "",
        concentrationOrMinor: e.concentrationOrMinor ?? "",
        gpa: e.gpa ?? "",
        graduationDate: e.graduationDate ?? "",
        details: [...e.details],
      }))
    : profile.school.trim() || profile.major.trim() || profile.graduationYear.trim()
      ? [
          {
            id: "edu-1",
            school: profile.school.trim(),
            degreeType: "Bachelor's" as DegreeType,
            degree: "Bachelor's Degree",
            major: profile.major.trim(),
            concentrationOrMinor: "",
            gpa: "",
            graduationDate: profile.graduationYear.trim(),
            details: [] as string[],
          },
        ]
      : [];

  const experience = hasStructured
    ? (structured?.experience ?? []).map((e, idx) => ({
        id: `exp-${idx + 1}`,
        company: e.company,
        companySubtitle: e.companySubtitle ?? "",
        title: e.title,
        dates: e.dates,
        location: e.location ?? "",
        bullets: [...e.bullets],
      }))
    : profile.experienceBullets.length > 0
      ? [
          {
            id: "exp-1",
            company: "",
            companySubtitle: "",
            title: "Professional Experience",
            dates: "",
            location: "",
            bullets: [...profile.experienceBullets],
          },
        ]
      : [];

  const projects = hasStructured
    ? (structured?.projects ?? []).map((p, idx) => ({
        id: `proj-${idx + 1}`,
        name: p.name,
        subtitle: p.subtitle ?? "",
        techStack: [...p.techStack],
        bullets: [...p.bullets],
      }))
    : profile.projectBullets.length > 0
      ? [
          {
            id: "proj-1",
            name: "Projects",
            subtitle: "",
            techStack: [],
            bullets: [...profile.projectBullets],
          },
        ]
      : [];

  const skills = hasStructured
    ? (structured?.skills ?? []).map((g, idx) => ({ id: `skills-${idx + 1}`, category: g.category, items: [...g.items] }))
    : profile.skills.length > 0
      ? [{ id: "skills-1", category: "Core Skills", items: [...profile.skills] }]
      : [];

  return {
    ...EMPTY_STRUCTURED_RESUME,
    contact: {
      fullName: profile.fullName.trim(),
      email: profile.email.trim(),
      phone: profile.phone.trim(),
      location: profile.location.trim(),
      links: contactLinks,
    },
    summary: profile.summary.trim(),
    education,
    experience,
    projects,
    skills,
    sectionSettings: {
      summary: { isVisible: true, order: 0 },
      experience: { isVisible: true, order: 1 },
      projects: { isVisible: true, order: 2 },
      education: { isVisible: true, order: 3 },
      skills: { isVisible: true, order: 4 },
    },
  };
}

