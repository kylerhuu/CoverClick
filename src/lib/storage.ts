import type {
  AppSettings,
  CachedLetter,
  GenerationPreferences,
  UserProfile,
} from "./types";
import { DEFAULT_GENERATION_PREFS, DEFAULT_SETTINGS, EMPTY_PROFILE } from "./types";
import { STORAGE_KEYS } from "./storageKeys";

export { STORAGE_KEYS };

const PROFILE_KEY = STORAGE_KEYS.profile;
const SETTINGS_KEY = STORAGE_KEYS.settings;
const PREFS_KEY = STORAGE_KEYS.generationPrefs;
const LETTER_CACHE_KEY = STORAGE_KEYS.letterCache;

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
  return {
    fullName: typeof p.fullName === "string" ? p.fullName : "",
    email: typeof p.email === "string" ? p.email : "",
    phone: typeof p.phone === "string" ? p.phone : "",
    location: typeof p.location === "string" ? p.location : "",
    linkedin: typeof p.linkedin === "string" ? p.linkedin : "",
    portfolio: typeof p.portfolio === "string" ? p.portfolio : "",
    school: typeof p.school === "string" ? p.school : "",
    major: typeof p.major === "string" ? p.major : "",
    graduationYear: typeof p.graduationYear === "string" ? p.graduationYear : "",
    summary: typeof p.summary === "string" ? p.summary : "",
    skills: arr(p.skills),
    experienceBullets: arr(p.experienceBullets),
    projectBullets: arr(p.projectBullets),
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
  };
}

function normalizeSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  const s = raw as Record<string, unknown>;
  return {
    apiBaseUrl:
      typeof s.apiBaseUrl === "string" && s.apiBaseUrl.length > 0
        ? s.apiBaseUrl.replace(/\/$/, "")
        : DEFAULT_SETTINGS.apiBaseUrl,
    useMock: typeof s.useMock === "boolean" ? s.useMock : DEFAULT_SETTINGS.useMock,
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
  return { tone, emphasis, length };
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
  return base;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
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
  if (typeof c.pageUrl !== "string" || typeof c.coverLetter !== "string") return null;
  return {
    pageUrl: c.pageUrl,
    coverLetter: c.coverLetter,
    updatedAt: typeof c.updatedAt === "number" ? c.updatedAt : Date.now(),
  };
}

export async function saveCachedLetter(cache: CachedLetter): Promise<void> {
  await chrome.storage.local.set({ [LETTER_CACHE_KEY]: cache });
}
