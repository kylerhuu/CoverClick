import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCompanyCandidate } from "./companyPlatform.ts";

describe("handshake iHerb normalization", () => {
  it("accepts full about-employer line and rejects Handshake platform", () => {
    const iherb = normalizeCompanyCandidate("iHerbCPG - Consumer Packaged Goods", {
      hostname: "joinhandshake.com",
      board: "handshake",
    });
    const brand = normalizeCompanyCandidate("iHerb", {
      hostname: "joinhandshake.com",
      board: "handshake",
    });
    const platform = normalizeCompanyCandidate("Handshake", {
      hostname: "joinhandshake.com",
      board: "handshake",
    });

    assert.equal(iherb.ok, true);
    assert.equal(brand.ok, true);
    assert.equal(platform.ok, false);
    if (!platform.ok) assert.equal(platform.reason, "platform");
  });
});
