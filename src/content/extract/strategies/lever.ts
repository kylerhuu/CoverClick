import type { JobExtractionPartial } from "../types";
import { asPartial, companyFromFirstPathSegment, firstMatchText, pickText } from "../dom";
import { longestDescriptionFromRoots, readDescriptionFromRoot } from "../descriptionDom";

export function extractLever(doc: Document, url: URL): JobExtractionPartial {
  const pathCompany = companyFromFirstPathSegment(url);

  const title = firstMatchText(doc, [
    ".posting-headline h2",
    ".posting-headline h1",
    ".posting-headline",
    ".posting-title",
    "section.headline h2",
    "main h1",
    "main h2",
    "h1",
    "h2",
  ]);

  let company =
    pickText(doc.querySelector(".main-header-logo a")) ||
    pickText(doc.querySelector(".posting-category a")) ||
    pickText(doc.querySelector(".sort-by-time"));

  const ogSite = doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content")?.trim();
  if (!company && ogSite) company = ogSite;

  if (!company && pathCompany) company = pathCompany;

  const description =
    longestDescriptionFromRoots(
      doc,
      [
        ".section-wrapper.full-width-wrapper .content",
        ".section.page-centered",
        ".posting-content",
        ".content.posting",
        "main",
      ],
      120,
    ) || readDescriptionFromRoot(doc.querySelector("main"));

  return asPartial({ jobTitle: title, companyName: company, descriptionText: description });
}
