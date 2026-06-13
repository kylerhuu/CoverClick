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

export type ProfileSetupStepId = "import" | "review" | "generate";

export type ProfileSetupStep = {
  id: ProfileSetupStepId;
  title: string;
  description: string;
  done: boolean;
};

export function profileSetupSteps(profile: UserProfile): ProfileSetupStep[] {
  const { score } = profileCompleteness(profile);
  const imported = hasImportedOrFilledExperience(profile);
  const name = Boolean(profile.fullName?.trim());
  const reviewed = name && imported && score >= PROFILE_READY_MIN_SCORE;

  return [
    {
      id: "import",
      title: "Import your resume",
      description: "Upload PDF, DOCX, or TXT so CoverClick knows your background.",
      done: imported,
    },
    {
      id: "review",
      title: "Review your profile",
      description: "Confirm your name, summary, experience, and skills in Profile.",
      done: reviewed,
    },
    {
      id: "generate",
      title: "Generate cover letters",
      description: "Open a job posting and use Apply Now when your profile is ready.",
      done: reviewed,
    },
  ];
}
