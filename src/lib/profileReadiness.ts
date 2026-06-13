import type { UserProfile } from "./types";
import { profileCompleteness } from "./profileCompleteness";

/** Minimum completeness before cover letter generation is allowed. */
export const PROFILE_READY_MIN_SCORE = 45;

export function hasImportedOrFilledExperience(profile: UserProfile): boolean {
  const summary = profile.summary?.trim() ?? "";
  const experience = profile.experienceBullets?.some((b) => b.trim().length > 0) ?? false;
  const projects = profile.projectBullets?.some((b) => b.trim().length > 0) ?? false;
  const resumeText = profile.resumeText?.trim() ?? "";
  return summary.length > 0 || experience || projects || resumeText.length > 80;
}

export function isProfileReadyForGeneration(profile: UserProfile): boolean {
  const name = profile.fullName?.trim() ?? "";
  if (!name) return false;
  if (!hasImportedOrFilledExperience(profile)) return false;
  const { score } = profileCompleteness(profile);
  return score >= PROFILE_READY_MIN_SCORE;
}
