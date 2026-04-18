import type { GenerationRequest } from "./types";

/**
 * Server-side prompt guidance (sent alongside structured payload).
 * The real LLM call should live on your backend; this documents intent.
 */
export function buildCoverLetterPromptBrief(req: GenerationRequest): string {
  const { profile, job, tone, emphasis, length, responseShape } = req;
  const lengthHint =
    length === "short" ? "about 200–280 words" : length === "long" ? "about 360–480 words" : "about 250–400 words";

  const structuredHint =
    responseShape === "plain"
      ? "Respond with JSON: { \"format\": \"plain\", \"coverLetter\": \"...\" } — full letter as one string."
      : responseShape === "structured"
        ? "Respond with JSON: { \"format\": \"structured\", \"letter\": { \"senderBlock\", \"dateLine\", \"recipientBlock\", \"greeting\", \"bodyParagraphs\": [p1,p2,p3], \"closing\", \"signature\" } } — three body paragraphs only."
        : "Prefer JSON: { \"format\": \"structured\", \"letter\": { ... } }; you may use { \"format\": \"plain\", \"coverLetter\": \"...\" } if structured is not feasible.";

  return [
    "Write a natural, polished, human-sounding cover letter.",
    "Avoid generic filler and fake achievements.",
    `Tailor explicitly to the role (“${job.jobTitle || "Role"}”) and company (“${job.companyName || "Company"}”).`,
    "Use only the candidate experience provided in profile fields; do not invent credentials.",
    `Match tone: ${tone}. Emphasis angle: ${emphasis}. Target length: ${lengthHint}.`,
    structuredHint,
    "If signatureBlock is provided in profile, honor it in signature; otherwise close professionally.",
    `Candidate name: ${profile.fullName || "Candidate"}.`,
  ].join(" ");
}
