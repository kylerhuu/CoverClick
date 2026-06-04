import type { JobContext } from "../../lib/types";
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

const PRIORITY: CompanyCandidateSource[] = [
  "boardExtractor",
  "jsonLd",
  "genericDom",
  "metaFallback",
];

function pickCompanyWithDebug(
  entries: { raw?: string; source: CompanyCandidateSource }[],
  normCtx: CompanyNormalizeContext,
  mergeCtx: MergeContext,
): { companyName: string; debug: CompanyExtractionDebugReport } {
  const candidates: CompanyCandidateDebugEntry[] = [];

  for (const { raw, source } of entries) {
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
  }

  const acceptedBySource = new Map<CompanyCandidateSource, string>();
  for (const c of candidates) {
    if (c.status === "accepted" && c.normalized && !acceptedBySource.has(c.source)) {
      acceptedBySource.set(c.source, c.normalized);
    }
  }

  let winner: CompanyCandidateSource | "none" = "none";
  let value = "";

  for (const source of PRIORITY) {
    const v = acceptedBySource.get(source);
    if (v) {
      winner = source;
      value = v;
      break;
    }
  }

  const report: CompanyExtractionDebugReport = {
    board: mergeCtx.board,
    hostname: mergeCtx.hostname,
    winner,
    value,
    candidates,
  };

  logCompanyExtractionDebug(report);

  return { companyName: value, debug: report };
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

  const companyEntries: { raw?: string; source: CompanyCandidateSource }[] = [
    { raw: sources.board.companyName, source: "boardExtractor" },
    { raw: sources.jsonLd.companyName, source: "jsonLd" },
    { raw: sources.genericDomCompany, source: "genericDom" },
    { raw: sources.genericMetaCompany, source: "metaFallback" },
  ];

  const { companyName } = pickCompanyWithDebug(companyEntries, normCtx, mergeCtx);

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
    descriptionText,
  };
}
