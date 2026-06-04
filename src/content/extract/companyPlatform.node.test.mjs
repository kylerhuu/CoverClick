import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isJobPlatformName,
  normalizeCompanyCandidate,
  stripPlatformSuffix,
} from "./companyPlatform.ts";

describe("companyPlatform", () => {
  it("rejects Handshake as company", () => {
    const r = normalizeCompanyCandidate("Handshake", { hostname: "joinhandshake.com", board: "handshake" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "platform");
  });

  it("accepts real employer", () => {
    const r = normalizeCompanyCandidate("Tesla", { hostname: "joinhandshake.com", board: "handshake" });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value, "Tesla");
  });

  it("strips platform suffix", () => {
    assert.equal(stripPlatformSuffix("Acme Corp | Handshake"), "Acme Corp");
    const r = normalizeCompanyCandidate("Acme Corp | Handshake", { hostname: "joinhandshake.com" });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value, "Acme Corp");
  });

  it("rejects LinkedIn platform name", () => {
    assert.equal(isJobPlatformName("LinkedIn", "www.linkedin.com"), true);
  });

  it("rejects Handshake nav label Employers", () => {
    const r = normalizeCompanyCandidate("Employers", {
      hostname: "joinhandshake.com",
      board: "handshake",
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "generic_junk");
  });

  it("accepts real company even when scraped from an employers profile path", () => {
    const r = normalizeCompanyCandidate("Goldman Sachs", {
      hostname: "joinhandshake.com",
      board: "handshake",
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value, "Goldman Sachs");
  });
});
