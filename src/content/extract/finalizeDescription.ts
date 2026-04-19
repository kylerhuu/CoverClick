import { deterministicCleanPostingText } from "./deterministicPostingClean";
import { stripBoilerplateLines } from "./sanitizeDescription";

/**
 * Final pipeline for job description text before returning JobContext from the content script.
 */
export function finalizeDescriptionForJob(descriptionText: string): string {
  let t = stripBoilerplateLines(descriptionText);
  t = deterministicCleanPostingText(t);
  return t;
}
