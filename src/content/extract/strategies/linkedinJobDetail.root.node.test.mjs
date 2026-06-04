import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { parseHTML } from "linkedom";
import {
  findLinkedInJobDetailRoot,
  getLinkedInCurrentJobId,
  isLinkedInCollectionsUrl,
} from "./linkedinJobDetail.ts";
import { extractLinkedIn } from "./linkedin.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const collectionsHtml = readFileSync(join(__dirname, "linkedinCollections.fixture.html"), "utf8");

describe("linkedinJobDetail root resolution", () => {
  it("parses currentJobId from collections URL", () => {
    const url = new URL("https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4419936820");
    assert.equal(getLinkedInCurrentJobId(url), "4419936820");
    assert.equal(isLinkedInCollectionsUrl(url), true);
  });

  it("resolves collections layout with candidateRoots diagnostics", () => {
    const { document } = parseHTML(collectionsHtml);
    const url = new URL("https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4419936820");
    const result = findLinkedInJobDetailRoot(url, document);

    assert.equal(result.root !== null, true);
    assert.ok(result.selectorUsed.length > 0);
    assert.ok(result.candidateRoots.length > 0);
    assert.ok(result.candidateRoots.some((c) => c.selector.includes("jobs-details") || c.status === "accepted"));

    const extraction = extractLinkedIn(document, url, "www.linkedin.com", {
      attempt: 0,
      waitMsTotal: 0,
      scrapePipelineVersion: 7,
    });
    assert.equal(extraction.debug.detailRootFound, true);
    assert.ok(extraction.debug.candidateRoots.length > 0);
    assert.equal(extraction.partial.jobTitle, "Product Manager, Payments");
    assert.equal(extraction.partial.companyName, "Stripe");
    assert.ok((extraction.partial.descriptionText?.length ?? 0) >= 120);
  });
});
