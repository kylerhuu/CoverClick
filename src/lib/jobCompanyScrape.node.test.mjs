import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyScrapedCompanyDefaults, companySelectOptions } from "./jobCompanyScrape.ts";

describe("jobCompanyScrape", () => {
  it("defaults companyName to best accepted when empty", () => {
    const job = applyScrapedCompanyDefaults({
      jobTitle: "Analyst",
      companyName: "",
      companyCandidates: [{ value: "Goldman Sachs", source: "Job page", confidence: 100 }],
      companyResolution: "not_found",
      pageUrl: "https://example.com",
      descriptionText: "desc",
      scrapedAt: 1,
    });
    assert.equal(job.companyName, "Goldman Sachs");
    assert.equal(job.companyResolution, "auto");
  });

  it("keeps not_found when no accepted candidates", () => {
    const job = applyScrapedCompanyDefaults({
      jobTitle: "Analyst",
      companyName: "",
      companyCandidates: [],
      companyResolution: "not_found",
      pageUrl: "https://example.com",
      descriptionText: "desc",
      scrapedAt: 1,
    });
    assert.equal(job.companyName, "");
    assert.equal(job.companyResolution, "not_found");
  });

  it("select options always include Unknown", () => {
    const opts = companySelectOptions([{ value: "Acme", source: "Job page", confidence: 90 }]);
    assert.ok(opts.some((o) => o.value === "Unknown"));
  });
});
