import type { JobExtractionPartial } from "../types";
import {
  asPartial,
  companyFromFirstPathSegment,
  firstMatchText,
  pickText,
} from "../dom";
import { longestDescriptionFromRoots, readDescriptionFromRoot } from "../descriptionDom";

export function extractGreenhouse(doc: Document, url: URL): JobExtractionPartial {
  const pathCompany = companyFromFirstPathSegment(url);

  const title = firstMatchText(doc, [
    ".app-title",
    "#job_title",
    "h1#job-title",
    ".job__title",
    ".opening-title",
    "header h1",
    "main h1",
    "h1",
  ]);

  let company =
    pickText(doc.querySelector(".company-name a")) ||
    pickText(doc.querySelector(".company-name")) ||
    pickText(doc.querySelector(".employer-name")) ||
    pickText(doc.querySelector(".logo a")) ||
    pickText(doc.querySelector("#company_logo a"));

  const ogSite = doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content")?.trim();
  if (!company && ogSite) company = ogSite;

  if (!company && pathCompany) company = pathCompany;

  const description =
    longestDescriptionFromRoots(
      doc,
      [
        "#content .body",
        "#content",
        ".content",
        ".opening",
        ".body",
        "#job_app_body",
        ".job__description",
        ".main-content",
        "main",
        "article",
      ],
      120,
    ) || readDescriptionFromRoot(doc.querySelector("#app_body"));

  return asPartial({ jobTitle: title, companyName: company, descriptionText: description });
}
