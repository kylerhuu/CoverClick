import type {
  AppSettings,
  CachedLetter,
  DegreeType,
  GenerationPreferences,
  ProfileStructuredEntries,
  ResumeSectionKey,
  StructuredResume,
  UserProfile,
} from "./types";
import {
  DEFAULT_GENERATION_PREFS,
  DEFAULT_SETTINGS,
  EMPTY_PROFILE,
  EMPTY_STRUCTURED_RESUME,
} from "./types";
import { parseStructuredLetter } from "./generationNormalize";
import { STORAGE_KEYS } from "./storageKeys";
import { hasBuiltInApiOrigin, resolveApiBaseUrl, VITE_COVERCLICK_API_ORIGIN } from "./apiOrigin";
import type { ResumeStudioLayoutSettings } from "./resumeFitSettings";
import { normalizeEducationItem } from "./resumeEducation";

export { STORAGE_KEYS };

const PROFILE_KEY = STORAGE_KEYS.profile;
const SETTINGS_KEY = STORAGE_KEYS.settings;
const PREFS_KEY = STORAGE_KEYS.generationPrefs;
const LETTER_CACHE_KEY = STORAGE_KEYS.letterCache;

function makeStableId(seed: string, idx: number): string {
  return `${seed}-${idx + 1}`;
}

function parseDegreeType(v: unknown): DegreeType {
  const s = typeof v === "string" ? v : "";
  return s === "High School" ||
    s === "Associate" ||
    s === "Bachelor's" ||
    s === "Master's" ||
    s === "MBA" ||
    s === "JD" ||
    s === "MD" ||
    s === "PhD" ||
    s === "Certificate" ||
    s === "Other"
    ? s
    : "Other";
}

