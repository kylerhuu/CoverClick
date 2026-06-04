export type DefaultTone =
  | "professional"
  | "warm"
  | "concise"
  | "enthusiastic"
  | "formal";

export type Emphasis =
  | "general"
  | "technical"
  | "product"
  | "consulting"
  | "finance"
  | "startup";

export type LetterLength = "short" | "medium" | "long";

/** What the client asks the backend to return when supported. */
export type ResponseShapePreference = "structured" | "plain" | "auto";

export type DegreeType =
  | "High School"
  | "Associate"
  | "Bachelor's"
  | "Master's"
  | "MBA"
  | "JD"
  | "MD"
  | "PhD"
  | "Certificate"
  | "Other";

export interface ProfileExperienceEntry {
  company: string;
  companySubtitle?: string;
  location?: string;
  title: string;
  dates: string;
  bullets: string[];
}

export interface ProfileProjectEntry {
  name: string;
  subtitle?: string;
  techStack: string[];
  bullets: string[];
}

export interface ProfileEducationEntry {
  school: string;
  degreeType: DegreeType;
  degree: string;
  major?: string;
  concentrationOrMinor?: string;
  gpa?: string;
  graduationDate?: string;
  details: string[];
}

export interface ProfileSkillCategory {
  category: string;
  items: string[];
}

export interface ProfileStructuredEntries {
  experience: ProfileExperienceEntry[];
  projects: ProfileProjectEntry[];
  education: ProfileEducationEntry[];
  skills: ProfileSkillCategory[];
  warnings: string[];
}

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  school: string;
  major: string;
  graduationYear: string;
  summary: string;
  skills: string[];
  experienceBullets: string[];
  projectBullets: string[];
  resumeText: string;
  defaultTone: DefaultTone;
  signatureBlock: string;
  /** Optional richer parsing payload (backward-compatible with legacy flat fields). */
  structuredEntries?: ProfileStructuredEntries;
}

import type { CompanyExtractionDebugReport } from "./companyExtractionDebugTypes";

/** Scraped company option shown when multiple plausible employers were found. */
export type CompanyPickOption = {
  value: string;
  /** Human-readable origin, e.g. "Job page" or "Structured data". */
  source: string;
  /** Higher = more trusted default (merge layer assigns). */
  confidence: number;
};

export type CompanyResolution = "auto" | "not_found" | "manual";

export interface JobContext {
  jobTitle: string;
  companyName: string;
  /** Accepted normalized picks from merge (may be empty). */
  companyCandidates?: CompanyPickOption[];
  companyResolution?: CompanyResolution;
  /** Raw vs accepted breakdown for debug UI (always set on scrape). */
  companyExtractionDebug?: CompanyExtractionDebugReport;
  /** Present when content script includes Phase 1+ debug pipeline (value 2). */
  scrapePipelineVersion?: number;
  pageUrl: string;
  descriptionText: string;
  scrapedAt: number;
}

export interface GenerationRequest {
  profile: UserProfile;
  job: JobContext;
  tone: DefaultTone;
  emphasis: Emphasis;
  length: LetterLength;
  /** Preferred response shape; backend may ignore when unsupported. */
  responseShape: ResponseShapePreference;
}

export interface ResumeContact {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
}

export interface ResumeEducationItem {
  id?: string;
  school: string;
  degreeType?: DegreeType;
  degree: string;
  major: string;
  concentrationOrMinor?: string;
  gpa?: string;
  graduationDate: string;
  details: string[];
}

export type ResumeEntryPriority = "high" | "medium" | "low";

export interface ResumeExperienceItem {
  id?: string;
  /** Never hidden or auto-trimmed in export layout. */
  locked?: boolean;
  /** Used by one-page layout to compress lower-priority entries first. Defaults to high. */
  priority?: ResumeEntryPriority;
  company: string;
  companySubtitle?: string;
  title: string;
  dates: string;
  location: string;
  bullets: string[];
}

export interface ResumeProjectItem {
  id?: string;
  locked?: boolean;
  priority?: ResumeEntryPriority;
  name: string;
  subtitle: string;
  techStack: string[];
  bullets: string[];
}

export interface ResumeSkillGroup {
  id?: string;
  category: string;
  items: string[];
}

export type ResumeSectionKey = "summary" | "experience" | "projects" | "education" | "skills";

export type ResumeSectionSettings = {
  isVisible: boolean;
  order: number;
};

export interface StructuredResume {
  contact: ResumeContact;
  summary: string;
  education: ResumeEducationItem[];
  experience: ResumeExperienceItem[];
  projects: ResumeProjectItem[];
  skills: ResumeSkillGroup[];
  certifications: string[];
  leadership: string[];
  links: string[];
  sectionSettings: Record<ResumeSectionKey, ResumeSectionSettings>;
}

export interface ResumeSummaryGenerateRequest {
  targetRole?: string;
  resume: StructuredResume;
}

export interface ResumeSummaryGenerateResponse {
  summary: string;
}

export type ResumeOptimizeSection = "summary" | "experience" | "projects" | "skills" | "education";
export type ResumeOptimizeChangeType = "rewrite" | "add" | "remove" | "reorder" | "emphasize";
export type ResumeOptimizePriority = "high" | "medium" | "low";

