const DEV =
  typeof import.meta !== "undefined" &&
  Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);

/** Side panel / options: matches content-script flag `coverclick:debugCompanyExtraction`. */
export function isCompanyExtractionDebugEnabled(): boolean {
  if (DEV) return true;
  try {
    return localStorage.getItem("coverclick:debugCompanyExtraction") === "1";
  } catch {
    return false;
  }
}