function normalizeProfile(raw: unknown): UserProfile {
  if (!raw || typeof raw !== "object") return { ...EMPTY_PROFILE };
  const p = raw as Record<string, unknown>;
  const arr = (v: unknown): string[] =>
    Array.isArray(v)
      ? v
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

  const structuredRaw = p.structuredEntries && typeof p.structuredEntries === "object"
    ? (p.structuredEntries as Record<string, unknown>)
    : {};

  const structuredEntries: ProfileStructuredEntries = {
    experience: Array.isArray(structuredRaw.experience)
      ? structuredRaw.experience
          .filter((x): x is Record<string, unknown> => typeof x === "object" && x != null)
          .map((x) => ({
            company: typeof x.company === "string" ? x.company : "",
            companySubtitle: typeof x.companySubtitle === "string" ? x.companySubtitle : "",
            location: typeof x.location === "string" ? x.location : "",
            title: typeof x.title === "string" ? x.title : "",
            dates: typeof x.dates === "string" ? x.dates : "",
            bullets: arr(x.bullets),
          }))
          .filter((x) => x.company || x.title || x.dates || x.bullets.length)
      : [],
    projects: Array.isArray(structuredRaw.projects)
      ? structuredRaw.projects
          .filter((x): x is Record<string, unknown> => typeof x === "object" && x != null)
          .map((x) => ({
            name: typeof x.name === "string" ? x.name : "",
            subtitle: typeof x.subtitle === "string" ? x.subtitle : "",
            techStack: arr(x.techStack),
            bullets: arr(x.bullets),
          }))
          .filter((x) => x.name || x.subtitle || x.techStack.length || x.bullets.length)
      : [],
    education: Array.isArray(structuredRaw.education)
      ? structuredRaw.education
          .filter((x): x is Record<string, unknown> => typeof x === "object" && x != null)
          .map((x) => ({
            school: typeof x.school === "string" ? x.school : "",
            degreeType: parseDegreeType(x.degreeType),
            degree: typeof x.degree === "string" ? x.degree : "",
            major: typeof x.major === "string" ? x.major : "",
            concentrationOrMinor: typeof x.concentrationOrMinor === "string" ? x.concentrationOrMinor : "",
            gpa: typeof x.gpa === "string" ? x.gpa : "",
            graduationDate: typeof x.graduationDate === "string" ? x.graduationDate : "",
            details: arr(x.details),
          }))
          .filter((x) => x.school || x.degree || x.major || x.graduationDate)
      : [],
    skills: Array.isArray(structuredRaw.skills)
      ? structuredRaw.skills
          .filter((x): x is Record<string, unknown> => typeof x === "object" && x != null)
          .map((x) => ({ category: typeof x.category === "string" ? x.category : "", items: arr(x.items) }))
          .filter((x) => x.category || x.items.length)
      : [],
    warnings: arr(structuredRaw.warnings),
  };

  const skillsFromStructured = structuredEntries.skills.flatMap((g) => g.items);
  const expBulletsFromStructured = structuredEntries.experience.flatMap((e) => e.bullets);
  const projBulletsFromStructured = structuredEntries.projects.flatMap((e) => e.bullets);
  const firstEdu = structuredEntries.education[0];

  const skillsLegacy = arr(p.skills);
  const experienceBulletsLegacy = arr(p.experienceBullets);
  const projectBulletsLegacy = arr(p.projectBullets);

  return {
    fullName: typeof p.fullName === "string" ? p.fullName : "",
    email: typeof p.email === "string" ? p.email : "",
    phone: typeof p.phone === "string" ? p.phone : "",
    location: typeof p.location === "string" ? p.location : "",
    linkedin: typeof p.linkedin === "string" ? p.linkedin : "",
    portfolio: typeof p.portfolio === "string" ? p.portfolio : "",
    school:
      typeof p.school === "string" && p.school.trim().length > 0
        ? p.school
        : firstEdu?.school ?? "",
    major:
      typeof p.major === "string" && p.major.trim().length > 0
        ? p.major
        : firstEdu?.major ?? "",
    graduationYear:
      typeof p.graduationYear === "string" && p.graduationYear.trim().length > 0
        ? p.graduationYear
        : firstEdu?.graduationDate ?? "",
    summary: typeof p.summary === "string" ? p.summary : "",
    skills: skillsLegacy.length > 0 ? skillsLegacy : skillsFromStructured,
    experienceBullets: experienceBulletsLegacy.length > 0 ? experienceBulletsLegacy : expBulletsFromStructured,
    projectBullets: projectBulletsLegacy.length > 0 ? projectBulletsLegacy : projBulletsFromStructured,
    resumeText: typeof p.resumeText === "string" ? p.resumeText : "",
    defaultTone:
      p.defaultTone === "warm" ||
      p.defaultTone === "concise" ||
      p.defaultTone === "enthusiastic" ||
      p.defaultTone === "formal" ||
      p.defaultTone === "professional"
        ? p.defaultTone
        : "professional",
    signatureBlock: typeof p.signatureBlock === "string" ? p.signatureBlock : "",
    structuredEntries,
  };
}

function pickStoredApiOverride(s: Record<string, unknown>): string {
  const direct = typeof s.apiOriginOverride === "string" ? s.apiOriginOverride.trim().replace(/\/+$/, "") : "";
  if (direct.length > 0) return direct;
  const legacy = typeof s.apiBaseUrl === "string" ? s.apiBaseUrl.trim().replace(/\/+$/, "") : "";
  if (!legacy || legacy === "https://api.example.com") return "";
  const built = VITE_COVERCLICK_API_ORIGIN.replace(/\/+$/, "");
  if (built.length > 0 && legacy === built) return "";
  return legacy;
}

function normalizeSettings(raw: unknown): AppSettings {
  const useMockDefault = hasBuiltInApiOrigin() ? false : DEFAULT_SETTINGS.useMock;
  if (!raw || typeof raw !== "object") {
    const apiOriginOverride = undefined;
    const apiBaseUrl = resolveApiBaseUrl("");
    return {
      apiBaseUrl,
      apiOriginOverride,
      useMock: useMockDefault,
      authToken: undefined,
      authEmail: undefined,
    };
  }
  const s = raw as Record<string, unknown>;
  const apiOriginOverrideRaw = pickStoredApiOverride(s);
  const apiOriginOverride = apiOriginOverrideRaw.length > 0 ? apiOriginOverrideRaw : undefined;
  const apiBaseUrl = resolveApiBaseUrl(apiOriginOverrideRaw);
  return {
    apiBaseUrl,
    apiOriginOverride,
    useMock: typeof s.useMock === "boolean" ? s.useMock : useMockDefault,
    authToken:
      typeof s.authToken === "string" && s.authToken.trim().length > 0 ? s.authToken.trim() : undefined,
    authEmail:
      typeof s.authEmail === "string" && s.authEmail.trim().length > 0 ? s.authEmail.trim() : undefined,
  };
}

