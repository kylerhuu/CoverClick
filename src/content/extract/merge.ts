import type { JobContext } from "../../lib/types";
import type { JobBoardId, JobExtractionPartial } from "./types";
import type { CompanyNormalizeContext } from "./companyPlatform";
import { logCompanyExtractionDebug } from "./companyExtractionDebug";
import { bodyInnerTextFallback } from "./dom";
import { pickCompanyFromRawEntries, type RawCompanyEntry } from "./pickCompanyFromRawEntries";

const MAX_DESCRIPTION = 24_000;

export type MergeSources = {
  jsonLd: JobExtractionPartial;
  board: JobExtractionPartial;
  genericDomCompany?: string;
  genericDomCompanyRaw?: string;
  genericDomOrigin?: string;
  genericMetaCompany?: string;
  genericMetaCompanyRaw?: string;
  generic: JobExtractionPartial;
};

export type MergeContext = {
  board: JobBoardId;
  hostname: string;
  pageUrl: string;
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

function dedupeRawEntries(entries: RawCompanyEntry[]): RawCompanyEntry[] {
  const seen = new Set<string>();
  const out: RawCompanyEntry[] = [];
  for (const e of entries) {
    const key = `${e.source}\0${e.origin}\0${e.raw.trim().toLowerCase()}`;
    if (!e.raw.trim() || seen.has(key)) continue;
    seen.add(key);
    out.push({ raw: e.raw.trim(), source: e.source, origin: e.origin });
  }
  return out;
}

function boardRawEntries(board: JobExtractionPartial): RawCompanyEntry[] {
  if (board.companyRawEntries?.length) {
    return board.companyRawEntries.map((e) => ({
      raw: e.raw,
      source: "boardExtractor" as const,
      origin: e.origin,
    }));
  }
  const legacy = board.companyCandidates?.length
    ? board.companyCandidates
    : board.companyName?.trim()
      ? [board.companyName]
      : [];
  return legacy.map((raw, i) => ({
    raw,
    source: "boardExtractor" as const,
    origin: `board:legacy:${i}`,
  }));
}

function collectRawCompanyEntries(sources: MergeSources): RawCompanyEntry[] {
  const entries: RawCompanyEntry[] = [...boardRawEntries(sources.board)];

  const jsonRaw = sources.jsonLd.companyNameRaw?.trim() || sources.jsonLd.companyName?.trim();
  if (jsonRaw) {
    entries.push({
      raw: jsonRaw,
      source: "jsonLd",
      origin: "jsonLd:hiringOrganization",
    });
  }

  const domRaw = sources.genericDomCompanyRaw?.trim() || sources.genericDomCompany?.trim();
  if (domRaw) {
    entries.push({
      raw: domRaw,
      source: "genericDom",
      origin: sources.genericDomOrigin ?? "genericDom:selector",
    });
  }

  const metaRaw = sources.genericMetaCompanyRaw?.trim() || sources.genericMetaCompany?.trim();
  if (metaRaw) {
    entries.push({
      raw: metaRaw,
      source: "metaFallback",
      origin: "meta:og-or-app",
    });
  }

  return dedupeRawEntries(entries);
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

  const rawEntries = collectRawCompanyEntries(sources);
  const { companyName, companyCandidates, debug } = pickCompanyFromRawEntries(rawEntries, normCtx, mergeCtx);
  logCompanyExtractionDebug(debug);

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

  const hasAccepted = companyCandidates.length > 0;

  return {
    jobTitle: pickTitle(titles),
    companyName,
    companyCandidates,
    companyResolution: hasAccepted ? "auto" : "not_found",
    companyExtractionDebug: debug,
    descriptionText,
  };
}
