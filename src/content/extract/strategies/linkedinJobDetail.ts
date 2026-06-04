import { longestDescriptionFromRoots, readDescriptionFromRoot } from "../descriptionDom";
import { pickText } from "../dom";
import type {
  LinkedInRootCandidate,
  LinkedInRootResolutionMode,
} from "../../../lib/linkedinExtractionDebugTypes";
import {
  buildDocumentProbeCandidate,
  deepQuerySelector,
  deepQuerySelectorAll,
  findElementsReferencingJobId,
  linkedInDocuments,
} from "./linkedinDomTraversal";

/** Tier A: strict detail-pane selectors (first passing probe wins). */
export const LINKEDIN_DETAIL_ROOT_SELECTORS = [
  '[data-view-name="job-detail-page"]',
  '[data-view-name="job-details"]',
  ".jobs-search__job-details",
  ".jobs-details",
  ".jobs-search-two-pane__wrapper",
  ".split-view__container",
  ".job-details-jobs-unified-top-card__container--two-pane",
  ".job-details-jobs-unified-top-card__container",
  "#job-details",
  ".jobs-details__main-content",
  ".scaffold-layout__main",
  ".jobs-unified-top-card",
  'div[class*="job-view-layout"]',
  'div[class*="jobs-details"]',
  'div[class*="jobs-semantic-search"]',
  'section[class*="job-details"]',
  "article.jobs-description__container",
  ".core-section-container__content",
  "article:has(.jobs-description__text)",
  "article:has(.show-more-less-html__markup)",
] as const;

const FALLBACK_ROOT_PROBES = [
  { selector: ".jobs-search", mode: "prune-list" as const },
  { selector: ".jobs-details", mode: "element" as const },
  { selector: ".jobs-description", mode: "element" as const },
  { selector: ".jobs-box", mode: "element" as const },
  { selector: "main", mode: "prune-list" as const },
  { selector: '[role="main"]', mode: "prune-list" as const },
] as const;

const LIST_EXCLUDE_SELECTORS = [
  ".jobs-search-results-list",
  ".jobs-search-results",
  '[class*="results-list"]',
  '[class*="job-card-list"]',
  '[class*="jobs-search-results"]',
] as const;

const TITLE_PROBE_SELECTORS = [
  "h1[data-test-job-title]",
  ".job-details-jobs-unified-top-card__title",
  ".jobs-unified-top-card__job-title",
  "h1.t-24",
  "h1",
] as const;

const COMPANY_PROBE_SELECTORS = [
  ".jobs-unified-top-card__company-name a",
  ".job-details-jobs-unified-top-card__company-name a",
  ".job-details-jobs-unified-top-card__company-name",
  'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
  'a[data-view-name="job-details-about-company-name"]',
  ".jobs-company__name",
  ".topcard__org-name-link",
] as const;

const DESCRIPTION_PROBE_SELECTORS = [
  ".jobs-description__text",
  ".jobs-description-content__text",
  ".jobs-box__html-content",
  ".show-more-less-html__markup",
  ".jobs-description",
  '[class*="jobs-description-content"]',
  ".decorated-job-posting__details",
  ".core-section-container__content",
] as const;

const DESCRIPTION_BLOCK_SELECTORS = [
  ".show-more-less-html__markup",
  ".jobs-description__text",
  ".jobs-description-content__text",
  ".jobs-box__html-content",
  ".decorated-job-posting__details",
] as const;

const MIN_DESCRIPTION_SIGNAL = 120;
const MIN_TITLE_SIGNAL = 2;
const MAX_JOB_CARDS_IN_ROOT = 2;

const FEED_NOISE = /recommended for you|people also viewed|jobs you may like|similar jobs/i;

