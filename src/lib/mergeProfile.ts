import type { UserProfile } from "./types";

function pickStr(base: string, extracted: string): string {
  const e = extracted.trim();
  return e.length > 0 ? e : base;
}

function pickArr(base: string[], extracted: string[]): string[] {
  const e = extracted.map((s) => s.trim()).filter(Boolean);
  return e.length > 0 ? e : base;
}

/**
 * Fills empty local fields from extraction; overwrites when extraction has content.
 * Use after resume parse so users keep anything they already typed unless the model found better text.
 */
export function mergeProfileFromExtraction(base: UserProfile, extracted: UserProfile): UserProfile {
  return {
    fullName: pickStr(base.fullName, extracted.fullName),
    email: pickStr(base.email, extracted.email),
    phone: pickStr(base.phone, extracted.phone),
    location: pickStr(base.location, extracted.location),
    linkedin: pickStr(base.linkedin, extracted.linkedin),
    portfolio: pickStr(base.portfolio, extracted.portfolio),
    school: pickStr(base.school, extracted.school),
    major: pickStr(base.major, extracted.major),
    graduationYear: pickStr(base.graduationYear, extracted.graduationYear),
    summary: pickStr(base.summary, extracted.summary),
    skills: pickArr(base.skills, extracted.skills),
    experienceBullets: pickArr(base.experienceBullets, extracted.experienceBullets),
    projectBullets: pickArr(base.projectBullets, extracted.projectBullets),
    resumeText: pickStr(base.resumeText, extracted.resumeText),
    defaultTone: base.defaultTone,
    signatureBlock: pickStr(base.signatureBlock, extracted.signatureBlock),
  };
}

/** Replace local profile entirely with extraction (user explicitly chose replace). */
export function replaceProfileFromExtraction(extracted: UserProfile): UserProfile {
  return { ...extracted };
}
