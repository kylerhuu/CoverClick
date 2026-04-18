import type { GenerationResult, JobContext, StructuredCoverLetter, UserProfile } from "./types";
import { plainTextToStructuredLetter } from "./letterModel";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseStructuredLetter(raw: unknown): StructuredCoverLetter | null {
  if (!isRecord(raw)) return null;
  const bp = raw.bodyParagraphs;
  if (!Array.isArray(bp) || bp.length < 3) return null;
  const p0 = typeof bp[0] === "string" ? bp[0] : "";
  const p1 = typeof bp[1] === "string" ? bp[1] : "";
  const p2 = typeof bp[2] === "string" ? bp[2] : "";
  return {
    senderBlock: typeof raw.senderBlock === "string" ? raw.senderBlock : "",
    dateLine: typeof raw.dateLine === "string" ? raw.dateLine : "",
    recipientBlock: typeof raw.recipientBlock === "string" ? raw.recipientBlock : "",
    greeting: typeof raw.greeting === "string" ? raw.greeting : "",
    bodyParagraphs: [p0, p1, p2],
    closing: typeof raw.closing === "string" ? raw.closing : "",
    signature: typeof raw.signature === "string" ? raw.signature : "",
  };
}

/**
 * Normalizes arbitrary JSON from the API into a `GenerationResult`.
 */
export function normalizeGenerationResponse(json: unknown): GenerationResult {
  if (!isRecord(json)) {
    throw new Error("Invalid JSON from server.");
  }

  const fmt = json.format;
  if (fmt === "structured") {
    const letter = parseStructuredLetter(json.letter);
    if (!letter) throw new Error("Server returned structured format but letter was invalid.");
    return { shape: "structured", letter };
  }

  if (fmt === "plain" && typeof json.coverLetter === "string" && json.coverLetter.trim()) {
    return { shape: "plain", text: json.coverLetter.trim() };
  }

  if (typeof json.coverLetter === "string" && json.coverLetter.trim()) {
    return { shape: "plain", text: json.coverLetter.trim() };
  }

  const nested = json.data;
  if (isRecord(nested)) {
    if (typeof nested.coverLetter === "string" && nested.coverLetter.trim()) {
      return { shape: "plain", text: nested.coverLetter.trim() };
    }
    const nestedLetter = parseStructuredLetter(nested.letter);
    if (nestedLetter) return { shape: "structured", letter: nestedLetter };
  }

  throw new Error("Server response missing letter content.");
}

export function generationResultToStructured(
  result: GenerationResult,
  profile: UserProfile,
  job: JobContext,
): StructuredCoverLetter {
  if (result.shape === "structured") return result.letter;
  return plainTextToStructuredLetter(result.text, profile, job);
}
