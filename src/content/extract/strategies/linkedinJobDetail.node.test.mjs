import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isLinkedInJobDetailUrl } from "./linkedinJobDetail.ts";

describe("linkedinJobDetail", () => {
  it("detects /jobs/view/ URLs", () => {
    assert.equal(isLinkedInJobDetailUrl(new URL("https://www.linkedin.com/jobs/view/123456/")), true);
  });

  it("detects search with currentJobId", () => {
    assert.equal(
      isLinkedInJobDetailUrl(new URL("https://www.linkedin.com/jobs/search/?currentJobId=123456")),
      true,
    );
  });

  it("rejects feed home", () => {
    assert.equal(isLinkedInJobDetailUrl(new URL("https://www.linkedin.com/feed/")), false);
  });
});
