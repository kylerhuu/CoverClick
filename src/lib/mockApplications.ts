import type {
  ApplicationStats,
  CreateApplicationRequest,
  JobApplication,
  PreparationSteps,
  StructuredCoverLetter,
  UpdateApplicationRequest,
  UserProfile,
} from "./types";
import { STORAGE_KEYS } from "./storageKeys";
import { loadProfile } from "./storage";
import { normalizeJobUrl } from "./jobSource";

function normalizeStoredApplication(raw: JobApplication): JobApplication {
  return {
    ...raw,
    resumeVariantId: raw.resumeVariantId ?? null,
    resumeVariantName: raw.resumeVariantName ?? null,
  };
}

async function readStore(): Promise<JobApplication[]> {
  const raw = await chrome.storage.local.get(STORAGE_KEYS.applications);
  const list = raw[STORAGE_KEYS.applications];
  if (!Array.isArray(list)) return [];
  return (list as JobApplication[]).map(normalizeStoredApplication);
}

async function writeStore(applications: JobApplication[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.applications]: applications });
}

function mockId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_STEPS: PreparationSteps = {
  jobSaved: false,
  fitAnalyzed: false,
  coverLetterDrafted: false,
  resumeSuggestionsGenerated: false,
};

function computeStats(applications: JobApplication[]): ApplicationStats {
  return {
    saved: applications.filter((a) => a.status === "SAVED").length,
    readyToApply: applications.filter((a) => a.status === "READY_TO_APPLY").length,
    applied: applications.filter((a) => a.status === "APPLIED").length,
    interviewing: applications.filter((a) => a.status === "INTERVIEWING").length,
  };
}

function mockCoverLetter(profile: UserProfile, req: CreateApplicationRequest): StructuredCoverLetter {
  const name = profile.fullName || "Candidate";
  return {
    senderBlock: name,
    dateLine: new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
    recipientBlock: `${req.company}\nHiring Team`,
    greeting: "Dear Hiring Manager,",
    bodyParagraphs: [
      `I am excited to apply for the ${req.title || "role"} at ${req.company || "your company"}. My background aligns with the responsibilities outlined in your posting.`,
      `In recent roles I have delivered measurable results using skills that map directly to this position. I would bring the same focus on quality and collaboration to your team.`,
      `Thank you for considering my application. I would welcome the chance to discuss how I can contribute to ${req.company || "your organization"}.`,
    ],
    closing: "Sincerely,",
    signature: name,
  };
}

async function simulatePreparation(id: string): Promise<void> {
  const steps: (keyof PreparationSteps)[] = [
    "jobSaved",
    "fitAnalyzed",
    "coverLetterDrafted",
    "resumeSuggestionsGenerated",
  ];
  for (let i = 0; i < steps.length; i++) {
    await new Promise((r) => setTimeout(r, 800 + i * 400));
    const apps = await readStore();
    const idx = apps.findIndex((a) => a.id === id);
    if (idx < 0 || apps[idx].status !== "PREPARING") return;
    const stepKey = steps[i];
    const preparationSteps = { ...DEFAULT_STEPS, ...(apps[idx].preparationSteps ?? {}) };
    preparationSteps[stepKey] = true;
    apps[idx] = {
      ...apps[idx],
      preparationSteps,
      fitScore: stepKey === "fitAnalyzed" ? 72 + Math.floor(Math.random() * 18) : apps[idx].fitScore,
      updatedAt: new Date().toISOString(),
    };
    if (stepKey === "resumeSuggestionsGenerated") {
      apps[idx].status = "READY_TO_APPLY";
      apps[idx].resumeSuggestions = {
        summary: "Emphasize role-relevant tools and quantify impact in your top bullets.",
        skillsToAdd: ["TypeScript", "Cross-functional collaboration"],
        keywordsToInclude: ["ownership", "stakeholders", "delivery"],
        experienceToEmphasize: ["Most recent role with measurable outcomes"],
        bulletRewriteSuggestions: [
          {
            originalIdea: "Worked on team projects",
            improvedBullet: "Led cross-functional delivery of features used by 10k+ users, improving activation by 12%.",
            reason: "Adds scope and metric for stronger ATS alignment.",
          },
        ],
        sectionPriority: ["Experience", "Projects", "Skills"],
        warnings: ["Mock mode — connect API for live tailoring."],
      };
    }
    await writeStore(apps);
  }
}

export async function mockListApplications(): Promise<{ applications: JobApplication[]; stats: ApplicationStats }> {
  const applications = await readStore();
  return { applications, stats: computeStats(applications) };
}

export async function mockGetApplicationByUrl(jobUrl: string): Promise<JobApplication | null> {
  const apps = await readStore();
  const normalized = normalizeJobUrl(jobUrl);
  return apps.find((a) => normalizeJobUrl(a.jobUrl) === normalized) ?? null;
}

export async function mockGetApplication(id: string): Promise<JobApplication | null> {
  const apps = await readStore();
  return apps.find((a) => a.id === id) ?? null;
}

export async function mockCreateApplication(input: CreateApplicationRequest): Promise<JobApplication> {
  const profile = await loadProfile();
  const now = new Date().toISOString();
  const jobUrl = normalizeJobUrl(input.jobUrl);
  const apps = await readStore();
  const existingIdx = apps.findIndex((a) => normalizeJobUrl(a.jobUrl) === jobUrl);
  const base: JobApplication = {
    id: existingIdx >= 0 ? apps[existingIdx].id : mockId(),
    userId: "mock-user",
    company: input.company,
    title: input.title,
    location: input.location ?? "",
    source: input.source,
    jobUrl,
    jobDescription: input.jobDescription,
    dateSaved: now,
    dateApplied: null,
    status: "PREPARING",
    fitScore: null,
    resumeUsed: profile,
    coverLetterDraft: null,
    resumeSuggestions: null,
    preparationSteps: { ...DEFAULT_STEPS, jobSaved: true },
    preparationError: null,
    notes: "",
    interviewDate: null,
    followUpDate: null,
    resumeVariantId: input.resumeVariantId?.trim() || null,
    resumeVariantName: input.resumeVariantName?.trim() || null,
    createdAt: existingIdx >= 0 ? apps[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    apps[existingIdx] = base;
  } else {
    apps.unshift(base);
  }
  await writeStore(apps);

  void (async () => {
    await new Promise((r) => setTimeout(r, 600));
    const current = await mockGetApplication(base.id);
    if (!current || current.status !== "PREPARING") return;
    const withLetter = await mockGetApplication(base.id);
    if (!withLetter) return;
    const apps2 = await readStore();
    const idx = apps2.findIndex((a) => a.id === base.id);
    if (idx < 0) return;
    apps2[idx].coverLetterDraft = mockCoverLetter(profile, input);
    apps2[idx].updatedAt = new Date().toISOString();
    await writeStore(apps2);
    await simulatePreparation(base.id);
  })();

  return base;
}

export async function mockUpdateApplication(id: string, patch: UpdateApplicationRequest): Promise<JobApplication | null> {
  const apps = await readStore();
  const idx = apps.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  const next = { ...apps[idx], ...patch, updatedAt: now };
  if (patch.dateApplied && !patch.status) next.status = "APPLIED";
  apps[idx] = next;
  await writeStore(apps);
  return next;
}
