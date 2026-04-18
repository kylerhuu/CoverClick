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
