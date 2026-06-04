import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { parseHTML } from "linkedom";
import { extractLinkedIn } from "./linkedin.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureHtml = readFileSync(join(__dirname, "linkedinExtraction.fixture.html"), "utf8");

describe("linkedin extraction (fixture)", () => {
  it("scopes to job detail root and emits debug with detailRootSelectorUsed", () => {
    const { document } = parseHTML(fixtureHtml);
    const url = new URL("https://www.linkedin.com/jobs/search/?currentJobId=123456");
    const result = extractLinkedIn(document, url, "www.linkedin.com", {
      attempt: 0,
      waitMsTotal: 0,
      scrapePipelineVersion: 7,
    });

    assert.equal(result.debug.detailRootFound, true);
    assert.ok(result.debug.detailRootSelectorUsed.includes(".jobs-search__job-details"));
    assert.ok(result.debug.candidateRoots.length > 0);
    assert.ok(result.debug.candidateRoots.some((c) => c.status === "accepted"));
    assert.equal(result.debug.isJobDetailUrl, true);
    assert.equal(result.scrapeQuality, "ok");
    assert.equal(result.partial.jobTitle, "Senior Software Engineer");
    assert.equal(result.partial.companyName, "Acme Corporation");
    assert.ok((result.partial.descriptionText?.length ?? 0) >= 120);
    assert.equal(result.partial.companyName, "Acme Corporation");
    assert.ok(!result.partial.companyName?.includes("Wrong Sidebar"));

    // Sample debug shape for manual LinkedIn debugging (logged in test output when run with --test-reporter spec)
    const sample = {
      detailRootFound: result.debug.detailRootFound,
      detailRootSelectorUsed: result.debug.detailRootSelectorUsed,
      scrapeQuality: result.debug.scrapeQuality,
      waitAttempts: result.debug.waitAttempts,
      selected: result.debug.selected,
      titleCandidates: result.debug.titleCandidates.slice(0, 3),
      companyCandidates: result.debug.companyCandidates.filter((c) => c.status === "accepted"),
    };
    console.log("[linkedin fixture debug sample]", JSON.stringify(sample, null, 2));
  });
});
