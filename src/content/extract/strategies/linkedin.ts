import type { JobExtractionPartial } from "../types";
import { asPartial, firstMatchText } from "../dom";
import { longestDescriptionFromRoots, readDescriptionFromRoot } from "../descriptionDom";

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
    ".jobs-company__name",
    ".jobs-unified-top-card__company-name a",
    ".jobs-unified-top-card__company-name button",
    ".jobs-unified-top-card__company-name",
    ".topcard__org-name-link",
    ".top-card-layout__entity-info .topcard__flavor-title",
    "[data-test-job-card-container] .job-card-container__company-name",
    'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
    'a[data-view-name="job-details-about-company-name"]',
  ]);

  const description =
    longestDescriptionFromRoots(
      doc,
      [
        ".jobs-description__text",
        ".jobs-description-content__text",
        ".jobs-box__html-content",
        ".jobs-description",
        '[class*="jobs-description-content"]',
        '[class*="description-content"]',
        "#job-details",
        ".jobs-details__main-content",
        "article.jobs-description",
        '[role="main"] .jobs-unified-top-card + div',
      ],
      80,
    ) || readDescriptionFromRoot(doc.querySelector(".jobs-description"));

  return asPartial({ jobTitle: title, companyName: company, descriptionText: description });
}
