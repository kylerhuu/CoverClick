export const SCRAPE_MESSAGE_TYPE = "COVERCLICK_SCRAPE_JOB" as const;

export type ScrapeRequestMessage = { type: typeof SCRAPE_MESSAGE_TYPE };
