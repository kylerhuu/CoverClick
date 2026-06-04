export type LinkedInFieldCandidate = {
  raw: string;
  origin: string;
  status: "accepted" | "rejected" | "candidate";
  reason?: string;
};

export type LinkedInExtractionDebugReport = {
  board: "linkedin";
  pageUrl: string;
  scrapePipelineVersion: number;
  isJobDetailUrl: boolean;
  detailRootFound: boolean;
  detailRootSelectorUsed: string;
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
