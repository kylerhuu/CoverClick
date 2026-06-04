export type LinkedInFieldCandidate = {
  raw: string;
  origin: string;
  status: "accepted" | "rejected" | "candidate";
  reason?: string;
};

export type LinkedInRootCandidate = {
  selector: string;
  found: boolean;
  textLength: number;
  hasTitle: boolean;
  hasCompany: boolean;
  hasDescription: boolean;
  status: "accepted" | "rejected" | "not_found";
  reason?: string;
};

export type LinkedInRootResolutionMode = "strict" | "currentJobId" | "fallback" | "none";

export type LinkedInExtractionDebugReport = {
  board: "linkedin";
  pageUrl: string;
  scrapePipelineVersion: number;
  isJobDetailUrl: boolean;
  detailRootFound: boolean;
  detailRootSelectorUsed: string;
  rootResolutionMode: LinkedInRootResolutionMode;
  candidateRoots: LinkedInRootCandidate[];
  waitAttempts: number;
  waitMsTotal: number;
  titleCandidates: LinkedInFieldCandidate[];
  companyCandidates: LinkedInFieldCandidate[];
  descriptionCandidates: LinkedInFieldCandidate[];
  selected: {
    jobTitle: string;
    companyName: string;
    descriptionLength: number;
  };
  scrapeQuality: "ok" | "linkedin_not_ready" | "linkedin_no_detail_root";
};
