import type { JobContext } from "../../lib/types";
import { SCRAPE_PIPELINE_VERSION } from "../../lib/scrapePipeline";
import { publishCompanyExtractionDebugToPage } from "./companyExtractionDebug";
import { detectJobBoard } from "./board";
import { extractJsonLdJob } from "./jsonLd";
import { finalizeDescriptionForJob } from "./finalizeDescription";
import { mergeJobExtractions } from "./merge";
import {
  extractGenericCareersPage,
  extractGenericCompanyDom,
  extractGenericCompanyDomRaw,
  extractGenericCompanyMeta,
  extractGenericCompanyMetaRaw,
} from "./strategies/generic";
import { extractHandshake } from "./strategies/handshake";
import { extractGreenhouse } from "./strategies/greenhouse";
import { extractLever } from "./strategies/lever";
import { extractLinkedIn } from "./strategies/linkedin";

function extractBoardPartial(
  board: ReturnType<typeof detectJobBoard>,
  doc: Document,
  url: URL,
  hostname: string,
) {
  if (board === "linkedin") return extractLinkedIn(doc, hostname);
  if (board === "handshake") return extractHandshake(doc, hostname);
  if (board === "greenhouse") return extractGreenhouse(doc, url);
  if (board === "lever") return extractLever(doc, url);
  return {};
}

export function extractJobContext(): JobContext {
  const doc = document;
  const url = new URL(location.href);
  const hostname = url.hostname;
  const board = detectJobBoard(hostname);

  const jsonLd = extractJsonLdJob(doc, hostname);
  const boardPartial = extractBoardPartial(board, doc, url, hostname);
  const generic = extractGenericCareersPage(doc);
  const genericDomFound = extractGenericCompanyDomRaw(doc, board);
  const genericDomCompany = extractGenericCompanyDom(doc, board, hostname);
  const genericMetaCompanyRaw = extractGenericCompanyMetaRaw(doc, board);
  const genericMetaCompany = extractGenericCompanyMeta(doc, board, hostname);

  const merged = mergeJobExtractions(
    {
      jsonLd,
      board: boardPartial,
      generic,
      genericDomCompany,
      genericDomCompanyRaw: genericDomFound?.raw,
      genericDomOrigin: genericDomFound?.origin,
      genericMetaCompany,
      genericMetaCompanyRaw: genericMetaCompanyRaw,
    },
    doc,
    { board, hostname, pageUrl: location.href },
  );

  const job: JobContext = {
    ...merged,
    descriptionText: finalizeDescriptionForJob(merged.descriptionText),
    pageUrl: location.href,
    scrapedAt: Date.now(),
    scrapePipelineVersion: SCRAPE_PIPELINE_VERSION,
  };

  if (job.companyExtractionDebug) {
    publishCompanyExtractionDebugToPage(job.companyExtractionDebug, job);
  }

  return job;
}
