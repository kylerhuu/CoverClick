/** LinkedIn-only DOM helpers: shadow piercing, iframe documents, job-id discovery. */

function isDocumentNode(node: ParentNode): node is Document {
  return (node as Node).nodeType === 9;
}

function isElementNode(node: Node): node is Element {
  return node.nodeType === 1;
}

export type LinkedInDocumentProbe = {
  selector: string;
  found: boolean;
  textLength: number;
  hasTitle: boolean;
  hasCompany: boolean;
  hasDescription: boolean;
  status: "accepted" | "rejected" | "not_found";
  reason?: string;
};

function safeQuerySelector(parent: ParentNode, selector: string): Element | null {
  try {
    return parent.querySelector(selector);
  } catch {
    return null;
  }
}

function safeQuerySelectorAll(parent: ParentNode, selector: string): Element[] {
  try {
    return [...parent.querySelectorAll(selector)];
  } catch {
    return [];
  }
}

function walkElementTree(
  node: Element,
  visit: (el: Element) => void,
): void {
  visit(node);
  if (node.shadowRoot) {
    for (const child of node.shadowRoot.children) {
      if (isElementNode(child)) walkElementTree(child, visit);
    }
  }
  for (const child of node.children) {
    if (isElementNode(child)) walkElementTree(child, visit);
  }
}

/** All documents to search on a LinkedIn tab (top + same-origin iframes). */
export function linkedInDocuments(doc: Document = document): Document[] {
  const out: Document[] = [doc];
  const seen = new Set<Document>([doc]);
  for (const iframe of doc.querySelectorAll("iframe")) {
    try {
      const inner = iframe.contentDocument;
      if (inner && !seen.has(inner)) {
        seen.add(inner);
        out.push(inner);
      }
    } catch {
      /* cross-origin */
    }
  }
  return out;
}

export function deepQuerySelector(root: ParentNode, selector: string): Element | null {
  const direct = safeQuerySelector(root, selector);
  if (direct) return direct;

  const start = isDocumentNode(root)
    ? root.documentElement
    : isElementNode(root as Node)
      ? (root as Element)
      : null;
  if (!start) return null;

  let found: Element | null = null;
  walkElementTree(start, (el) => {
    if (found) return;
    if (el.shadowRoot) {
      const inShadow = safeQuerySelector(el.shadowRoot, selector);
      if (inShadow) found = inShadow;
    }
  });
  return found;
}

export function deepQuerySelectorAll(root: ParentNode, selector: string): Element[] {
  const out: Element[] = [];
  const seen = new Set<Element>();
  const add = (el: Element) => {
    if (!seen.has(el)) {
      seen.add(el);
      out.push(el);
    }
  };

  for (const el of safeQuerySelectorAll(root, selector)) add(el);

  const start = isDocumentNode(root)
    ? root.documentElement
    : isElementNode(root as Node)
      ? (root as Element)
      : null;
  if (!start) return out;

  walkElementTree(start, (el) => {
    if (!el.shadowRoot) return;
    for (const match of safeQuerySelectorAll(el.shadowRoot, selector)) add(match);
  });

  return out;
}

export function countOpenShadowRoots(doc: Document): number {
  let n = 0;
  if (!doc.documentElement) return 0;
  walkElementTree(doc.documentElement, (el) => {
    if (el.shadowRoot) n++;
  });
  return n;
}

/** Elements whose attributes reference the job id (collections cards, detail shells). */
export function findElementsReferencingJobId(doc: Document, jobId: string): Element[] {
  const anchors = new Set<Element>();
  const id = jobId.trim();
  if (!id) return [];

  const attrSelectors = [
    `[data-job-id="${id}"]`,
    `[data-occludable-job-id="${id}"]`,
    `[data-entity-urn*="${id}"]`,
    `[data-job-posting-id="${id}"]`,
    `a[href*="/jobs/view/${id}"]`,
    `a[href*="currentJobId=${id}"]`,
  ];

  for (const sel of attrSelectors) {
    for (const el of deepQuerySelectorAll(doc, sel)) anchors.add(el);
  }

  if (!doc.documentElement) return [...anchors];

  walkElementTree(doc.documentElement, (el) => {
    for (const attr of el.attributes) {
      const v = attr.value;
      if (v === id || v.includes(id)) anchors.add(el);
    }
  });

  return [...anchors];
}

export function buildDocumentProbeCandidate(
  doc: Document,
  label: string,
): LinkedInDocumentProbe {
  const bodyLen = (doc.body?.innerText ?? "").trim().length;
  const main = deepQuerySelector(doc, "main") ?? doc.querySelector("main");
  const roleMain = deepQuerySelector(doc, '[role="main"]');
  const descCount = deepQuerySelectorAll(doc, ".jobs-description__text, .show-more-less-html__markup").length;
  const h1Count = deepQuerySelectorAll(doc, "h1").length;
  const shadows = countOpenShadowRoots(doc);

  const reason = [
    `bodyText=${bodyLen}`,
    `main=${main ? "yes" : "no"}`,
    `roleMain=${roleMain ? "yes" : "no"}`,
    `h1=${h1Count}`,
    `descBlocks=${descCount}`,
    `shadowRoots=${shadows}`,
    `iframes=${doc.querySelectorAll("iframe").length}`,
  ].join(", ");

  return {
    selector: label,
    found: true,
    textLength: bodyLen,
    hasTitle: h1Count > 0,
    hasCompany: false,
    hasDescription: descCount > 0,
    status: bodyLen > 200 || descCount > 0 ? "rejected" : "rejected",
    reason,
  };
}
