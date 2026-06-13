import type { StructuredResume } from "./types";
import type { ResumeStudioLayoutSettings } from "./resumeFitSettings";
import { EMPTY_STRUCTURED_RESUME } from "./types";
import { hasProfileResumeData, hasResumeStudioContent, profileToStructuredResume } from "./profileToStructuredResume";
import { normalizeStructuredResume } from "./storage";

let libraryWriteQueue: Promise<void> = Promise.resolve();

function enqueueLibraryWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = libraryWriteQueue.then(fn, fn);
  libraryWriteQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
import {
  DEFAULT_RESUME_LAYOUT_SETTINGS,
  normalizeFitMode,
  normalizeTargetLength,
} from "./resumeFitSettings";
import { STORAGE_KEYS } from "./storageKeys";

export const RESUME_VARIANT_NAME_MAX = 40;

export interface ResumeVariant {
  id: string;
  name: string;
  resume: StructuredResume;
  layoutSettings: ResumeStudioLayoutSettings;
  createdAt: number;
  updatedAt: number;
}

export interface ResumeLibraryStore {
  schemaVersion: 1;
  activeVariantId: string;
  variants: ResumeVariant[];
}

function newVariantId(): string {
  return `var_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneResume(resume: StructuredResume): StructuredResume {
  return JSON.parse(JSON.stringify(resume)) as StructuredResume;
}

function cloneLayout(settings: ResumeStudioLayoutSettings): ResumeStudioLayoutSettings {
  return { ...settings };
}

function normalizeLayout(raw: unknown): ResumeStudioLayoutSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_RESUME_LAYOUT_SETTINGS };
  const o = raw as Record<string, unknown>;
  return {
    fitMode: normalizeFitMode(o.fitMode),
    targetLength: normalizeTargetLength(o.targetLength),
  };
}

function normalizeVariant(raw: unknown): ResumeVariant | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!id || !name) return null;
  const createdAt = typeof o.createdAt === "number" ? o.createdAt : Date.now();
  const updatedAt = typeof o.updatedAt === "number" ? o.updatedAt : createdAt;
  return {
    id,
    name,
    resume: normalizeStructuredResume(o.resume ?? EMPTY_STRUCTURED_RESUME),
    layoutSettings: normalizeLayout(o.layoutSettings),
    createdAt,
    updatedAt,
  };
}

function normalizeLibrary(raw: unknown): ResumeLibraryStore | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schemaVersion !== 1) return null;
  const variants = Array.isArray(o.variants)
    ? o.variants.map(normalizeVariant).filter((v): v is ResumeVariant => Boolean(v))
    : [];
  if (variants.length === 0) return null;
  const activeVariantId =
    typeof o.activeVariantId === "string" && variants.some((v) => v.id === o.activeVariantId)
      ? o.activeVariantId
      : variants[0].id;
  return { schemaVersion: 1, activeVariantId, variants };
}

async function migrateFromLegacy(): Promise<ResumeLibraryStore> {
  const keys = [STORAGE_KEYS.resumeStudio, STORAGE_KEYS.resumeStudioLayout, STORAGE_KEYS.profile] as const;
  const data = await chrome.storage.local.get([...keys]);
  const storage = await import("./storage");
  const legacyResume = storage.normalizeStructuredResume(data[STORAGE_KEYS.resumeStudio]);
  const legacyLayout = normalizeLayout(data[STORAGE_KEYS.resumeStudioLayout]);

  let resume = legacyResume;
  if (!hasResumeStudioContent(resume)) {
    const profile = await storage.loadProfile();
    if (hasProfileResumeData(profile)) {
      resume = profileToStructuredResume(profile);
    }
  }

  const now = Date.now();
  const id = newVariantId();
  return {
    schemaVersion: 1,
    activeVariantId: id,
    variants: [
      {
        id,
        name: "General",
        resume,
        layoutSettings: legacyLayout,
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

export async function loadResumeLibrary(): Promise<ResumeLibraryStore> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.resumeLibrary);
  const existing = normalizeLibrary(data[STORAGE_KEYS.resumeLibrary]);
  if (existing) return existing;

  const migrated = await migrateFromLegacy();
  await saveResumeLibrary(migrated);
  return migrated;
}

export async function saveResumeLibrary(store: ResumeLibraryStore): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.resumeLibrary]: store });
}

export async function getActiveVariant(): Promise<ResumeVariant> {
  const library = await loadResumeLibrary();
  const active = library.variants.find((v) => v.id === library.activeVariantId);
  return active ?? library.variants[0];
}

export async function setActiveVariant(id: string): Promise<ResumeVariant> {
  const library = await loadResumeLibrary();
  const match = library.variants.find((v) => v.id === id);
  if (!match) throw new Error("Resume variant not found.");
  const next = { ...library, activeVariantId: id };
  await saveResumeLibrary(next);
  return match;
}

export async function updateActiveResume(resume: StructuredResume): Promise<void> {
  return enqueueLibraryWrite(async () => {
    const library = await loadResumeLibrary();
    const idx = library.variants.findIndex((v) => v.id === library.activeVariantId);
    if (idx < 0) throw new Error("Active resume variant not found.");
    const variants = [...library.variants];
    variants[idx] = { ...variants[idx], resume: cloneResume(resume), updatedAt: Date.now() };
    await saveResumeLibrary({ ...library, variants });
  });
}

export async function updateActiveLayoutSettings(settings: ResumeStudioLayoutSettings): Promise<void> {
  return enqueueLibraryWrite(async () => {
    const library = await loadResumeLibrary();
    const idx = library.variants.findIndex((v) => v.id === library.activeVariantId);
    if (idx < 0) throw new Error("Active resume variant not found.");
    const variants = [...library.variants];
    variants[idx] = {
      ...variants[idx],
      layoutSettings: cloneLayout(settings),
      updatedAt: Date.now(),
    };
    await saveResumeLibrary({ ...library, variants });
  });
}

export async function updateVariantResume(id: string, resume: StructuredResume): Promise<void> {
  return enqueueLibraryWrite(async () => {
    const library = await loadResumeLibrary();
    const idx = library.variants.findIndex((v) => v.id === id);
    if (idx < 0) throw new Error("Resume variant not found.");
    const variants = [...library.variants];
    variants[idx] = { ...variants[idx], resume: cloneResume(resume), updatedAt: Date.now() };
    await saveResumeLibrary({ ...library, variants });
  });
}

export function validateVariantName(
  name: string,
  variants: ResumeVariant[],
  excludeId?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Enter a name for this resume.";
  if (trimmed.length > RESUME_VARIANT_NAME_MAX) {
    return `Name must be ${RESUME_VARIANT_NAME_MAX} characters or fewer.`;
  }
  const lower = trimmed.toLowerCase();
  if (variants.some((v) => v.id !== excludeId && v.name.trim().toLowerCase() === lower)) {
    return "A resume with this name already exists.";
  }
  return null;
}

export async function createVariant(name: string): Promise<ResumeVariant> {
  const library = await loadResumeLibrary();
  const error = validateVariantName(name, library.variants);
  if (error) throw new Error(error);

  const active = library.variants.find((v) => v.id === library.activeVariantId) ?? library.variants[0];
  const now = Date.now();
  const variant: ResumeVariant = {
    id: newVariantId(),
    name: name.trim(),
    resume: cloneResume(active.resume),
    layoutSettings: cloneLayout(active.layoutSettings),
    createdAt: now,
    updatedAt: now,
  };

  await saveResumeLibrary({
    ...library,
    activeVariantId: variant.id,
    variants: [...library.variants, variant],
  });
  return variant;
}
