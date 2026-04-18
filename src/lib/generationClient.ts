import type { GenerationRequest, GenerationResult, JobContext, StructuredCoverLetter, UserProfile } from "./types";
import { buildCoverLetterPromptBrief } from "./prompts";
import { generationResultToStructured, normalizeGenerationResponse } from "./generationNormalize";
import {
  buildRecipientBlock,
  buildSenderBlockFromProfile,
  defaultDateLine,
  structuredLetterToPlainText,
} from "./letterModel";

function mockStructuredLetter(req: GenerationRequest): StructuredCoverLetter {
  const name = req.profile.fullName.trim() || "Your Name";
  const role = req.job.jobTitle.trim() || "this role";
  const company = req.job.companyName.trim() || "your team";
  const bullets = [
    ...req.profile.experienceBullets.slice(0, 2),
    ...req.profile.projectBullets.slice(0, 1),
  ]
    .map((b) => b.trim())
    .filter(Boolean);

  const proof =
    bullets.length > 0
      ? `In recent work, I’ve focused on outcomes like: ${bullets.join(" ")}`
      : req.profile.summary.trim()
        ? `My background aligns with what you’re hiring for—${req.profile.summary.trim().slice(0, 280)}${req.profile.summary.length > 280 ? "…" : ""}`
        : "I’m excited to bring a careful, collaborative approach to how I scope problems, ship iteratively, and communicate clearly with stakeholders.";

  const b2 = `What draws me to ${company} is the combination of depth and pace: ${req.emphasis} work with a ${req.tone} tone, with room to contribute end-to-end. I’m especially motivated by teams that value pragmatic tradeoffs, crisp writing, and respectful debate.`;

  const b3 =
    "If there’s a fit, I’d love a conversation to learn more about the team’s roadmap and how I can help you ship confidently in the next chapter.";

  const sig = req.profile.signatureBlock.trim() || `Sincerely,\n${name}`;

  return {
    senderBlock: buildSenderBlockFromProfile(req.profile) || name,
    dateLine: defaultDateLine(),
    recipientBlock: buildRecipientBlock(req.job),
    greeting: `Dear ${company} hiring team,`,
    bodyParagraphs: [
      `I’m writing to express my strong interest in the ${role} opportunity. I’ve been following ${company} and appreciate the clarity of the problems you’re solving—and the bar you set for craft and ownership.`,
      proof,
      `${b2} ${b3}`,
    ],
    closing: "Sincerely,",
    signature: sig,
  };
}

export async function requestCoverLetterGeneration(
  settings: { apiBaseUrl: string; useMock: boolean },
  body: GenerationRequest,
): Promise<GenerationResult> {
  if (settings.useMock) {
    await new Promise((r) => setTimeout(r, 400));
    if (body.responseShape === "plain") {
      const letter = mockStructuredLetter(body);
      return { shape: "plain", text: structuredLetterToPlainText(letter) };
    }
    return { shape: "structured", letter: mockStructuredLetter(body) };
  }

  const url = `${settings.apiBaseUrl}/api/generate-cover-letter`;
  const promptBrief = buildCoverLetterPromptBrief(body);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      promptBrief,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Generation failed (${res.status})`);
  }

  const json: unknown = await res.json();
  const normalized = normalizeGenerationResponse(json);

  if (body.responseShape === "structured" && normalized.shape === "plain") {
    return { shape: "structured", letter: generationResultToStructured(normalized, body.profile, body.job) };
  }
  if (body.responseShape === "plain" && normalized.shape === "structured") {
    const letter = normalized.letter;
    return {
      shape: "plain",
      text: [letter.greeting, letter.bodyParagraphs[0], letter.bodyParagraphs[1], letter.bodyParagraphs[2]]
        .join("\n\n")
        .trim(),
    };
  }

  return normalized;
}

/** Unified structured letter for cache + exports after generation. */
export function resolveStructuredLetter(
  result: GenerationResult,
  profile: UserProfile,
  job: JobContext,
): StructuredCoverLetter {
  if (result.shape === "structured") return result.letter;
  return generationResultToStructured(result, profile, job);
}
