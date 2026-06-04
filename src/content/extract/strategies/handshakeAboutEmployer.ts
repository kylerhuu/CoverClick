import type { CompanyRawEntry } from "../types";
import { pickText } from "../dom";
import { employerLinesFromAboutSectionText, employerNameVariants } from "./handshakeAboutEmployerText";

const ABOUT_EMPLOYER_HEADING_RE = /^about\s+the\s+employer\s*$/i;

/** Handshake-specific hooks/classes seen near employer profile blocks (expand via debug origins). */
const ABOUT_EMPLOYER_SELECTORS = [
  '[data-hook="about-the-employer"]',
  '[data-hook*="about-employer"]',
  '[data-hook*="about-the-employer"]',
  '[data-hook*="employer-about"]',
  '[data-hook*="employer-profile"]',
  '[class*="AboutTheEmployer"]',
  '[class*="AboutEmployer"]',
  '[class*="about-the-employer"]',
  '[class*="about-employer"]',
  '[class*="EmployerAbout"]',
  '[class*="employer-profile"]',
  '[class*="EmployerProfile"]',
  '[class*="EmployerCard"]',
  '[class*="employer-card"]',
] as const;

export function pushHandshakeRaw(
  entries: CompanyRawEntry[],
  raw: string,
  origin: string,
): void {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t || t.length < 2 || t.length > 160) return;
  const key = `${origin}\0${t.toLowerCase()}`;
  if (entries.some((e) => `${e.origin}\0${e.raw.toLowerCase()}` === key)) return;
  entries.push({ raw: t, origin });
}

export { employerLinesFromAboutSectionText, employerNameVariants } from "./handshakeAboutEmployerText";

function isAboutEmployerHeading(el: Element): boolean {
  const t = pickText(el);
  if (!t || t.length > 64) return false;
  return ABOUT_EMPLOYER_HEADING_RE.test(t);
}

function lineLooksLikeEmployerName(line: string): boolean {
  if (!line || line.length < 2 || line.length > 120) return false;
  if (/^(who\s+is\b|similar\s+jobs|learn\s+more|follow)/i.test(line)) return false;
  return true;
}

function collectLinesNearAboutHeading(heading: Element, entries: CompanyRawEntry[]): void {
  const container =
    heading.closest(
      'section, article, [data-hook*="employer"], [class*="Employer"], [class*="employer"], main',
    ) ?? heading.parentElement;

  if (container) {
    for (const a of container.querySelectorAll('a[href*="/employers/"], a[href*="/employer"], a[href*="/e/"]')) {
      const t = pickText(a);
      const href = a.getAttribute("href") ?? "";
      if (!t || /^(learn more|follow)$/i.test(t)) continue;
      if (href.includes("employer") || href.includes("/e/")) {
        for (const v of employerNameVariants(t)) pushHandshakeRaw(entries, v.raw, "handshake:employer-profile-link");
      }
    }
  }

  let el: Element | null = heading.nextElementSibling;
  for (let i = 0; i < 12 && el; i++, el = el.nextElementSibling) {
    const t = pickText(el);
    if (/^who\s+is\b/i.test(t)) break;
    if (lineLooksLikeEmployerName(t)) {
      for (const v of employerNameVariants(t)) pushHandshakeRaw(entries, v.raw, v.origin);
      return;
    }
    for (const inner of el.querySelectorAll("a, h2, h3, h4, p, span, strong")) {
      const innerText = pickText(inner);
      if (!lineLooksLikeEmployerName(innerText)) continue;
      if (/^(learn more|follow)$/i.test(innerText)) continue;
      for (const v of employerNameVariants(innerText)) pushHandshakeRaw(entries, v.raw, v.origin);
      return;
    }
  }

  if (container) {
    let seenHeading = false;
    for (const node of container.querySelectorAll("h2, h3, h4, p, span, strong, a")) {
      const t = pickText(node);
      if (!t) continue;
      if (!seenHeading) {
        if (isAboutEmployerHeading(node) || /about\s+the\s+employer/i.test(t)) seenHeading = true;
        continue;
      }
      if (/^who\s+is\b/i.test(t)) break;
      if (!lineLooksLikeEmployerName(t)) continue;
      if (/^(learn more|follow)$/i.test(t)) continue;
      for (const v of employerNameVariants(t)) pushHandshakeRaw(entries, v.raw, v.origin);
      return;
    }
  }
}

function collectFromAboutEmployerHeadings(doc: Document, entries: CompanyRawEntry[]): void {
  const candidates = doc.querySelectorAll(
    'h2, h3, h4, h5, h6, [role="heading"], strong, span, button, p, div',
  );
  for (const el of candidates) {
    if (!isAboutEmployerHeading(el)) continue;
    collectLinesNearAboutHeading(el, entries);
  }
}

function collectFromAboutEmployerSelectors(doc: Document, entries: CompanyRawEntry[]): void {
  for (const sel of ABOUT_EMPLOYER_SELECTORS) {
    for (const el of doc.querySelectorAll(sel)) {
      const t = pickText(el);
      if (!lineLooksLikeEmployerName(t)) {
        for (const child of el.querySelectorAll("a, h2, h3, h4, p, span, strong")) {
          const ct = pickText(child);
          if (lineLooksLikeEmployerName(ct)) {
            for (const v of employerNameVariants(ct)) pushHandshakeRaw(entries, v.raw, `handshake:selector:${sel}`);
          }
        }
        continue;
      }
      for (const v of employerNameVariants(t)) pushHandshakeRaw(entries, v.raw, `handshake:selector:${sel}`);
    }
  }
}

/**
 * Collect employer names from Handshake "About the employer" (DOM + posting text).
 */
export function collectHandshakeAboutEmployer(
  doc: Document,
  descriptionText?: string,
): CompanyRawEntry[] {
  const entries: CompanyRawEntry[] = [];

  collectFromAboutEmployerHeadings(doc, entries);
  collectFromAboutEmployerSelectors(doc, entries);

  const textSources = [
    descriptionText ?? "",
    pickText(doc.querySelector('[data-hook="job-description"], [data-hook*="job-description"]')),
    pickText(doc.querySelector("main")),
  ];
  for (const text of textSources) {
    if (!text || text.length < 40) continue;
    for (const line of employerLinesFromAboutSectionText(text)) {
      for (const v of employerNameVariants(line)) pushHandshakeRaw(entries, v.raw, v.origin);
    }
  }

  return entries;
}
