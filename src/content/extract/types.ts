/**
 * Partial job data from one extractor (JSON-LD, board-specific, generic).
 * All fields optional; merge layer picks winners.
 */
/** Raw employer string plus where it was found (debug + merge). */
export type CompanyRawEntry = {
  raw: string;
  origin: string;
};

export type JobExtractionPartial = {
  jobTitle?: string;
  companyName?: string;
  /** Unnormalized hiring org from JSON-LD (may be platform name). */
  companyNameRaw?: string;
  /** Raw employer strings from board DOM (legacy flat list). */
  companyCandidates?: string[];
  /** Preferred: labeled raw strings from board extractor. */
  companyRawEntries?: CompanyRawEntry[];
  descriptionText?: string;
};

export type JobBoardId =
  | "linkedin"
  | "greenhouse"
  | "lever"
  | "handshake"
  | "indeed"
  | "glassdoor"
  | "ziprecruiter"
  | "workday"
  | "generic";

/** Where a company name candidate originated (merge / debug). */
export type CompanyCandidateSource = "boardExtractor" | "jsonLd" | "genericDom" | "metaFallback";
