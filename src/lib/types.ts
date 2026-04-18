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
}

export interface JobContext {
  jobTitle: string;
  companyName: string;
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
  apiBaseUrl: string;
  useMock: boolean;
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
};

export const DEFAULT_SETTINGS: AppSettings = {
  apiBaseUrl: "https://api.example.com",
  useMock: true,
};

export const DEFAULT_GENERATION_PREFS: GenerationPreferences = {
  tone: "professional",
  emphasis: "general",
  length: "medium",
  responseShape: "structured",
};
