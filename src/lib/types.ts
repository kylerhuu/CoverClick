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
}

export interface GenerationResponse {
  coverLetter: string;
}

export interface GenerationPreferences {
  tone: DefaultTone;
  emphasis: Emphasis;
  length: LetterLength;
}

export interface CachedLetter {
  pageUrl: string;
  coverLetter: string;
  updatedAt: number;
}

export interface AppSettings {
  apiBaseUrl: string;
  /** When true, skip network and return a realistic placeholder letter. */
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
};
