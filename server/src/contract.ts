/** Mirrors extension `src/lib/types.ts` for request/response validation. */

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
  responseShape: ResponseShapePreference;
  promptBrief?: string;
}

export interface StructuredCoverLetter {
  senderBlock: string;
  dateLine: string;
  recipientBlock: string;
  greeting: string;
  bodyParagraphs: [string, string, string];
  closing: string;
  signature: string;
}

export type ShouldApplyRecommendation = "YES" | "MAYBE" | "NO";

export interface JobFitScoreRequest {
  profile: UserProfile;
  job: JobContext;
}

export interface JobFitScoreResponse {
  atsScore: number;
  jobFitScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  recommendedChanges: string[];
  shouldApply: ShouldApplyRecommendation;
}

export interface ResumeTailoringRequest {
  profile: UserProfile;
  job: JobContext;
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

export interface ResumeContact {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
}

export interface ResumeEducationItem {
  school: string;
  degree: string;
  dates: string;
  details: string[];
}

export interface ResumeExperienceItem {
  company: string;
  title: string;
  dates: string;
  location: string;
  bullets: string[];
}

export interface ResumeProjectItem {
  name: string;
  role: string;
  dates: string;
  bullets: string[];
}

export interface ResumeSkillGroup {
  category: string;
  items: string[];
}

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
}

export interface ResumeSummaryGenerateRequest {
  targetRole?: string;
  resume: StructuredResume;
}

export interface ResumeSummaryGenerateResponse {
  summary: string;
}
