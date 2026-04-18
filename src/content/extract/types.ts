/**
 * Partial job data from one extractor (JSON-LD, board-specific, generic).
 * All fields optional; merge layer picks winners.
 */
export type JobExtractionPartial = {
  jobTitle?: string;
  companyName?: string;
  descriptionText?: string;
};

export type JobBoardId = "linkedin" | "greenhouse" | "lever" | "handshake" | "generic";
