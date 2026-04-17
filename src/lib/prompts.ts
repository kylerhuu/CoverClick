import type { GenerationRequest } from "./types";

/**
 * Server-side prompt guidance (sent alongside structured payload).
 * The real LLM call should live on your backend; this documents intent.
 */
export function buildCoverLetterPromptBrief(req: GenerationRequest): string {
  const { profile, job, tone, emphasis, length } = req;
  const lengthHint =
    length === "short" ? "about 200–280 words" : length === "long" ? "about 360–480 words" : "about 250–400 words";

  return [
    "Write a natural, polished, human-sounding cover letter.",
    "Avoid generic filler and fake achievements.",
    `Tailor explicitly to the role (“${job.jobTitle || "Role"}”) and company (“${job.companyName || "Company"}”).`,
    "Use only the candidate experience provided in profile fields; do not invent credentials.",
    `Match tone: ${tone}. Emphasis angle: ${emphasis}. Target length: ${lengthHint}.`,
    "Output only the final letter text (no headings like 'Cover Letter', no markdown fences).",
    "If signatureBlock is provided, end appropriately; otherwise close professionally with the candidate name.",
    `Candidate name: ${profile.fullName || "Candidate"}.`,
  ].join(" ");
}
