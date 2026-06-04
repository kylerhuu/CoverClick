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

/** Authoritative flag: chrome.storage.local, with localStorage → storage migration in UI contexts. */
export async function readCompanyExtractionDebugEnabled(): Promise<boolean> {
  if (DEV) return true;

  if (hasChromeStorage()) {
    try {
      const data = await chrome.storage.local.get(COMPANY_EXTRACTION_DEBUG_KEY);
      if (data[COMPANY_EXTRACTION_DEBUG_KEY] === "1") return true;
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

/** Side panel: log full scraped job after re-scan when debug is on. */
export function logScrapedJobContextForDebug(job: unknown, label = "Scraped JobContext"): void {
  const j = job as Record<string, unknown> | null;
  console.groupCollapsed(`[CoverClick] ${label}`);
  console.log("job", job);
  console.log("Has companyExtractionDebug:", Boolean(j?.companyExtractionDebug));
  console.log("scrapePipelineVersion:", j?.scrapePipelineVersion ?? "(missing — reload extension / rebuild content.js)");
  console.log("companyName:", j?.companyName);
  console.log("companyCandidates:", j?.companyCandidates);
  if (j?.companyExtractionDebug) {
    console.log("companyExtractionDebug", j.companyExtractionDebug);
  }
  console.groupEnd();
}
