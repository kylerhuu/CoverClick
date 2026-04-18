import type { JobExtractionPartial } from "../types";
import { asPartial, firstMatchText } from "../dom";
import { longestDescriptionFromRoots, readDescriptionFromRoot } from "../descriptionDom";

export function extractHandshake(doc: Document): JobExtractionPartial {
  const title =
    firstMatchText(doc, [
      '[data-hook="job-name"]',
      '[data-hook*="job"]',
      '[class*="JobTitle"]',
      "main h1",
      "h1",
    ]) || firstMatchText(doc, ['[class*="job-title"]']);

  const company =
    firstMatchText(doc, [
      '[data-hook="employer-name"]',
      '[class*="EmployerName"]',
      '[class*="employer-name"]',
    ]) || "";

  const description =
    longestDescriptionFromRoots(
      doc,
      [
        '[data-hook="job-description"]',
        '[data-hook="sanitized-job-description"]',
        '[class*="JobDescription"]',
        '[class*="job-description"]',
        '[class*="DescriptionBody"]',
        "article",
        '[role="main"]',
      ],
      120,
    ) || readDescriptionFromRoot(doc.querySelector("main"));

  return asPartial({ jobTitle: title, companyName: company, descriptionText: description });
}
