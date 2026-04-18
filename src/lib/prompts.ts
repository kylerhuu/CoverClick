import type { GenerationRequest } from "./types";

/**
 * Server-side prompt guidance (sent alongside structured payload).
 * The real LLM call should live on your backend; this documents intent.
 */
function profileEvidence(profile: GenerationRequest["profile"]): string {
  const chunks: string[] = [];
  if (profile.summary.trim()) chunks.push(`Summary:\n${profile.summary.trim()}`);
  if (profile.skills.length) chunks.push(`Skills:\n${profile.skills.join(", ")}`);
  if (profile.experienceBullets.length) {
    chunks.push(`Experience bullets:\n${profile.experienceBullets.map((b) => `• ${b}`).join("\n")}`);
  }
  if (profile.projectBullets.length) {
    chunks.push(`Project bullets:\n${profile.projectBullets.map((b) => `• ${b}`).join("\n")}`);
  }
  if (profile.resumeText.trim()) {
    const t = profile.resumeText.trim();
    chunks.push(`Resume excerpt:\n${t.length > 4500 ? `${t.slice(0, 4500)}\n[…]` : t}`);
  }
  return chunks.join("\n\n") || "(No detailed bullets or resume text — keep claims modest.)";
}

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
    "Vary vocabulary and rhythm versus boilerplate cover letters; do not reuse the same opening formula every time.",
    `Tailor explicitly to the role (“${job.jobTitle || "Role"}”) and company (“${job.companyName || "Company"}”).`,
    "Ground claims in the candidate evidence below; cite concrete tools, scope, or outcomes when they appear there.",
    "Use only the candidate experience provided in profile fields; do not invent credentials.",
    `Match tone: ${tone}. Emphasis angle: ${emphasis}. Target length: ${lengthHint}.`,
    structuredHint,
    "If signatureBlock is provided in profile, honor it in signature; otherwise close professionally.",
    `Candidate name: ${profile.fullName || "Candidate"}.`,
    "Candidate evidence (must inform the letter body):",
    profileEvidence(profile),
  ].join("\n\n");
}
