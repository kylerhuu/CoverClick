/**
 * Partial job data from one extractor (JSON-LD, board-specific, generic).
 * All fields optional; merge layer picks winners.
 */
export type JobExtractionPartial = {
  jobTitle?: string;
  companyName?: string;
  /** Raw employer strings from board DOM (merge normalizes and ranks). */
  companyCandidates?: string[];
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
