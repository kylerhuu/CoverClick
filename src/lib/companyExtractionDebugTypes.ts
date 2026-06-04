export type CompanyCandidateSource = "boardExtractor" | "jsonLd" | "genericDom" | "metaFallback";

/** One string discovered before normalization (DOM, JSON-LD, etc.). */
export type CompanyRawFound = {
  raw: string;
  source: CompanyCandidateSource;
  /** e.g. selector:…, handshake:h1-sibling-link, jsonLd:hiringOrganization */
  origin: string;
};

export type CompanyAcceptedFound = {
  value: string;
  source: CompanyCandidateSource;
  origin: string;
  confidence: number;
};

export type CompanyRejectedFound = {
  raw: string;
  source: CompanyCandidateSource;
  origin: string;
  reason: string;
};

/** Flat per-entry status (console / legacy). */
export type CompanyCandidateDebugEntry = {
  source: CompanyCandidateSource;
  origin: string;
  raw: string;
  status: "accepted" | "rejected" | "skipped";
  reason?: string;
  normalized?: string;
};

export type CompanyExtractionDebugReport = {
  pageUrl: string;
  board: string;
  hostname: string;
  winner: CompanyCandidateSource | "none";
  /** Final merged company name (may be empty). */
  value: string;
  /** Everything collected before filtering. */
  rawFound: CompanyRawFound[];
  accepted: CompanyAcceptedFound[];
  rejected: CompanyRejectedFound[];
  candidates: CompanyCandidateDebugEntry[];
};
