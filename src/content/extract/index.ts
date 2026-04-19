import type { JobContext } from "../../lib/types";
import { detectJobBoard } from "./board";
import { extractJsonLdJob } from "./jsonLd";
import { finalizeDescriptionForJob } from "./finalizeDescription";
import { mergeJobExtractions } from "./merge";
import { extractGreenhouse } from "./strategies/greenhouse";
import { extractGenericCareersPage } from "./strategies/generic";
import { extractHandshake } from "./strategies/handshake";
import { extractLever } from "./strategies/lever";
import { extractLinkedIn } from "./strategies/linkedin";
import type { JobExtractionPartial } from "./types";

export function extractJobContext(): JobContext {
  const doc = document;
  const url = new URL(location.href);
  const board = detectJobBoard(url.hostname);

  const partials: JobExtractionPartial[] = [];

  partials.push(extractJsonLdJob(doc));

  if (board === "linkedin") partials.push(extractLinkedIn(doc));
  if (board === "handshake") partials.push(extractHandshake(doc));
  if (board === "greenhouse") partials.push(extractGreenhouse(doc, url));
  if (board === "lever") partials.push(extractLever(doc, url));

  partials.push(extractGenericCareersPage(doc));

  const merged = mergeJobExtractions(partials, doc);

  return {
    ...merged,
    descriptionText: finalizeDescriptionForJob(merged.descriptionText),
    pageUrl: location.href,
    scrapedAt: Date.now(),
  };
}