function normalizePrefs(raw: unknown): GenerationPreferences {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_GENERATION_PREFS };
  const g = raw as Record<string, unknown>;
  const emphasis =
    g.emphasis === "technical" ||
    g.emphasis === "product" ||
    g.emphasis === "consulting" ||
    g.emphasis === "finance" ||
    g.emphasis === "startup" ||
    g.emphasis === "general"
      ? g.emphasis
      : DEFAULT_GENERATION_PREFS.emphasis;
  const length =
    g.length === "short" || g.length === "long" || g.length === "medium"
      ? g.length
      : DEFAULT_GENERATION_PREFS.length;
  const tone =
    g.tone === "warm" ||
    g.tone === "concise" ||
    g.tone === "enthusiastic" ||
    g.tone === "formal" ||
    g.tone === "professional"
      ? g.tone
      : DEFAULT_GENERATION_PREFS.tone;
  const responseShape =
    g.responseShape === "plain" || g.responseShape === "structured" || g.responseShape === "auto"
      ? g.responseShape
      : DEFAULT_GENERATION_PREFS.responseShape;
  return { tone, emphasis, length, responseShape };
}

export async function loadProfile(): Promise<UserProfile> {
  const data = await chrome.storage.local.get(PROFILE_KEY);
  return normalizeProfile(data[PROFILE_KEY]);
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await chrome.storage.local.set({ [PROFILE_KEY]: profile });
}

export async function loadSettings(): Promise<AppSettings> {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  const base = normalizeSettings(data[SETTINGS_KEY]);
  const envMock = import.meta.env.VITE_USE_MOCK;
  if (envMock === "true") return { ...base, useMock: true };
  if (envMock === "false") return { ...base, useMock: false };
  if (import.meta.env.PROD && hasBuiltInApiOrigin()) return { ...base, useMock: false };
  return base;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await chrome.storage.local.set({
    [SETTINGS_KEY]: {
      useMock: settings.useMock,
      authToken: settings.authToken,
      authEmail: settings.authEmail,
      apiOriginOverride: settings.apiOriginOverride,
    },
  });
}

export async function loadGenerationPrefs(profile?: UserProfile): Promise<GenerationPreferences> {
  const data = await chrome.storage.local.get(PREFS_KEY);
  if (data[PREFS_KEY] == null && profile) {
    return { ...DEFAULT_GENERATION_PREFS, tone: profile.defaultTone };
  }
  return normalizePrefs(data[PREFS_KEY]);
}

export async function saveGenerationPrefs(prefs: GenerationPreferences): Promise<void> {
  await chrome.storage.local.set({ [PREFS_KEY]: prefs });
}

export async function loadCachedLetter(): Promise<CachedLetter | null> {
  const data = await chrome.storage.local.get(LETTER_CACHE_KEY);
  const raw = data[LETTER_CACHE_KEY];
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.pageUrl !== "string") return null;
  const updatedAt = typeof c.updatedAt === "number" ? c.updatedAt : Date.now();
  const structured = parseStructuredLetter(c.structured);
  if (structured) {
    return { pageUrl: c.pageUrl, updatedAt, structured };
  }
  if (typeof c.coverLetter === "string" && c.coverLetter.trim()) {
    return { pageUrl: c.pageUrl, updatedAt, coverLetter: c.coverLetter };
  }
  return null;
}

export async function saveCachedLetter(cache: CachedLetter): Promise<void> {
  await chrome.storage.local.set({ [LETTER_CACHE_KEY]: cache });
}

/** Clears the last generated letter cache (call on sign-out to avoid showing another account’s letter). */
export async function clearCachedLetter(): Promise<void> {
  await chrome.storage.local.remove(LETTER_CACHE_KEY);
}

/**
 * Wipes locally stored profile, resumes, applications, and auth session.
 * Keeps API connection settings (and mock flag) so the extension can sign in again.
 */