export interface ResumeOptimizationSuggestion {
  id: string;
  section: ResumeOptimizeSection;
  targetId?: string;
  /** Optional explicit field path to support multi-entry targeting. */
  fieldPath?: "summary" | "bullets" | "techStack" | "subtitle" | "details" | "items";
  changeType: ResumeOptimizeChangeType;
  currentText: string;
  suggestedText: string;
  reason: string;
  priority: ResumeOptimizePriority;
}

export interface ResumeOptimizeForJobRequest {
  resume: StructuredResume;
  job: JobContext;
}

export interface ResumeOptimizeForJobResponse {
  summary: string;
  suggestions: ResumeOptimizationSuggestion[];
  keywordsToAdd: string[];
  warnings: string[];
}

export interface ResumeTailoringBulletSuggestion {
  originalIdea: string;
  improvedBullet: string;
  reason: string;
}

export interface ResumeTailoringResponse {
  summary: string;
  skillsToAdd: string[];
  keywordsToInclude: string[];
  experienceToEmphasize: string[];
  bulletRewriteSuggestions: ResumeTailoringBulletSuggestion[];
  sectionPriority: string[];
  warnings: string[];
}

/**
 * Canonical letter shape for UI, exports, and cache.
 * Backend may return this directly, or plain text to be coerced.
 */
export interface StructuredCoverLetter {
  senderBlock: string;
  dateLine: string;
  recipientBlock: string;
  greeting: string;
  /** Exactly three body paragraphs. */
  bodyParagraphs: [string, string, string];
  closing: string;
  signature: string;
}

/** Normalized generation output used by the popup. */
export type GenerationResult =
  | { shape: "structured"; letter: StructuredCoverLetter }
  | { shape: "plain"; text: string };

/**
 * Wire contract for POST /api/generate-cover-letter
 * (server may extend; unknown fields ignored on client.)
 */
export interface ApiGenerationResponseStructured {
  format: "structured";
  letter: StructuredCoverLetter;
}

export interface ApiGenerationResponsePlain {
  format: "plain";
  coverLetter: string;
}

/** Legacy servers that only return a string body. */
export interface ApiGenerationResponseLegacy {
  coverLetter: string;
}

export type ApiGenerationResponse =
  | ApiGenerationResponseStructured
  | ApiGenerationResponsePlain
  | ApiGenerationResponseLegacy;

export interface GenerationPreferences {
  tone: DefaultTone;
  emphasis: Emphasis;
  length: LetterLength;
  responseShape: ResponseShapePreference;
}

export interface CachedLetter {
  pageUrl: string;
  updatedAt: number;
  structured?: StructuredCoverLetter;
  /** @deprecated v1 cache — migrated on read */
  coverLetter?: string;
}

export interface AppSettings {
  /** Resolved API origin (baked `VITE_COVERCLICK_API_ORIGIN` ± optional override). */
  apiBaseUrl: string;
  /** Optional override only; empty means “use baked default from build.” */
  apiOriginOverride?: string;
  useMock: boolean;
  /** Bearer session from CoverClick server (Google sign-in exchange). */
  authToken?: string;
  /** Display only — which account last signed in. */
  authEmail?: string;
}

/** `GET /api/me` — subscription gate for the extension shell. */
export interface AccountMeResponse {
  id: string;
  email: string;
  subscriptionStatus: string;
  hasPaidAccess: boolean;
  subscriptionPeriodEnd: string | null;
}

/** `POST /api/auth/exchange` */
export interface AuthExchangeResponse {
  token: string;
  user: { id: string; email: string };
  hasPaidAccess: boolean;
  subscriptionStatus: string;
  subscriptionPeriodEnd?: string | null;
}

export const EMPTY_PROFILE: UserProfile = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  portfolio: "",
  school: "",
  major: "",
  graduationYear: "",
  summary: "",
  skills: [],
  experienceBullets: [],
  projectBullets: [],
  resumeText: "",
  defaultTone: "professional",
  signatureBlock: "",
  structuredEntries: undefined,
};

export const DEFAULT_SETTINGS: AppSettings = {
  /** Resolved against `VITE_COVERCLICK_API_ORIGIN` on load; may be empty until first load. */
  apiBaseUrl: "",
  apiOriginOverride: undefined,
  useMock: true,
};

export const DEFAULT_GENERATION_PREFS: GenerationPreferences = {
  tone: "professional",
  emphasis: "general",
  length: "medium",
  responseShape: "structured",
};

export const EMPTY_STRUCTURED_RESUME: StructuredResume = {
  contact: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    links: [],
  },
  summary: "",
  education: [],
  experience: [],
  projects: [],
  skills: [],
  certifications: [],
  leadership: [],
  links: [],
  sectionSettings: {
    summary: { isVisible: true, order: 0 },
    experience: { isVisible: true, order: 1 },
    projects: { isVisible: true, order: 2 },
    education: { isVisible: true, order: 3 },
    skills: { isVisible: true, order: 4 },
  },
};
