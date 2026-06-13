import type { UserProfile } from "./types";
import { hasImportedOrFilledExperience, isProfileReadyForGeneration } from "./profileReadiness";
import { STORAGE_KEYS } from "./storageKeys";

export type OnboardingSurface = "options" | "sidepanel";

export type OnboardingStepId = "profile-tab" | "import-resume" | "profile-fields" | "apply-workflow";

export type OnboardingStep = {
  id: OnboardingStepId;
  surface: OnboardingSurface;
  target: string;
  title: string;
  body: string;
  /** Options tab to show when this step is active. */
  optionsTab?: "profile" | "import";
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "profile-tab",
    surface: "options",
    target: '[data-onboarding-target="profile-tab"]',
    title: "Your profile powers everything",
    body: "CoverClick uses your profile to tailor cover letters, resumes, and fit scores. Start here — your name, experience, and skills become the foundation for every application.",
    optionsTab: "profile",
  },
  {
    id: "import-resume",
    surface: "options",
    target: '[data-onboarding-target="import-resume"]',
    title: "Import your resume",
    body: "Upload a PDF, DOCX, or TXT file and we’ll extract your experience, education, and skills automatically. This is the fastest way to fill your profile.",
    optionsTab: "import",
  },
  {
    id: "profile-fields",
    surface: "options",
    target: '[data-onboarding-target="profile-fields"]',
    title: "Review and refine",
    body: "Check the extracted details, edit anything that needs a tweak, and add missing highlights. A complete profile means better, more personal cover letters.",
    optionsTab: "profile",
  },
  {
    id: "apply-workflow",
    surface: "sidepanel",
    target: '[data-onboarding-target="apply-workflow"]',
    title: "Apply to any job",
    body: "Open a job posting in your browser, scan it here, then use Apply Now to generate a tailored cover letter. Review, download, and send — all from one place.",
  },
];

export type OnboardingState = {
  completed: boolean;
  active: boolean;
  step: number;
};

const DEFAULT_STATE: OnboardingState = {
  completed: false,
  active: false,
  step: 0,
};

function normalizeState(raw: unknown): OnboardingState {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
  const o = raw as Record<string, unknown>;
  const step = typeof o.step === "number" ? Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, Math.floor(o.step))) : 0;
  return {
    completed: o.completed === true,
    active: o.active === true,
    step,
  };
}

export async function loadOnboardingState(): Promise<OnboardingState> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.onboarding);
  return normalizeState(data[STORAGE_KEYS.onboarding]);
}

export async function saveOnboardingState(state: OnboardingState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.onboarding]: state });
}

export async function markOnboardingCompleted(): Promise<void> {
  await saveOnboardingState({ completed: true, active: false, step: 0 });
}

export async function resetOnboardingForRelaunch(): Promise<OnboardingState> {
  const next: OnboardingState = { completed: false, active: true, step: 0 };
  await saveOnboardingState(next);
  return next;
}

export function shouldOfferOnboarding(profile: UserProfile, state: OnboardingState): boolean {
  if (state.completed) return false;
  const incomplete = !isProfileReadyForGeneration(profile);
  const noResume = !hasImportedOrFilledExperience(profile);
  return incomplete || noResume;
}

export function getStep(index: number): OnboardingStep | null {
  return ONBOARDING_STEPS[index] ?? null;
}
