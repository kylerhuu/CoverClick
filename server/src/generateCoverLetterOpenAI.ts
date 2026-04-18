import type { GenerationRequest, StructuredCoverLetter, UserProfile } from "./contract.js";
import { getOpenAI, getOpenAIModel } from "./openaiClient.js";
import { buildSenderBlockFromProfile, defaultDateLine, buildRecipientBlock } from "./letterBlocks.js";

const ANTI_CLICHE = [
  "Do not start the first body paragraph with: I am writing, I am excited to apply, I would like to express, Please accept.",
  "Vary sentence openings across paragraphs; mix short and medium sentences.",
  "Weave in 2–4 concrete details from the candidate bullets or resume text (metrics, tools, scope) — only if present in the profile data.",
  "Avoid stock closings like 'Thank you for your consideration' unless tone is formal and it fits naturally.",
  "Each generation should read differently: change phrasing, metaphors, and paragraph order vs a generic template.",
].join("\n");

function profileDigest(p: UserProfile): string {
  const parts: string[] = [];
  if (p.summary.trim()) parts.push(`Summary:\n${p.summary.trim()}`);
  if (p.skills.length) parts.push(`Skills:\n${p.skills.join("\n")}`);
  if (p.experienceBullets.length) parts.push(`Experience bullets:\n${p.experienceBullets.map((b) => `• ${b}`).join("\n")}`);
  if (p.projectBullets.length) parts.push(`Project bullets:\n${p.projectBullets.map((b) => `• ${b}`).join("\n")}`);
  if (p.resumeText.trim()) {
    const rt = p.resumeText.trim();
    parts.push(`Resume excerpt:\n${rt.length > 6000 ? `${rt.slice(0, 6000)}\n[…]` : rt}`);
  }
  if (p.school.trim() || p.major.trim()) {
    parts.push(`Education: ${p.school} ${p.major} ${p.graduationYear}`.trim());
  }
  return parts.join("\n\n") || "(No extended profile text provided.)";
}

function jobDigest(job: GenerationRequest["job"]): string {
  const desc = job.descriptionText.trim();
  return [
    `Title: ${job.jobTitle || "Unknown"}`,
    `Company: ${job.companyName || "Unknown"}`,
    `URL: ${job.pageUrl}`,
    desc ? `Posting description:\n${desc.length > 8000 ? `${desc.slice(0, 8000)}\n[…]` : desc}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseStructuredLetter(json: unknown): StructuredCoverLetter | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const letter = o.letter;
  if (!letter || typeof letter !== "object") return null;
  const L = letter as Record<string, unknown>;
  const bp = L.bodyParagraphs;
  if (!Array.isArray(bp) || bp.length < 3) return null;
  const p0 = typeof bp[0] === "string" ? bp[0] : "";
  const p1 = typeof bp[1] === "string" ? bp[1] : "";
  const p2 = typeof bp[2] === "string" ? bp[2] : "";
  return {
    senderBlock: typeof L.senderBlock === "string" ? L.senderBlock : "",
    dateLine: typeof L.dateLine === "string" ? L.dateLine : "",
    recipientBlock: typeof L.recipientBlock === "string" ? L.recipientBlock : "",
    greeting: typeof L.greeting === "string" ? L.greeting : "",
    bodyParagraphs: [p0, p1, p2],
    closing: typeof L.closing === "string" ? L.closing : "",
    signature: typeof L.signature === "string" ? L.signature : "",
  };
}

function variationNote(seed: string): string {
  return `Stylistic variation id (honor by varying diction): ${seed}`;
}

export async function generateCoverLetterWithOpenAI(
  req: GenerationRequest,
  opts: { variationSeed: string },
): Promise<{ format: "structured"; letter: StructuredCoverLetter } | { format: "plain"; coverLetter: string }> {
  const openai = getOpenAI();
  const model = getOpenAIModel();
  const { profile, job, tone, emphasis, length, responseShape, promptBrief } = req;

  const lengthHint =
    length === "short" ? "about 200–280 words total body" : length === "long" ? "about 360–480 words" : "about 260–400 words";

  const wantPlain = responseShape === "plain";
  const wantStructured = responseShape === "structured";

  const system = [
    "You write interview-ready cover letters for real job postings.",
    ANTI_CLICHE,
    `Tone: ${tone}. Emphasis angle: ${emphasis}. Target length: ${lengthHint}.`,
    variationNote(opts.variationSeed),
    "Use only facts from the candidate profile sections; never invent employers, titles, or metrics.",
    wantPlain
      ? 'Respond with JSON only: { "format": "plain", "coverLetter": "<full letter as one string with \\n\\n between paragraphs>" }'
      : wantStructured || responseShape === "auto"
        ? 'Respond with JSON only: { "format": "structured", "letter": { "senderBlock", "dateLine", "recipientBlock", "greeting", "bodyParagraphs": [p1,p2,p3], "closing", "signature" } }'
        : 'Respond with JSON only as specified in the user message.',
    "bodyParagraphs must be exactly three strings: opening fit + proof + motivation/closing arc.",
    "If profile.signatureBlock is non-empty, use it as signature (can be multiline). Else sign with full name.",
  ].join("\n\n");

  const user = [
    promptBrief ? `Client brief:\n${promptBrief}` : "",
    `Candidate name: ${profile.fullName || "Candidate"}`,
    `Sender block hint (you may refine):\n${buildSenderBlockFromProfile(profile) || profile.fullName || ""}`,
    `Recipient block hint:\n${buildRecipientBlock(job)}`,
    `Date line hint:\n${defaultDateLine()}`,
    `Profile details:\n${profileDigest(profile)}`,
    `Job context:\n${jobDigest(job)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const res = await openai.chat.completions.create({
    model,
    temperature: 0.85,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const raw = res.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned empty content.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("OpenAI returned invalid JSON.");
  }

  if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON shape from model.");

  const o = parsed as Record<string, unknown>;
  const fmt = o.format;

  if (fmt === "plain" && typeof o.coverLetter === "string" && o.coverLetter.trim()) {
    return { format: "plain", coverLetter: o.coverLetter.trim() };
  }

  if (fmt === "structured") {
    const letter = parseStructuredLetter(parsed);
    if (letter) return { format: "structured", letter };
  }

  // auto / fallback: try structured then plain
  const letter = parseStructuredLetter(parsed);
  if (letter) return { format: "structured", letter };

  if (typeof o.coverLetter === "string" && o.coverLetter.trim()) {
    return { format: "plain", coverLetter: o.coverLetter.trim() };
  }

  throw new Error("Model JSON missing structured letter or coverLetter.");
}
