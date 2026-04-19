import type {
  AppSettings,
  CachedLetter,
  GenerationPreferences,
  UserProfile,
} from "./types";
import { DEFAULT_GENERATION_PREFS, DEFAULT_SETTINGS, EMPTY_PROFILE } from "./types";
import { parseStructuredLetter } from "./generationNormalize";
import { STORAGE_KEYS } from "./storageKeys";
import { hasBuiltInApiOrigin, resolveApiBaseUrl, VITE_COVERCLICK_API_ORIGIN } from "./apiOrigin";

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
