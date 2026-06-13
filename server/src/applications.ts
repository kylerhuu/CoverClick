import type { JobApplication, JobApplicationStatus, PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import type {
  JobContext,
  PreparationSteps,
  StructuredCoverLetter,
  UserProfile,
} from "./contract.js";
import { cleanJobDescriptionWithOpenAI } from "./cleanJobDescriptionOpenAI.js";
import { generateCoverLetterWithOpenAI } from "./generateCoverLetterOpenAI.js";
import { jobFitScoreWithOpenAI } from "./jobFitScoreWithOpenAI.js";
import { resumeTailoringWithOpenAI } from "./resumeTailoringWithOpenAI.js";

export type JobApplicationDto = {
  id: string;
  userId: string;
  company: string;
  title: string;
  location: string;
  source: string;
  jobUrl: string;
  jobDescription: string;
  dateSaved: string;
  dateApplied: string | null;
  status: JobApplicationStatus;
  fitScore: number | null;
  resumeVariantId: string | null;
  resumeVariantName: string | null;
  resumeUsed: unknown;
  coverLetterDraft: unknown;
  resumeSuggestions: unknown;
  preparationSteps: PreparationSteps | null;
  preparationError: string | null;
  notes: string;
  interviewDate: string | null;
  followUpDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationStats = {
  saved: number;
  readyToApply: number;
  applied: number;
  interviewing: number;
};

const DEFAULT_STEPS: PreparationSteps = {
  jobSaved: false,
  fitAnalyzed: false,
  coverLetterDrafted: false,
  resumeSuggestionsGenerated: false,
};

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export function serializeApplication(row: JobApplication): JobApplicationDto {
  return {
    id: row.id,
    userId: row.userId,
    company: row.company,
    title: row.title,
    location: row.location,
    source: row.source,
    jobUrl: row.jobUrl,
    jobDescription: row.jobDescription,
    dateSaved: row.dateSaved.toISOString(),
    dateApplied: toIso(row.dateApplied),
    status: row.status,
    fitScore: row.fitScore,
    resumeVariantId: row.resumeVariantId,
    resumeVariantName: row.resumeVariantName,
    resumeUsed: row.resumeUsed,
    coverLetterDraft: row.coverLetterDraft,
    resumeSuggestions: row.resumeSuggestions,
    preparationSteps: (row.preparationSteps as PreparationSteps | null) ?? null,
    preparationError: row.preparationError,
    notes: row.notes,
    interviewDate: toIso(row.interviewDate),
    followUpDate: toIso(row.followUpDate),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function jobContextFromRow(row: JobApplication): JobContext {
  return {
    jobTitle: row.title,
    companyName: row.company,
    pageUrl: row.jobUrl,
    descriptionText: row.jobDescription,
    scrapedAt: row.dateSaved.getTime(),
  };
}

async function updateSteps(
  prisma: PrismaClient,
  id: string,
  patch: Partial<PreparationSteps>,
): Promise<PreparationSteps> {
  const row = await prisma.jobApplication.findUnique({ where: { id } });
  const current = { ...DEFAULT_STEPS, ...((row?.preparationSteps as PreparationSteps | null) ?? {}) };
  const next = { ...current, ...patch };
  await prisma.jobApplication.update({
    where: { id },
    data: { preparationSteps: next },
  });
  return next;
}

export async function computeApplicationStats(prisma: PrismaClient, userId: string): Promise<ApplicationStats> {
  const [saved, readyToApply, applied, interviewing] = await Promise.all([
    prisma.jobApplication.count({ where: { userId, status: "SAVED" } }),
    prisma.jobApplication.count({ where: { userId, status: "READY_TO_APPLY" } }),
    prisma.jobApplication.count({ where: { userId, status: "APPLIED" } }),
    prisma.jobApplication.count({ where: { userId, status: "INTERVIEWING" } }),
  ]);
  return { saved, readyToApply, applied, interviewing };
}

export type CreateApplicationInput = {
  company: string;
  title: string;
  location?: string;
  source: string;
  jobUrl: string;
  jobDescription: string;
  resumeVariantId?: string;
  resumeVariantName?: string;
};

/** Canonicalize job URLs so duplicate saves match the same row. */
export function normalizeJobUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    u.hash = "";
    let out = u.toString();
    if (out.endsWith("/") && u.pathname.length > 1) out = out.slice(0, -1);
    return out;
  } catch {
    return trimmed;
  }
}

function asTrimmedString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

export type ParseCreateApplicationResult =
  | { ok: true; input: CreateApplicationInput }
  | { ok: false; error: string };

export function parseCreateApplicationBody(body: unknown): ParseCreateApplicationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;
  const jobUrl = normalizeJobUrl(asTrimmedString(b.jobUrl));
  if (!jobUrl) {
    return { ok: false, error: "Missing required field: jobUrl" };
  }
  return {
    ok: true,
    input: {
      jobUrl,
      company: asTrimmedString(b.company, "Unknown company"),
      title: asTrimmedString(b.title, "Untitled role"),
      location: asTrimmedString(b.location),
      source: asTrimmedString(b.source, "Web"),
      jobDescription: asTrimmedString(b.jobDescription),
      resumeVariantId: asTrimmedString(b.resumeVariantId) || undefined,
      resumeVariantName: asTrimmedString(b.resumeVariantName) || undefined,
    },
  };
}

export type CreateApplicationResult = {
  application: JobApplicationDto;
  alreadySaved: boolean;
};

export async function createJobApplication(
  prisma: PrismaClient,
  userId: string,
  input: CreateApplicationInput,
  options?: { forFreeTier?: boolean },
): Promise<CreateApplicationResult> {
  const jobUrl = normalizeJobUrl(input.jobUrl);
  const existing = await prisma.jobApplication.findUnique({
    where: { userId_jobUrl: { userId, jobUrl } },
  });

  const forFreeTier = Boolean(options?.forFreeTier);
  const status = forFreeTier ? "SAVED" : "PREPARING";

  const row = await prisma.jobApplication.upsert({
    where: { userId_jobUrl: { userId, jobUrl } },
    create: {
      userId,
      company: asTrimmedString(input.company, "Unknown company"),
      title: asTrimmedString(input.title, "Untitled role"),
      location: asTrimmedString(input.location),
      source: asTrimmedString(input.source, "Web"),
      jobUrl,
      jobDescription: asTrimmedString(input.jobDescription),
      resumeVariantId: input.resumeVariantId ?? null,
      resumeVariantName: input.resumeVariantName ?? null,
      status,
      dateSaved: new Date(),
      preparationSteps: { ...DEFAULT_STEPS, jobSaved: true },
    },
    update: {
      company: asTrimmedString(input.company, "Unknown company"),
      title: asTrimmedString(input.title, "Untitled role"),
      location: asTrimmedString(input.location),
      source: asTrimmedString(input.source, "Web"),
      jobDescription: asTrimmedString(input.jobDescription),
      resumeVariantId: input.resumeVariantId ?? null,
      resumeVariantName: input.resumeVariantName ?? null,
      status,
      dateSaved: new Date(),
      preparationError: null,
      fitScore: forFreeTier ? undefined : null,
      coverLetterDraft: forFreeTier ? undefined : Prisma.JsonNull,
      resumeSuggestions: forFreeTier ? undefined : Prisma.JsonNull,
      preparationSteps: { ...DEFAULT_STEPS, jobSaved: true },
    },
  });
  return { application: serializeApplication(row), alreadySaved: Boolean(existing) };
}

const activePipelines = new Set<string>();

export function runPreparationPipeline(prisma: PrismaClient, applicationId: string): void {
  if (activePipelines.has(applicationId)) return;
  activePipelines.add(applicationId);
  void (async () => {
    try {
      await executePreparationPipeline(prisma, applicationId);
    } catch (e) {
      console.error("[preparation-pipeline]", applicationId, e);
      await prisma.jobApplication.update({
        where: { id: applicationId },
        data: {
          preparationError: e instanceof Error ? e.message : "Preparation failed",
          status: "SAVED",
        },
      });
    } finally {
      activePipelines.delete(applicationId);
    }
  })();
}

async function executePreparationPipeline(prisma: PrismaClient, applicationId: string): Promise<void> {
  const row = await prisma.jobApplication.findUnique({ where: { id: applicationId } });
  if (!row) return;

  const profileRow = await prisma.storedProfile.findUnique({ where: { userId: row.userId } });
  const profile = (profileRow?.data ?? {}) as unknown as UserProfile;
  let job = jobContextFromRow(row);

  if (job.descriptionText.trim().length > 400) {
    try {
      const cleaned = await cleanJobDescriptionWithOpenAI(job.descriptionText);
      if (cleaned.trim()) {
        job = { ...job, descriptionText: cleaned };
        await prisma.jobApplication.update({
          where: { id: applicationId },
          data: { jobDescription: cleaned },
        });
      }
    } catch {
      // Non-fatal — continue with raw description.
    }
  }

  await updateSteps(prisma, applicationId, { jobSaved: true });

  const fit = await jobFitScoreWithOpenAI({ profile, job });
  await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { fitScore: fit.jobFitScore },
  });
  await updateSteps(prisma, applicationId, { fitAnalyzed: true });

  const letterOut = await generateCoverLetterWithOpenAI(
    {
      profile,
      job,
      tone: profile.defaultTone ?? "professional",
      emphasis: "general",
      length: "medium",
      responseShape: "structured",
    },
    { variationSeed: `${job.pageUrl}|${randomBytes(8).toString("hex")}` },
  );
  const coverLetterDraft: StructuredCoverLetter =
    letterOut.format === "structured"
      ? letterOut.letter
      : {
          senderBlock: "",
          dateLine: "",
          recipientBlock: "",
          greeting: "Dear Hiring Manager,",
          bodyParagraphs: [letterOut.coverLetter.slice(0, 500), "", ""] as [string, string, string],
          closing: "Sincerely,",
          signature: profile.fullName || "",
        };

  await prisma.jobApplication.update({
    where: { id: applicationId },
    data: {
      coverLetterDraft: coverLetterDraft as unknown as Prisma.InputJsonValue,
      resumeUsed: profileRow?.data != null ? (profileRow.data as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
  await updateSteps(prisma, applicationId, { coverLetterDrafted: true });

  const resumeSuggestions = await resumeTailoringWithOpenAI({ profile, job });
  await prisma.jobApplication.update({
    where: { id: applicationId },
    data: {
      resumeSuggestions: resumeSuggestions as unknown as Prisma.InputJsonValue,
      status: "READY_TO_APPLY",
      preparationSteps: {
        ...DEFAULT_STEPS,
        jobSaved: true,
        fitAnalyzed: true,
        coverLetterDrafted: true,
        resumeSuggestionsGenerated: true,
      },
      preparationError: null,
    },
  });
}

export async function deleteJobApplication(
  prisma: PrismaClient,
  userId: string,
  id: string,
): Promise<boolean> {
  const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.jobApplication.delete({ where: { id } });
  return true;
}

export type UpdateApplicationInput = {
  status?: JobApplicationStatus;
  notes?: string;
  dateApplied?: string | null;
  interviewDate?: string | null;
  followUpDate?: string | null;
  company?: string;
  title?: string;
  location?: string;
};

export async function updateJobApplication(
  prisma: PrismaClient,
  userId: string,
  id: string,
  input: UpdateApplicationInput,
): Promise<JobApplicationDto | null> {
  const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (input.status) data.status = input.status;
  if (typeof input.notes === "string") data.notes = input.notes;
  if (input.company !== undefined) data.company = input.company;
  if (input.title !== undefined) data.title = input.title;
  if (input.location !== undefined) data.location = input.location;
  if (input.dateApplied !== undefined) {
    data.dateApplied = input.dateApplied ? new Date(input.dateApplied) : null;
    if (input.dateApplied && input.status === undefined) data.status = "APPLIED";
  }
  if (input.interviewDate !== undefined) {
    data.interviewDate = input.interviewDate ? new Date(input.interviewDate) : null;
  }
  if (input.followUpDate !== undefined) {
    data.followUpDate = input.followUpDate ? new Date(input.followUpDate) : null;
  }

  const row = await prisma.jobApplication.update({ where: { id }, data });
  return serializeApplication(row);
}
