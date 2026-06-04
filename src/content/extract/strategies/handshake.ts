import type { JobExtractionPartial } from "../types";
import { normalizeCompanyCandidate } from "../companyPlatform";
import { asPartial, firstMatchText, pickText } from "../dom";
import { longestDescriptionFromRoots, readDescriptionFromRoot } from "../descriptionDom";

function employerFromHandshakeDom(doc: Document): string {
  const selectors = [
    '[data-hook="employer-name"]',
    '[data-hook*="employer"]',
    '[class*="EmployerName"]',
    '[class*="employer-name"]',
    '[class*="EmployerTitle"]',
    'a[href*="/employers/"]',
    'a[href*="/emp/"]',
    '[data-testid*="employer"]',
    "main header a[href*='employer']",
    "h1 + p a",
    "h1 ~ a",
  ];
  const direct = firstMatchText(doc, selectors);
  if (direct) return direct;

  const h1 = doc.querySelector("main h1, h1");
  if (h1?.parentElement) {
    const links = h1.parentElement.querySelectorAll("a");
    for (const a of links) {
      const t = pickText(a);
      const href = a.getAttribute("href") ?? "";
      if (t && (href.includes("employer") || href.includes("/e/"))) return t;
    }
  }

  return "";
}

function employerFromJsonLdOnPage(doc: Document, hostname: string): string | undefined {
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
      let name = "";
      if (typeof ho === "string") name = ho;
      else if (ho && typeof ho === "object" && typeof (ho as Record<string, unknown>).name === "string") {
        name = (ho as Record<string, unknown>).name as string;
      }
      const result = normalizeCompanyCandidate(name, { hostname, board: "handshake" });
      if (result.ok) return result.value;
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

  let company = employerFromHandshakeDom(doc);
  let normalized = normalizeCompanyCandidate(company, { hostname, board: "handshake" });
  if (!normalized.ok) {
    const fromLd = employerFromJsonLdOnPage(doc, hostname);
    if (fromLd) company = fromLd;
    else company = "";
  } else {
    company = normalized.value;
  }

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

  return asPartial({
    jobTitle: title,
    companyName: company || undefined,
    descriptionText: description,
  });
}
