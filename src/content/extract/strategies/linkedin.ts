import type { JobExtractionPartial } from "../types";
import { asPartial, firstMatchText, longestTextAmong, pickText } from "../dom";

export function extractLinkedIn(doc: Document): JobExtractionPartial {
  const title = firstMatchText(doc, [
    ".jobs-unified-top-card__job-title",
    ".job-details-jobs-unified-top-card__title",
    "h1[data-test-job-title]",
    'h1[class*="jobs-unified-top-card"]',
    ".top-card-layout__entity-info h1",
    "main h1.t-24",
    "main h1",
    "h1",
  ]);

  const company = firstMatchText(doc, [
    ".jobs-unified-top-card__company-name a",
    ".jobs-unified-top-card__company-name button",
    ".jobs-unified-top-card__company-name",
    ".topcard__org-name-link",
    ".top-card-layout__entity-info .topcard__flavor-title",
    "[data-test-job-card-container] .job-card-container__company-name",
    'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
  ]);

  const description =
    longestTextAmong(
      doc,
      [
        ".jobs-description-content__text",
        ".jobs-description__text",
        ".jobs-box__html-content",
        '[class*="jobs-description-content"]',
        "#job-details",
        ".jobs-details__main-content",
        "article.jobs-description",
      ],
      80,
    ) || pickText(doc.querySelector(".jobs-description"));

  return asPartial({ jobTitle: title, companyName: company, descriptionText: description });
}