export async function clearLocalUserData(): Promise<AppSettings> {
  await chrome.storage.local.remove([
    PROFILE_KEY,
    PREFS_KEY,
    LETTER_CACHE_KEY,
    STORAGE_KEYS.resumeStudio,
    STORAGE_KEYS.resumeStudioLayout,
    STORAGE_KEYS.resumeLibrary,
    STORAGE_KEYS.applications,
    STORAGE_KEYS.onboarding,
    "coverclick_options_tab",
  ]);
  const s = await loadSettings();
  const next: AppSettings = {
    ...s,
    authToken: undefined,
    authEmail: undefined,
  };
  await saveSettings(next);
  await saveProfile({ ...EMPTY_PROFILE });
  return next;
}

export function normalizeStructuredResume(raw: unknown): StructuredResume {
  if (!raw || typeof raw !== "object") return { ...EMPTY_STRUCTURED_RESUME };
  const r = raw as Record<string, unknown>;
  const arr = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
      : [];
  const contactRaw = r.contact && typeof r.contact === "object" ? (r.contact as Record<string, unknown>) : {};
  const sectionDefaults: Record<ResumeSectionKey, { isVisible: boolean; order: number }> = {
    summary: { isVisible: true, order: 0 },
    experience: { isVisible: true, order: 1 },
    projects: { isVisible: true, order: 2 },
    education: { isVisible: true, order: 3 },
    skills: { isVisible: true, order: 4 },
  };
  const sectionRaw = r.sectionSettings && typeof r.sectionSettings === "object"
    ? (r.sectionSettings as Record<string, unknown>)
    : {};
  const sectionSettings: StructuredResume["sectionSettings"] = {
    summary: {
      isVisible:
        typeof (sectionRaw.summary as Record<string, unknown> | undefined)?.isVisible === "boolean"
          ? ((sectionRaw.summary as Record<string, unknown>).isVisible as boolean)
          : sectionDefaults.summary.isVisible,
      order:
        typeof (sectionRaw.summary as Record<string, unknown> | undefined)?.order === "number"
          ? Number((sectionRaw.summary as Record<string, unknown>).order)
          : sectionDefaults.summary.order,
    },
    experience: {
      isVisible:
        typeof (sectionRaw.experience as Record<string, unknown> | undefined)?.isVisible === "boolean"
          ? ((sectionRaw.experience as Record<string, unknown>).isVisible as boolean)
          : sectionDefaults.experience.isVisible,
      order:
        typeof (sectionRaw.experience as Record<string, unknown> | undefined)?.order === "number"
          ? Number((sectionRaw.experience as Record<string, unknown>).order)
          : sectionDefaults.experience.order,
    },
    projects: {
      isVisible:
        typeof (sectionRaw.projects as Record<string, unknown> | undefined)?.isVisible === "boolean"
          ? ((sectionRaw.projects as Record<string, unknown>).isVisible as boolean)
          : sectionDefaults.projects.isVisible,
      order:
        typeof (sectionRaw.projects as Record<string, unknown> | undefined)?.order === "number"
          ? Number((sectionRaw.projects as Record<string, unknown>).order)
          : sectionDefaults.projects.order,
    },
    education: {
      isVisible:
        typeof (sectionRaw.education as Record<string, unknown> | undefined)?.isVisible === "boolean"
          ? ((sectionRaw.education as Record<string, unknown>).isVisible as boolean)
          : sectionDefaults.education.isVisible,
      order:
        typeof (sectionRaw.education as Record<string, unknown> | undefined)?.order === "number"
          ? Number((sectionRaw.education as Record<string, unknown>).order)
          : sectionDefaults.education.order,
    },
    skills: {
      isVisible:
        typeof (sectionRaw.skills as Record<string, unknown> | undefined)?.isVisible === "boolean"
          ? ((sectionRaw.skills as Record<string, unknown>).isVisible as boolean)
          : sectionDefaults.skills.isVisible,
      order:
        typeof (sectionRaw.skills as Record<string, unknown> | undefined)?.order === "number"
          ? Number((sectionRaw.skills as Record<string, unknown>).order)
          : sectionDefaults.skills.order,
    },
  };

  return {
    contact: {
      fullName: typeof contactRaw.fullName === "string" ? contactRaw.fullName : "",
      email: typeof contactRaw.email === "string" ? contactRaw.email : "",
      phone: typeof contactRaw.phone === "string" ? contactRaw.phone : "",
      location: typeof contactRaw.location === "string" ? contactRaw.location : "",
      links: arr(contactRaw.links),
    },
    summary: typeof r.summary === "string" ? r.summary : "",
    education: Array.isArray(r.education)
      ? r.education
          .filter((x): x is Record<string, unknown> => typeof x === "object" && x != null)
          .map((x, idx) =>
            normalizeEducationItem({
              id: typeof x.id === "string" && x.id.trim() ? x.id : makeStableId("edu", idx),
              school: typeof x.school === "string" ? x.school : "",
              degreeType: parseDegreeType(x.degreeType),
              degree: typeof x.degree === "string" ? x.degree : "",
              major: typeof x.major === "string" ? x.major : "",
              concentrationOrMinor: typeof x.concentrationOrMinor === "string" ? x.concentrationOrMinor : "",
              gpa: typeof x.gpa === "string" ? x.gpa : "",
              graduationDate: typeof x.graduationDate === "string"
                ? x.graduationDate
                : typeof x.dates === "string"
                  ? x.dates
                  : "",
              details: arr(x.details),
            }),
          )
      : [],
    experience: Array.isArray(r.experience)
      ? r.experience
          .filter((x): x is Record<string, unknown> => typeof x === "object" && x != null)
          .map((x, idx) => ({
            id: typeof x.id === "string" && x.id.trim() ? x.id : makeStableId("exp", idx),
            company: typeof x.company === "string" ? x.company : "",
            companySubtitle: typeof x.companySubtitle === "string" ? x.companySubtitle : "",
            title: typeof x.title === "string" ? x.title : "",
            dates: typeof x.dates === "string" ? x.dates : "",
            location: typeof x.location === "string" ? x.location : "",
            bullets: arr(x.bullets),
            locked: x.locked === true,
            priority:
              x.priority === "medium" || x.priority === "low" || x.priority === "high" ? x.priority : undefined,
          }))
      : [],
    projects: Array.isArray(r.projects)
      ? r.projects
          .filter((x): x is Record<string, unknown> => typeof x === "object" && x != null)
          .map((x, idx) => ({
            id: typeof x.id === "string" && x.id.trim() ? x.id : makeStableId("proj", idx),
            name: typeof x.name === "string" ? x.name : "",
            subtitle:
              typeof x.subtitle === "string"
                ? x.subtitle
                : typeof x.role === "string"
                  ? x.role
                  : "",
            techStack: arr(x.techStack),
            bullets: arr(x.bullets),
            locked: x.locked === true,
            priority:
              x.priority === "medium" || x.priority === "low" || x.priority === "high" ? x.priority : undefined,
          }))
      : [],
    skills: Array.isArray(r.skills)
      ? r.skills
          .filter((x): x is Record<string, unknown> => typeof x === "object" && x != null)
          .map((x, idx) => ({
            id: typeof x.id === "string" && x.id.trim() ? x.id : makeStableId("skills", idx),
            category: typeof x.category === "string" ? x.category : "",
            items: arr(x.items),
          }))
      : [],
    certifications: arr(r.certifications),
    leadership: arr(r.leadership),
    links: arr(r.links),
    sectionSettings,
  };
}

export async function loadResumeStudio(): Promise<StructuredResume> {
  const { getActiveVariant } = await import("./resumeLibrary");
  return (await getActiveVariant()).resume;
}

export async function saveResumeStudio(resume: StructuredResume): Promise<void> {
  const { updateActiveResume } = await import("./resumeLibrary");
  await updateActiveResume(resume);
}

export async function loadResumeStudioLayoutSettings(): Promise<ResumeStudioLayoutSettings> {
  const { getActiveVariant } = await import("./resumeLibrary");
  return (await getActiveVariant()).layoutSettings;
}

export async function saveResumeStudioLayoutSettings(settings: ResumeStudioLayoutSettings): Promise<void> {
  const { updateActiveLayoutSettings } = await import("./resumeLibrary");
  await updateActiveLayoutSettings(settings);
}
