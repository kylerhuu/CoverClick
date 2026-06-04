import type { CompanyPickOption, JobContext } from "../../lib/types";
import type { CompanyCandidateSource, JobBoardId, JobExtractionPartial } from "./types";
import { normalizeCompanyCandidate, type CompanyNormalizeContext } from "./companyPlatform";
import {
  logCompanyExtractionDebug,
  type CompanyCandidateDebugEntry,
  type CompanyExtractionDebugReport,
} from "./companyExtractionDebug";
import { bodyInnerTextFallback } from "./dom";

const MAX_DESCRIPTION = 24_000;

export type MergeSources = {
  jsonLd: JobExtractionPartial;
  board: JobExtractionPartial;
  genericDomCompany?: string;
  genericMetaCompany?: string;
  generic: JobExtractionPartial;
};

export type MergeContext = {
  board: JobBoardId;
  hostname: string;
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

function uniquePreservingOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const k = v.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(v.trim());
  }
  return out;
}

function pickTitle(candidates: string[]): string {
  const c = uniquePreservingOrder(candidates).filter((t) => {
    if (t.length < 2 || t.length > 220) return false;
    if (/^https?:\/\//i.test(t)) return false;
    return true;
  });
  if (!c.length) return "";
  return [...c].sort((a, b) => scoreTitleLike(a) - scoreTitleLike(b))[0] ?? "";
}

function scoreTitleLike(s: string): number {
  const len = s.length;
  const ideal = 48;
  return Math.abs(len - ideal) + (s.includes("\n") ? 40 : 0);
}

type RawCompanyEntry = {
  raw: string;
  source: CompanyCandidateSource;
  /** Lower = earlier / more specific within the same source. */
  orderInSource: number;
};

function boardRawCompanies(board: JobExtractionPartial): string[] {
  if (board.companyCandidates?.length) return board.companyCandidates;
  if (board.companyName?.trim()) return [board.companyName];
  return [];
}

function collectRawCompanyEntries(sources: MergeSources): RawCompanyEntry[] {
  const entries: RawCompanyEntry[] = [];

  for (const [orderInSource, raw] of boardRawCompanies(sources.board).entries()) {
    if (raw.trim()) entries.push({ raw, source: "boardExtractor", orderInSource });
  }
  if (sources.jsonLd.companyName?.trim()) {
    entries.push({ raw: sources.jsonLd.companyName, source: "jsonLd", orderInSource: 0 });
  }
  if (sources.genericDomCompany?.trim()) {
    entries.push({ raw: sources.genericDomCompany, source: "genericDom", orderInSource: 0 });
  }
  if (sources.genericMetaCompany?.trim()) {
    entries.push({ raw: sources.genericMetaCompany, source: "metaFallback", orderInSource: 0 });
  }

  return entries;
}

function pickCompanyWithDebug(
  entries: RawCompanyEntry[],
  normCtx: CompanyNormalizeContext,
  mergeCtx: MergeContext,
): {
  companyName: string;
  companyCandidates: CompanyPickOption[];
  debug: CompanyExtractionDebugReport;
} {
  const candidates: CompanyCandidateDebugEntry[] = [];
  const scoredByValue = new Map<string, CompanyPickOption>();

  for (const { raw, source, orderInSource } of entries) {
    if (!raw?.trim()) {
      candidates.push({ source, raw: "", status: "skipped", reason: "empty" });
      continue;
    }
    const result = normalizeCompanyCandidate(raw, normCtx);
    if (!result.ok) {
      candidates.push({
        source,
        raw,
        status: "rejected",
        reason: result.reason,
      });
      continue;
    }
    candidates.push({
      source,
      raw,
      status: "accepted",
      normalized: result.value,
    });

    const confidence = SOURCE_BASE_SCORE[source] - orderInSource;
    const existing = scoredByValue.get(result.value);
    if (!existing || confidence > existing.confidence) {
      scoredByValue.set(result.value, {
        value: result.value,
        source: SOURCE_LABEL[source],
        confidence,
      });
    }
  }

  const companyCandidates = [...scoredByValue.values()].sort((a, b) => b.confidence - a.confidence);
  const companyName = companyCandidates[0]?.value ?? "";

  let winner: CompanyCandidateSource | "none" = "none";
  if (companyName) {
    for (const e of entries) {
      const result = normalizeCompanyCandidate(e.raw, normCtx);
      if (result.ok && result.value === companyName) {
        winner = e.source;
        break;
      }
    }
  }

  const report: CompanyExtractionDebugReport = {
    board: mergeCtx.board,
    hostname: mergeCtx.hostname,
    winner,
    value: companyName,
    candidates,
  };

  logCompanyExtractionDebug(report);

  return {
    companyName,
    companyCandidates,
    debug: report,
  };
}

function pickDescription(candidates: string[], doc: Document): string {
  const c = uniquePreservingOrder(candidates).filter((t) => t.length > 40);
  if (!c.length) {
    return bodyInnerTextFallback(doc, MAX_DESCRIPTION);
  }
  const best = [...c].sort((a, b) => b.length - a.length)[0] ?? "";
  if (best.length > MAX_DESCRIPTION) return `${best.slice(0, MAX_DESCRIPTION)}…`;
  return best;
}

export function mergeJobExtractions(
  sources: MergeSources,
  doc: Document,
  mergeCtx: MergeContext,
): Omit<JobContext, "pageUrl" | "scrapedAt"> {
  const normCtx: CompanyNormalizeContext = {
    hostname: mergeCtx.hostname,
    board: mergeCtx.board,
  };

  const { companyName, companyCandidates } = pickCompanyWithDebug(
    collectRawCompanyEntries(sources),
    normCtx,
    mergeCtx,
  );

  const titles: string[] = [];
  const descriptions: string[] = [];
  const partials = [sources.jsonLd, sources.board, sources.generic];
  for (const p of partials) {
    if (p.jobTitle) titles.push(p.jobTitle);
    if (p.descriptionText) descriptions.push(p.descriptionText);
  }

  let descriptionText = pickDescription(descriptions, doc);
  if (descriptionText.length < 200) {
    const body = bodyInnerTextFallback(doc, MAX_DESCRIPTION);
    if (body.length > descriptionText.length) descriptionText = body;
  }

  return {
    jobTitle: pickTitle(titles),
    companyName,
    companyCandidates: companyCandidates.length > 1 ? companyCandidates : undefined,
    descriptionText,
  };
}
