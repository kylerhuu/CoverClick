/** Shared between side panel, options, and content script (via chrome.storage.local). */
export const COMPANY_EXTRACTION_DEBUG_KEY = "coverclick:debugCompanyExtraction";

const DEV =
  typeof import.meta !== "undefined" &&
  Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);

function hasChromeStorage(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

/** Sync read for first paint (side panel localStorage + dev). */
export function isCompanyExtractionDebugEnabledSync(): boolean {
  if (DEV) return true;
  try {
    if (localStorage.getItem(COMPANY_EXTRACTION_DEBUG_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** @deprecated Use isCompanyExtractionDebugEnabledSync */
export function isCompanyExtractionDebugEnabled(): boolean {
  return isCompanyExtractionDebugEnabledSync();
}

export function storageFlagIsOn(value: unknown): boolean {
  return value === "1" || value === 1 || value === true;
}

/** Authoritative flag: chrome.storage.local, with localStorage → storage migration in UI contexts. */
export async function readCompanyExtractionDebugEnabled(): Promise<boolean> {
  if (DEV) return true;

  if (hasChromeStorage()) {
    try {
      const data = await chrome.storage.local.get(COMPANY_EXTRACTION_DEBUG_KEY);
      if (storageFlagIsOn(data[COMPANY_EXTRACTION_DEBUG_KEY])) return true;
    } catch {
      /* ignore */
    }
  }

  try {
    if (localStorage.getItem(COMPANY_EXTRACTION_DEBUG_KEY) === "1") {
      if (hasChromeStorage()) {
        await chrome.storage.local.set({ [COMPANY_EXTRACTION_DEBUG_KEY]: "1" });
      }
      return true;
    }
  } catch {
    /* ignore */
  }

  return false;
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
    /* ignore */
  }
}

/** Side panel: mirror last scrape for DevTools (`window` in side panel, not the job tab). */
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

/** Side panel: log full scraped job after re-scan when debug is on. */
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