export function isLinkedInJobDetailUrl(url: URL): boolean {
  const path = url.pathname.toLowerCase();
  const params = url.searchParams;
  if (/\/jobs\/view\//i.test(path)) return true;
  if (params.has("currentJobId")) return true;
  if (/\/jobs\/collections\//i.test(path)) return true;
  if (/\/jobs\/search\//i.test(path) && params.has("currentJobId")) return true;
  return false;
}

export function isLinkedInCollectionsUrl(url: URL): boolean {
  return /\/jobs\/collections\//i.test(url.pathname);
}

export function getLinkedInCurrentJobId(url: URL): string | null {
  const fromParam = url.searchParams.get("currentJobId")?.trim();
  if (fromParam) return fromParam;
  const viewMatch = url.pathname.match(/\/jobs\/view\/(\d+)/i);
  return viewMatch?.[1] ?? null;
}

export type LinkedInDetailRoot = {
  root: Element | null;
  selectorUsed: string;
  candidateRoots: LinkedInRootCandidate[];
  rootResolutionMode: LinkedInRootResolutionMode;
  sourceDocument: "top" | "iframe";
};

type RootSignals = {
  textLength: number;
  hasTitle: boolean;
  hasCompany: boolean;
  hasDescription: boolean;
};

type DocContext = {
  doc: Document;
  label: "top" | "iframe";
};

export function spinWait(ms: number): void {
  if (ms <= 0) return;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* intentional sync delay for SPA hydration in content script */
  }
}

function isPriorityCandidate(selector: string): boolean {
  return /^(documentProbe:|currentJobId:|fallback:|description-anchor|deep:|tierA:summary|winner:)/.test(selector);
}

function pushCandidateLog(list: LinkedInRootCandidate[], candidate: LinkedInRootCandidate): void {
  const dup = list.some((c) => c.selector === candidate.selector && c.status === candidate.status);
  if (dup) return;
  if (!isPriorityCandidate(candidate.selector)) {
    const nonPriority = list.filter((c) => !isPriorityCandidate(c.selector)).length;
    if (nonPriority >= 6) return;
  }
  list.push(candidate);
}

function isVisible(el: Element): boolean {
  try {
    if (typeof getComputedStyle === "function") {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
    }
  } catch {
    return true;
  }
  const rects = el.getClientRects?.();
  if (rects && rects.length === 0) return false;
  return true;
}

function isInsideResultsList(el: Element): boolean {
  for (const sel of LIST_EXCLUDE_SELECTORS) {
    if (el.closest(sel)) return true;
  }
  return false;
}

function countJobCards(el: Element): number {
  return el.querySelectorAll(
    '[class*="job-card-container"], [class*="job-card-listitem"], li[class*="jobs-search-results__list-item"]',
  ).length;
}

function measureRoot(el: Element): RootSignals {
  let hasTitle = false;
  for (const sel of TITLE_PROBE_SELECTORS) {
    const t = pickText(el.querySelector(sel));
    if (t.length >= MIN_TITLE_SIGNAL && t.length <= 220) {
      hasTitle = true;
      break;
    }
  }

  let hasCompany = false;
  for (const sel of COMPANY_PROBE_SELECTORS) {
    const t = pickText(el.querySelector(sel));
    if (t.length >= 2 && t.length <= 120) {
      hasCompany = true;
      break;
    }
  }

  const desc = longestDescriptionFromRoots(el, [...DESCRIPTION_PROBE_SELECTORS], MIN_DESCRIPTION_SIGNAL);
  const hasDescription = desc.length >= MIN_DESCRIPTION_SIGNAL;
  const textLength = (el.textContent ?? "").trim().length;

  return { textLength, hasTitle, hasCompany, hasDescription };
}

function evaluateRoot(
  el: Element | null,
  selector: string,
): { candidate: LinkedInRootCandidate; acceptable: boolean } {
  if (!el) {
    return {
      candidate: {
        selector,
        found: false,
        textLength: 0,
        hasTitle: false,
        hasCompany: false,
        hasDescription: false,
        status: "not_found",
        reason: "not_found",
      },
      acceptable: false,
    };
  }

  if (!isVisible(el)) {
    const signals = measureRoot(el);
    return {
      candidate: {
        selector,
        found: true,
        ...signals,
        status: "rejected",
        reason: "not_visible",
      },
      acceptable: false,
    };
  }

  if (isInsideResultsList(el)) {
    const signals = measureRoot(el);
    return {
      candidate: {
        selector,
        found: true,
        ...signals,
        status: "rejected",
        reason: "inside_results_list",
      },
      acceptable: false,
    };
  }

  const cards = countJobCards(el);
  const signals = measureRoot(el);

  if (cards > MAX_JOB_CARDS_IN_ROOT) {
    return {
      candidate: {
        selector,
        found: true,
        ...signals,
        status: "rejected",
        reason: "too_many_job_cards",
      },
      acceptable: false,
    };
  }

  const sample = (el.textContent ?? "").slice(0, 2000);
  if (FEED_NOISE.test(sample) && !signals.hasDescription) {
    return {
      candidate: {
        selector,
        found: true,
        ...signals,
        status: "rejected",
        reason: "feed_noise_without_description",
      },
      acceptable: false,
    };
  }

  if (!signals.hasDescription) {
    return {
      candidate: {
        selector,
        found: true,
        ...signals,
        status: "rejected",
        reason: "no_description",
      },
      acceptable: false,
    };
  }

  if (!signals.hasTitle && !signals.hasCompany) {
    return {
      candidate: {
        selector,
        found: true,
        ...signals,
        status: "rejected",
        reason: "no_title_or_company",
      },
      acceptable: false,
    };
  }

  return {
    candidate: {
      selector,
      found: true,
      ...signals,
      status: "accepted",
    },
    acceptable: true,
  };
}

function resolvePrunedJobsSearch(doc: Document): Element | null {
  const shell = deepQuerySelector(doc, ".jobs-search") ?? doc.querySelector(".jobs-search");
  if (!shell) return null;
  const list = shell.querySelector(LIST_EXCLUDE_SELECTORS.join(", "));
  if (!list) return shell;

  for (const child of shell.children) {
    if (child.contains(list) || child === list) continue;
    if (measureRoot(child).hasDescription) return child;
  }

  for (const el of shell.querySelectorAll(
    ".jobs-search__job-details, .jobs-details, [class*='split-view'], [class*='details']",
  )) {
    if (list.contains(el) || el.contains(list)) continue;
    if (evaluateRoot(el, ".jobs-search (detail child)").acceptable) return el;
  }

  return shell;
}

function resolvePrunedMain(doc: Document, selector: string): Element | null {
  const main = deepQuerySelector(doc, selector) ?? doc.querySelector(selector);
  if (!main) return null;

  const list = main.querySelector(LIST_EXCLUDE_SELECTORS.join(", "));
  if (!list) return main;

  for (const child of main.children) {
    if (child.contains(list) || child === list) continue;
    const { acceptable } = evaluateRoot(child, `${selector} > child`);
    if (acceptable) return child;
  }

  const descHost =
    deepQuerySelector(doc, ".jobs-description__text, .show-more-less-html__markup, .jobs-description, #job-details") ??
    main.querySelector(".jobs-description__text, .show-more-less-html__markup, .jobs-description, #job-details");
  if (descHost) {
    const climb =
      descHost.closest(".jobs-search__job-details") ??
      descHost.closest(".jobs-details") ??
      descHost.closest('[class*="jobs-details"]') ??
      descHost.parentElement;
    if (climb && main.contains(climb) && !list.contains(climb)) return climb;
  }

  return main;
}

function findDescriptionAnchorRoot(doc: Document): Element | null {
  const anchor = deepQuerySelector(
    doc,
    ".show-more-less-html__markup, .jobs-description__text, .decorated-job-posting__details",
  );
  if (!anchor) return null;

  return (
    anchor.closest('[data-view-name="job-details"]') ??
    anchor.closest('[data-view-name="job-detail-page"]') ??
    anchor.closest(".jobs-search__job-details") ??
    anchor.closest(".jobs-details") ??
    anchor.closest("#job-details") ??
    anchor.closest("article") ??
    anchor.parentElement
  );
}

function findLargestDescriptionRoot(doc: Document): { root: Element | null; candidate: LinkedInRootCandidate } {
  const selector = "deep:largest-description-block";
  let best: { el: Element; len: number } | null = null;

  for (const block of deepQuerySelectorAll(doc, DESCRIPTION_BLOCK_SELECTORS.join(", "))) {
    if (isInsideResultsList(block)) continue;
    const t = readDescriptionFromRoot(block);
    if (t.length >= MIN_DESCRIPTION_SIGNAL && t.length > (best?.len ?? 0)) {
      best = { el: block, len: t.length };
    }
  }

  if (!best) {
    return {
      root: null,
      candidate: {
        selector,
        found: false,
        textLength: 0,
        hasTitle: false,
        hasCompany: false,
        hasDescription: false,
        status: "not_found",
        reason: "no_description_blocks_in_dom",
      },
    };
  }

  let node: Element | null = best.el;
  let climbBest: Element | null = null;
  let depth = 0;
  while (node && node !== doc.body && depth < 12) {
    const { acceptable } = evaluateRoot(node, selector);
    if (acceptable) {
      climbBest = node;
      break;
    }
    node = node.parentElement;
    depth++;
  }

  const target = climbBest ?? best.el;
  const final = evaluateRoot(target, selector);
  if (!final.acceptable) {
    return { root: null, candidate: { ...final.candidate, found: true, status: "rejected", reason: final.candidate.reason } };
  }
  return { root: target, candidate: { ...final.candidate, status: "accepted" } };
}

function findCurrentJobIdAnchoredRoot(doc: Document, jobId: string): { root: Element | null; candidate: LinkedInRootCandidate } {
  const selector = `currentJobId:${jobId}`;
  const anchors = findElementsReferencingJobId(doc, jobId).filter((el) => !isInsideResultsList(el));

  if (!anchors.length) {
    return {
      root: null,
      candidate: {
        selector,
        found: false,
        textLength: 0,
        hasTitle: false,
        hasCompany: false,
        hasDescription: false,
        status: "not_found",
        reason: "no_anchor_for_job_id",
      },
    };
  }

  let best: { el: Element; score: number } | null = null;

  for (const anchor of anchors) {
    let node: Element | null = anchor;
    let depth = 0;
    while (node && node !== doc.body && depth < 14) {
      const { acceptable } = evaluateRoot(node, selector);
      if (acceptable) {
        const signals = measureRoot(node);
        const score =
          (signals.hasDescription ? 1000 : 0) +
          (signals.hasTitle ? 100 : 0) +
          (signals.hasCompany ? 100 : 0) -
          countJobCards(node) * 50 -
          depth * 5;
        if (!best || score > best.score) best = { el: node, score };
      }
      node = node.parentElement;
      depth++;
    }
  }

  if (!best) {
    return {
      root: null,
      candidate: {
        selector,
        found: true,
        textLength: 0,
        hasTitle: false,
        hasCompany: false,
        hasDescription: false,
        status: "rejected",
        reason: `anchors=${anchors.length}, no_usable_ancestor`,
      },
    };
  }

  const final = evaluateRoot(best.el, selector);
  return { root: best.el, candidate: { ...final.candidate, status: "accepted", reason: undefined } };
}

type ResolveState = {
  root: Element | null;
  selectorUsed: string;
  rootResolutionMode: LinkedInRootResolutionMode;
  sourceDocument: "top" | "iframe";
};

function resolveInDocument(ctx: DocContext, url: URL, candidateRoots: LinkedInRootCandidate[]): ResolveState {
  const { doc, label } = ctx;
  let root: Element | null = null;
  let selectorUsed = "";
  let rootResolutionMode: LinkedInRootResolutionMode = "none";

  let tierAMatched = 0;
  let tierARejected = 0;
  for (const sel of LINKEDIN_DETAIL_ROOT_SELECTORS) {
    const el = deepQuerySelector(doc, sel);
    if (!el) continue;
    tierAMatched++;
    const { candidate, acceptable } = evaluateRoot(el, `${label}:${sel}`);
    if (!acceptable) {
      tierARejected++;
      pushCandidateLog(candidateRoots, candidate);
    }
    if (acceptable && !root) {
      root = el;
      selectorUsed = `${label}:${sel}`;
      rootResolutionMode = "strict";
      pushCandidateLog(candidateRoots, { ...candidate, status: "accepted" });
    }
  }

  pushCandidateLog(candidateRoots, {
    selector: `tierA:summary (${label})`,
    found: tierAMatched > 0,
    textLength: 0,
    hasTitle: false,
    hasCompany: false,
    hasDescription: false,
    status: tierAMatched > 0 && root ? "accepted" : "rejected",
    reason:
      tierAMatched === 0
        ? "no strict selector matched (light+shadow DOM)"
        : root
          ? `accepted ${selectorUsed}`
          : `${tierAMatched} matched, ${tierARejected} rejected`,
  });

  if (!root) {
    const descRoot = findDescriptionAnchorRoot(doc);
    const sel = `description-anchor (${label})`;
    if (descRoot) {
      const { candidate, acceptable } = evaluateRoot(descRoot, sel);
      pushCandidateLog(candidateRoots, candidate);
      if (acceptable) {
        root = descRoot;
        selectorUsed = sel;
        rootResolutionMode = "strict";
      }
    } else {
      pushCandidateLog(candidateRoots, {
        selector: sel,
        found: false,
        textLength: 0,
        hasTitle: false,
        hasCompany: false,
        hasDescription: false,
        status: "not_found",
        reason: "not_found",
      });
    }
  }

  const jobId = getLinkedInCurrentJobId(url);
  if (!root && jobId) {
    const anchored = findCurrentJobIdAnchoredRoot(doc, jobId);
    pushCandidateLog(candidateRoots, { ...anchored.candidate, selector: `${anchored.candidate.selector} (${label})` });
    if (anchored.root) {
      root = anchored.root;
      selectorUsed = `${label}:${anchored.candidate.selector}`;
      rootResolutionMode = "currentJobId";
    }
  }

  if (!root) {
    const deepDesc = findLargestDescriptionRoot(doc);
    pushCandidateLog(candidateRoots, { ...deepDesc.candidate, selector: `${deepDesc.candidate.selector} (${label})` });
    if (deepDesc.root) {
      root = deepDesc.root;
      selectorUsed = `${label}:${deepDesc.candidate.selector}`;
      rootResolutionMode = "fallback";
    }
  }

  if (!root) {
    for (const probe of FALLBACK_ROOT_PROBES) {
      let el: Element | null = null;
      if (probe.mode === "prune-list") {
        el =
          probe.selector === ".jobs-search"
            ? resolvePrunedJobsSearch(doc)
            : resolvePrunedMain(doc, probe.selector);
      } else {
        el = deepQuerySelector(doc, probe.selector) ?? doc.querySelector(probe.selector);
      }

      const base =
        probe.mode === "prune-list" ? `fallback:${probe.selector} (pruned)` : `fallback:${probe.selector}`;
      const labelSel = `${base} (${label})`;
      const { candidate, acceptable } = evaluateRoot(el, labelSel);
      pushCandidateLog(candidateRoots, candidate);
      if (acceptable && !root) {
        root = el;
        selectorUsed = labelSel;
        rootResolutionMode = "fallback";
      }
    }
  }

  return { root, selectorUsed, rootResolutionMode, sourceDocument: label };
}

function rootScore(state: ResolveState): number {
  if (!state.root) return 0;
  const signals = measureRoot(state.root);
  return (
    (signals.hasDescription ? 1000 : 0) +
    (signals.hasTitle ? 100 : 0) +
    (signals.hasCompany ? 100 : 0) +
    (state.rootResolutionMode === "strict" ? 50 : state.rootResolutionMode === "currentJobId" ? 40 : 10)
  );
}

export function findLinkedInJobDetailRoot(url: URL, rootDoc: Document = document): LinkedInDetailRoot {
  const candidateRoots: LinkedInRootCandidate[] = [];
  const docs = linkedInDocuments(rootDoc);
  const contexts: DocContext[] = docs.map((doc, i) => ({
    doc,
    label: i === 0 ? "top" : "iframe",
  }));

  for (const ctx of contexts) {
    const probe = buildDocumentProbeCandidate(ctx.doc, `documentProbe:${ctx.label}`);
    pushCandidateLog(candidateRoots, probe);
  }

  let best: ResolveState = {
    root: null,
    selectorUsed: "",
    rootResolutionMode: "none",
    sourceDocument: "top",
  };

  for (const ctx of contexts) {
    const resolved = resolveInDocument(ctx, url, candidateRoots);
    if (rootScore(resolved) > rootScore(best)) best = resolved;
  }

  if (best.root) {
    pushCandidateLog(candidateRoots, {
      selector: `winner:${best.selectorUsed}`,
      found: true,
      ...measureRoot(best.root),
      status: "accepted",
      reason: best.rootResolutionMode,
    });
  }

  return {
    root: best.root,
    selectorUsed: best.selectorUsed,
    candidateRoots,
    rootResolutionMode: best.rootResolutionMode,
    sourceDocument: best.sourceDocument,
  };
}

/** True when a detail root is resolved and looks ready for field extraction. */
export function hasUsableLinkedInDetailRoot(result: LinkedInDetailRoot): boolean {
  if (!result.root) return false;
  const accepted = result.candidateRoots.find(
    (c) => c.status === "accepted" && (c.selector === result.selectorUsed || c.selector === `winner:${result.selectorUsed}`),
  );
  if (accepted) return true;
  const { acceptable } = evaluateRoot(result.root, result.selectorUsed || "resolved");
  return acceptable;
}
