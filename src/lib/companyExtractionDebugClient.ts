/** Shared between side panel, options, and content script (via chrome.storage.local). */
export const COMPANY_EXTRACTION_DEBUG_KEY = "coverclick:debugCompanyExtraction";

function hasChromeStorage(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

/** Strict: only chrome.storage.local value exactly "1" (not dev build, not localStorage). */
export function isCompanyExtractionDebugFlagValue(value: unknown): boolean {
  return value === "1";
}

/**
 * Whether company-extraction debug UI / console helpers are active.
 * Normal users: always false unless they set chrome.storage.local flag to "1".
 */
export async function readCompanyExtractionDebugEnabled(): Promise<boolean> {
  if (!hasChromeStorage()) return false;
  try {
    const data = await chrome.storage.local.get(COMPANY_EXTRACTION_DEBUG_KEY);
    return isCompanyExtractionDebugFlagValue(data[COMPANY_EXTRACTION_DEBUG_KEY]);
  } catch {
    return false;
  }
}

/** @deprecated Use readCompanyExtractionDebugEnabled — sync false (storage is async). */
export function isCompanyExtractionDebugEnabledSync(): boolean {
  return false;
}

/** @deprecated Use readCompanyExtractionDebugEnabled */
export function isCompanyExtractionDebugEnabled(): boolean {
  return isCompanyExtractionDebugEnabledSync();
}

export async function writeCompanyExtractionDebugEnabled(enabled: boolean): Promise<void> {
  const value = enabled ? "1" : "0";
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [COMPANY_EXTRACTION_DEBUG_KEY]: value });
  }
  try {
    if (enabled) localStorage.setItem(COMPANY_EXTRACTION_DEBUG_KEY, "1");
    else localStorage.removeItem(COMPANY_EXTRACTION_DEBUG_KEY);
  } catch {
    /* ignore — storage.local is authoritative for UI */
  }
}

/** Side panel: mirror last scrape for DevTools when debug flag is on. */
export function publishScrapedJobToSidePanel(job: unknown): void {
  try {
    (window as Window & { __COVERCLICK_LAST_SCRAPED_JOB__?: unknown }).__COVERCLICK_LAST_SCRAPED_JOB__ =
      job;
    const j = job as Record<string, unknown> | null;
    if (j?.companyExtractionDebug) {
      (window as unknown as { __COVERCLICK_LAST_COMPANY_DEBUG__?: unknown }).__COVERCLICK_LAST_COMPANY_DEBUG__ =
        j.companyExtractionDebug;
    }
  } catch {
    /* ignore */
  }
}

/** Side panel console — only call when readCompanyExtractionDebugEnabled() is true. */
export function logScrapedJobContextForDebug(job: unknown, label = "Scraped JobContext"): void {
  const j = job as Record<string, unknown> | null;
  publishScrapedJobToSidePanel(job);
  console.group(`[CoverClick] ${label}`);
  console.log("Full JobContext:", job);
  console.log("Has companyExtractionDebug:", Boolean(j?.companyExtractionDebug));
  console.log("scrapePipelineVersion:", j?.scrapePipelineVersion ?? "(missing — reload extension / rebuild content.js)");
  console.log("companyName:", j?.companyName);
  console.log(
    "companyCandidates count:",
    Array.isArray(j?.companyCandidates) ? j.companyCandidates.length : 0,
  );
  if (j?.companyExtractionDebug) {
    console.log("companyExtractionDebug", j.companyExtractionDebug);
  } else {
    console.warn(
      "[CoverClick] Debug enabled but companyExtractionDebug missing. Content script may be stale or scrape payload dropped the field.",
    );
  }
  console.groupEnd();
}
