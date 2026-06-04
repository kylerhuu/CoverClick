import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  employerLinesFromAboutSectionText,
  employerNameVariants,
} from "./handshakeAboutEmployerText.ts";

const IHERB_SNIPPET = `
Job description here.

About the employer

iHerbCPG - Consumer Packaged Goods

Who is iHerb:
iHerb is a global e-commerce retailer.
`;

describe("handshakeAboutEmployerText", () => {
  it("parses employer line after About the employer heading in text", () => {
    const lines = employerLinesFromAboutSectionText(IHERB_SNIPPET);
    assert.ok(lines.includes("iHerbCPG - Consumer Packaged Goods"));
  });

  it("stops before Who is section", () => {
    const lines = employerLinesFromAboutSectionText(IHERB_SNIPPET);
    assert.equal(lines.some((l) => /who is/i.test(l)), false);
  });

  it("derives iHerb brand variants from iHerbCPG line", () => {
    const variants = employerNameVariants("iHerbCPG - Consumer Packaged Goods");
    const values = variants.map((v) => v.raw);
    assert.ok(values.includes("iHerbCPG - Consumer Packaged Goods"));
    assert.ok(values.includes("iHerbCPG"));
    assert.ok(values.includes("iHerb"));
  });
});
