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

export type JobApplicationStatus =
  | "SAVED"
  | "PREPARING"
  | "READY_TO_APPLY"
  | "APPLIED"
  | "INTERVIEWING"
  | "OFFER"
  | "REJECTED"
  | "ARCHIVED";

export interface PreparationSteps {
  jobSaved: boolean;
  fitAnalyzed: boolean;
  coverLetterDrafted: boolean;
  resumeSuggestionsGenerated: boolean;
}

export interface JobApplicationRecord {
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
  coverLetterDraft: StructuredCoverLetter | null;
  resumeSuggestions: ResumeTailoringResponse | null;
  preparationSteps: PreparationSteps | null;
  preparationError: string | null;
  notes: string;
  interviewDate: string | null;
  followUpDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationStats {
  saved: number;
  readyToApply: number;
  applied: number;
  interviewing: number;
}

export interface CreateApplicationRequest {
  company: string;
  title: string;
  location?: string;
  source: string;
  jobUrl: string;
  jobDescription: string;
  resumeVariantId?: string;
  resumeVariantName?: string;
}

export interface UpdateApplicationRequest {
  status?: JobApplicationStatus;
  notes?: string;
  dateApplied?: string | null;
  interviewDate?: string | null;
  followUpDate?: string | null;
  company?: string;
  title?: string;
  location?: string;
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

export interface ResumeExperienceItem {
  id?: string;
  company: string;
  companySubtitle?: string;
  title: string;
  dates: string;
  location: string;
  bullets: string[];
}

export interface ResumeProjectItem {
  id?: string;
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
