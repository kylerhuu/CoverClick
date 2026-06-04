import type { CompanyPickOption, JobContext } from "./types";

export const UNKNOWN_COMPANY_VALUE = "Unknown";

/** After scrape: default to best accepted pick; never leave company silently unset when picks exist. */
export function applyScrapedCompanyDefaults(job: JobContext): JobContext {
  const accepted = job.companyCandidates ?? [];
  let companyName = job.companyName.trim();
  if (!companyName && accepted.length > 0) {
    companyName = accepted[0]!.value;
  }

  let companyResolution = job.companyResolution;
  if (companyName && companyName !== UNKNOWN_COMPANY_VALUE) {
    companyResolution = companyResolution === "manual" ? "manual" : "auto";
  } else if (!accepted.length) {
    companyResolution = "not_found";
  }

  return {
    ...job,
    companyName,
    companyResolution,
  };
}

export function companySelectOptions(accepted: CompanyPickOption[]): { value: string; label: string }[] {
  const opts = accepted.map((p) => ({
    value: p.value,
    label: p.source ? `${p.value} (${p.source})` : p.value,
  }));
  opts.push({ value: UNKNOWN_COMPANY_VALUE, label: UNKNOWN_COMPANY_VALUE });
  return opts;
}
