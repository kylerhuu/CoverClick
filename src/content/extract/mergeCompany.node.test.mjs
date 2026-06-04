import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickCompanyFromRawEntries } from "./pickCompanyFromRawEntries.ts";

describe("mergeCompany", () => {
  it("separates raw found from accepted and rejected", () => {
    const { companyName, debug } = pickCompanyFromRawEntries(
      [
        { raw: "Handshake", source: "jsonLd", origin: "jsonLd:hiringOrganization" },
        { raw: "Employers", source: "boardExtractor", origin: "selector:test" },
        { raw: "Goldman Sachs", source: "boardExtractor", origin: "selector:employer" },
      ],
      { hostname: "joinhandshake.com", board: "handshake" },
      { board: "handshake", hostname: "joinhandshake.com", pageUrl: "https://joinhandshake.com/jobs/1" },
    );

    assert.equal(companyName, "Goldman Sachs");
    assert.equal(debug.rawFound.length, 3);
    assert.equal(debug.accepted.length, 1);
    assert.equal(debug.rejected.length, 2);
    assert.ok(debug.rejected.some((r) => r.raw === "Handshake" && r.reason === "platform"));
    assert.ok(debug.rejected.some((r) => r.raw === "Employers"));
  });

  it("empty accepted leaves company blank with raw still populated", () => {
    const { companyName, companyCandidates, debug } = pickCompanyFromRawEntries(
      [
        { raw: "Handshake", source: "jsonLd", origin: "jsonLd:hiringOrganization" },
        { raw: "Employers", source: "boardExtractor", origin: "nav" },
      ],
      { hostname: "joinhandshake.com", board: "handshake" },
      { board: "handshake", hostname: "joinhandshake.com", pageUrl: "https://joinhandshake.com/jobs/2" },
    );

    assert.equal(companyName, "");
    assert.equal(companyCandidates.length, 0);
    assert.equal(debug.accepted.length, 0);
    assert.equal(debug.rawFound.length, 2);
  });
});
