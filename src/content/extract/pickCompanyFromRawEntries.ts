import type { CompanyPickOption } from "../../lib/types";
import type {
  CompanyAcceptedFound,
  CompanyExtractionDebugReport,
  CompanyRawFound,
  CompanyRejectedFound,
} from "../../lib/companyExtractionDebugTypes";
import type { CompanyCandidateSource } from "./types";
import { normalizeCompanyCandidate, type CompanyNormalizeContext } from "./companyPlatform";
import type { CompanyCandidateDebugEntry } from "./companyExtractionDebug";

export type RawCompanyEntry = {
  raw: string;
  source: CompanyCandidateSource;
  origin: string;
};

const SOURCE_BASE_SCORE: Record<CompanyCandidateSource, number> = {
  boardExtractor: 100,
  jsonLd: 80,
  genericDom: 60,
  metaFallback: 40,
};

const SOURCE_LABEL: Record<CompanyCandidateSource, string> = {
  boardExtractor: "Job page",
  jsonLd: "Structured data",
  genericDom: "Page content",
  metaFallback: "Page meta",
};

export function pickCompanyFromRawEntries(
  entries: RawCompanyEntry[],
  normCtx: CompanyNormalizeContext,
  mergeCtx: { pageUrl: string; board: string; hostname: string },
): {
  companyName: string;
  companyCandidates: CompanyPickOption[];
  debug: CompanyExtractionDebugReport;
} {
  const rawFound: CompanyRawFound[] = entries.map((e) => ({
    raw: e.raw,
    source: e.source,
    origin: e.origin,
  }));

  const candidates: CompanyCandidateDebugEntry[] = [];
  const rejected: CompanyRejectedFound[] = [];
  const scoredByValue = new Map<string, CompanyAcceptedFound>();

  for (let idx = 0; idx < entries.length; idx++) {
    const { raw, source, origin } = entries[idx]!;
    if (!raw?.trim()) {
      candidates.push({ source, origin, raw: "", status: "skipped", reason: "empty" });
      continue;
    }
    const result = normalizeCompanyCandidate(raw, normCtx);
    if (!result.ok) {
      candidates.push({
        source,
        origin,
        raw,
        status: "rejected",
        reason: result.reason,
      });
      rejected.push({ raw, source, origin, reason: result.reason });
      continue;
    }

    const orderInSource = entries.slice(0, idx).filter((x) => x.source === source).length;
    const confidence = SOURCE_BASE_SCORE[source] - orderInSource;

    candidates.push({
      source,
      origin,
      raw,
      status: "accepted",
      normalized: result.value,
    });

    const existing = scoredByValue.get(result.value);
    if (!existing || confidence > existing.confidence) {
      scoredByValue.set(result.value, {
        value: result.value,
        source,
        origin,
        confidence,
      });
    }
  }

  const accepted = [...scoredByValue.values()].sort((a, b) => b.confidence - a.confidence);
  const companyCandidates: CompanyPickOption[] = accepted.map((a) => ({
    value: a.value,
    source: SOURCE_LABEL[a.source],
    confidence: a.confidence,
  }));

  const companyName = companyCandidates[0]?.value ?? "";

  let winner: CompanyCandidateSource | "none" = "none";
  if (companyName) {
    winner = accepted[0]?.source ?? "none";
  }

  const report: CompanyExtractionDebugReport = {
    pageUrl: mergeCtx.pageUrl,
    board: mergeCtx.board,
    hostname: mergeCtx.hostname,
    winner,
    value: companyName,
    rawFound,
    accepted,
    rejected,
    candidates,
  };

  return {
    companyName,
    companyCandidates,
    debug: report,
  };
}
