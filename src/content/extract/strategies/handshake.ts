import type { CompanyRawEntry, JobExtractionPartial } from "../types";
import { normalizeCompanyCandidate } from "../companyPlatform";
import { asPartial, firstMatchText, orderedMatchTexts, pickText } from "../dom";
import { longestDescriptionFromRoots, readDescriptionFromRoot } from "../descriptionDom";
import { collectHandshakeAboutEmployer, pushHandshakeRaw } from "./handshakeAboutEmployer";

/** High-confidence employer fields (Phase 3 may expand using debug origins). */
const EMPLOYER_DOM_SELECTORS = [
  '[data-hook="employer-name"]',
  '[class*="EmployerName"]',
  '[class*="employer-name"]',
  '[class*="EmployerTitle"]',
  '[data-testid*="employer-name"]',
  '[data-testid="employer-name"]',
];

function pushRaw(entries: CompanyRawEntry[], raw: string, origin: string): void {
  const t = raw.trim();
  if (!t) return;
  if (entries.some((e) => e.raw.toLowerCase() === t.toLowerCase() && e.origin === origin)) return;
  entries.push({ raw: t, origin });
}

function employerRawEntriesFromHandshakeDom(doc: Document, descriptionText?: string): CompanyRawEntry[] {
  const entries: CompanyRawEntry[] = [];

  for (const e of collectHandshakeAboutEmployer(doc, descriptionText)) {
    pushHandshakeRaw(entries, e.raw, e.origin);
  }
  // About-the-employer entries are prepended first (highest merge priority).

  for (const sel of EMPLOYER_DOM_SELECTORS) {
    for (const t of orderedMatchTexts(doc, [sel])) {
      pushRaw(entries, t, `selector:${sel}`);
    }
  }

  const h1 = doc.querySelector("main h1, h1");
  if (h1?.parentElement) {
    for (const a of h1.parentElement.querySelectorAll("a")) {
      const t = pickText(a);
      const href = a.getAttribute("href") ?? "";
      if (!t || (!href.includes("employer") && !href.includes("/e/"))) continue;
      pushRaw(entries, t, "handshake:h1-sibling-link");
    }
  }

  return entries;
}

function employerJsonLdRaw(doc: Document): string | undefined {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(script.textContent || "");
    } catch {
      continue;
    }
    const nodes: Record<string, unknown>[] = [];
    const visit = (v: unknown) => {
      if (Array.isArray(v)) {
        for (const x of v) visit(x);
        return;
      }
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        nodes.push(o);
        if (Array.isArray(o["@graph"])) visit(o["@graph"]);
      }
    };
    visit(parsed);

    for (const node of nodes) {
      const t = node["@type"];
      const types = new Set<string>();
      if (typeof t === "string") types.add(t);
      if (Array.isArray(t)) for (const x of t) if (typeof x === "string") types.add(x);
      if (!types.has("JobPosting")) continue;

      const ho = node.hiringOrganization;
      if (typeof ho === "string" && ho.trim()) return ho.trim();
      if (ho && typeof ho === "object" && typeof (ho as Record<string, unknown>).name === "string") {
        const name = (ho as Record<string, unknown>).name as string;
        if (name.trim()) return name.trim();
      }
    }
  }
  return undefined;
}

export function extractHandshake(doc: Document, hostname: string): JobExtractionPartial {
  const title =
    firstMatchText(doc, [
      '[data-hook="job-name"]',
      '[data-hook*="job-name"]',
      '[class*="JobTitle"]',
      "main h1",
      "h1",
    ]) || firstMatchText(doc, ['[class*="job-title"]']);

  const description =
    longestDescriptionFromRoots(
      doc,
      [
        '[data-hook="job-description"]',
        '[data-hook="sanitized-job-description"]',
        '[class*="JobDescription"]',
        '[class*="job-description"]',
        '[class*="DescriptionBody"]',
        "article",
        '[role="main"]',
      ],
      120,
    ) || readDescriptionFromRoot(doc.querySelector("main"));

  const companyRawEntries = employerRawEntriesFromHandshakeDom(doc, description);
  const jsonLdRaw = employerJsonLdRaw(doc);
  if (jsonLdRaw) pushRaw(companyRawEntries, jsonLdRaw, "handshake:jsonLd");

  let company = "";
  for (const { raw } of companyRawEntries) {
    const normalized = normalizeCompanyCandidate(raw, { hostname, board: "handshake" });
    if (normalized.ok) {
      company = normalized.value;
      break;
    }
  }

  return asPartial({
    jobTitle: title,
    companyName: company || undefined,
    companyNameRaw: jsonLdRaw,
    companyRawEntries: companyRawEntries.length ? companyRawEntries : undefined,
    companyCandidates: companyRawEntries.map((e) => e.raw),
    descriptionText: description,
  });
}
