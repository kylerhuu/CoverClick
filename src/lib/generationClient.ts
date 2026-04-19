import type {
  AppSettings,
  GenerationRequest,
  GenerationResult,
  JobContext,
  StructuredCoverLetter,
  UserProfile,
} from "./types";
import { normalizeApiOrigin } from "./backendApi";
import { buildCoverLetterPromptBrief } from "./prompts";
import { generationResultToStructured, normalizeGenerationResponse } from "./generationNormalize";
import {
  buildRecipientBlock,
  buildSenderBlockFromProfile,
  defaultDateLine,
  structuredLetterToPlainText,
} from "./letterModel";

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function mockStructuredLetter(req: GenerationRequest): StructuredCoverLetter {
  const name = req.profile.fullName.trim() || "Your Name";
  const role = req.job.jobTitle.trim() || "this role";
  const company = req.job.companyName.trim() || "your team";
  const seed = hashSeed(`${req.job.pageUrl}|${role}|${company}`);
  const bullets = [
    ...req.profile.experienceBullets.slice(0, 2),
    ...req.profile.projectBullets.slice(0, 1),
  ]
    .map((b) => b.trim())
    .filter(Boolean);

  const openings = [
    () =>
      `The ${role} opening at ${company} lines up with the work I’ve been doing lately—especially where ownership, clarity, and iteration speed matter as much as the final ship.`,
    () =>
      `I’m reaching out about the ${role} role at ${company}. The posting reads like a team that cares about craft and communication, which is the environment I do my best work in.`,
    () =>
      `After reading the ${role} description at ${company}, I’m confident my recent projects map closely to what you’re trying to accomplish this year.`,
  ];
  const p0 = openings[seed % openings.length]();

  const proofVariants = [
    () =>
      bullets.length > 0
        ? `Lately I’ve been leaning on work like this: ${bullets.join(" ")}`
        : req.profile.summary.trim()
          ? `In my background, the through-line is: ${req.profile.summary.trim().slice(0, 300)}${req.profile.summary.length > 300 ? "…" : ""}`
          : "I’m strongest when I’m pairing clear problem framing with tight execution loops and honest stakeholder updates.",
    () =>
      bullets.length > 0
        ? `A few outcomes I’m comfortable speaking to: ${bullets.join(" ")}`
        : req.profile.summary.trim()
          ? `What I bring isn’t generic “passion”—it’s repeated practice with: ${req.profile.summary.trim().slice(0, 300)}${req.profile.summary.length > 300 ? "…" : ""}`
          : "I like ambiguous scopes, measurable outcomes, and teams that argue kindly until the best idea wins.",
  ];
  const proof = proofVariants[(seed >> 3) % proofVariants.length]();

  const bridgeVariants = [
    `The ${req.emphasis} angle in this role matches how I like to contribute—${req.tone} communication, pragmatic tradeoffs, and end-to-end responsibility where it helps the team.`,
    `I’m especially interested in how ${company} is positioning this ${req.emphasis} work; I tend to operate in a ${req.tone} register while still being precise about risks and timelines.`,
    `What stands out is the bar for quality at ${company}. That fits how I work: ${req.tone}, detail-aware, and biased toward shipping learning milestones—not just decks.`,
  ];
  const b2 = bridgeVariants[(seed >> 5) % bridgeVariants.length];

  const closers = [
    "If it sounds like there’s overlap, I’d welcome a short conversation to compare notes on priorities and how I could help in the next few months.",
    "Happy to share a couple concrete examples in a conversation—especially where my experience intersects your roadmap.",
    "I’d appreciate the chance to learn what “great” looks like on your team for this hire, and where an extra pair of hands would move the needle fastest.",
  ];
  const b3 = closers[(seed >> 7) % closers.length];

  const greetings = [
    `Dear ${company} hiring team,`,
    `Dear ${company} team,`,
    `Hello ${company} recruiting team,`,
  ];
  const greeting = greetings[seed % greetings.length];

  const sig = req.profile.signatureBlock.trim() || `Sincerely,\n${name}`;

  return {
    senderBlock: buildSenderBlockFromProfile(req.profile) || name,
    dateLine: defaultDateLine(),
    recipientBlock: buildRecipientBlock(req.job),
    greeting,
    bodyParagraphs: [p0, `${proof} ${b2}`, b3],
    closing: "Sincerely,",
    signature: sig,
  };
}

export async function requestCoverLetterGeneration(settings: AppSettings, body: GenerationRequest): Promise<GenerationResult> {
  if (settings.useMock) {
    await new Promise((r) => setTimeout(r, 400));
    if (body.responseShape === "plain") {
      const letter = mockStructuredLetter(body);
      return { shape: "plain", text: structuredLetterToPlainText(letter) };
    }
    return { shape: "structured", letter: mockStructuredLetter(body) };
  }

  const url = `${normalizeApiOrigin(settings.apiBaseUrl)}/api/generate-cover-letter`;
  const promptBrief = buildCoverLetterPromptBrief(body);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (settings.authToken?.trim()) {
    headers.Authorization = `Bearer ${settings.authToken.trim()}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...body,
      promptBrief,
    }),
  });

  if (!res.ok) {
    let msg = await res.text().catch(() => "");
    try {
      const j = JSON.parse(msg) as { error?: string };
      if (typeof j.error === "string" && j.error.trim()) msg = j.error.trim();
    } catch {
      // keep text
    }
    throw new Error(msg || `Generation failed (${res.status})`);
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
