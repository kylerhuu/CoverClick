import type { JobExtractionPartial } from "./types";
import { asPartial, stripHtmlToText } from "./dom";

type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readType(node: UnknownRecord): Set<string> {
  const out = new Set<string>();
  const t = node["@type"];
  if (typeof t === "string") out.add(t);
  if (Array.isArray(t)) for (const x of t) if (typeof x === "string") out.add(x);
  return out;
}

function flattenJsonLdNodes(raw: unknown): UnknownRecord[] {
  const out: UnknownRecord[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) {
      for (const x of v) visit(x);
      return;
    }
    if (!isRecord(v)) return;
    out.push(v);
    if (Array.isArray(v["@graph"])) visit(v["@graph"]);
  };
  visit(raw);
  return out;
}

function orgName(org: unknown): string | undefined {
  if (typeof org === "string") return org.trim() || undefined;
  if (!isRecord(org)) return undefined;
  const name = org.name;
  if (typeof name === "string") return name.trim() || undefined;
  if (isRecord(name) && typeof name.value === "string") return name.value.trim() || undefined;
  return undefined;
}

function extractFromJobPosting(node: UnknownRecord): JobExtractionPartial {
  const title = typeof node.title === "string" ? node.title.trim() : undefined;
  const ho = node.hiringOrganization;
  const company = orgName(ho);
  let description: string | undefined;
  const descRaw = node.description;
  if (typeof descRaw === "string") {
    description = descRaw.includes("<") ? stripHtmlToText(descRaw) : collapseDescriptionText(descRaw);
  }
  return asPartial({
    jobTitle: title,
    companyName: company,
    descriptionText: description,
  });
}

function collapseDescriptionText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Reads JobPosting objects from JSON-LD blocks (common on ATS + career sites).
 */
export function extractJsonLdJob(doc: Document): JobExtractionPartial {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  const merged: JobExtractionPartial = {};

  for (const script of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(script.textContent || "");
    } catch {
      continue;
    }
    for (const node of flattenJsonLdNodes(parsed)) {
      const types = readType(node);
      if (!types.has("JobPosting")) continue;
      const part = extractFromJobPosting(node);
      if (part.jobTitle && !merged.jobTitle) merged.jobTitle = part.jobTitle;
      if (part.companyName && !merged.companyName) merged.companyName = part.companyName;
      if (part.descriptionText) {
        if (!merged.descriptionText || part.descriptionText.length > (merged.descriptionText?.length ?? 0)) {
          merged.descriptionText = part.descriptionText;
        }
      }
    }
  }

  return asPartial(merged);
}
