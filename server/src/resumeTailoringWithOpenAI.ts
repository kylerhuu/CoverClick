import type {
  ResumeTailoringBulletSuggestion,
  ResumeTailoringRequest,
  ResumeTailoringResponse,
  UserProfile,
} from "./contract.js";
import { getOpenAI, getOpenAIModel } from "./openaiClient.js";

function profileDigest(p: UserProfile): string {
  const parts: string[] = [];
  if (p.summary.trim()) parts.push(`Summary:\n${p.summary.trim()}`);
  if (p.skills.length) parts.push(`Skills:\n${p.skills.join("\n")}`);
  if (p.experienceBullets.length) parts.push(`Experience bullets:\n${p.experienceBullets.map((b) => `• ${b}`).join("\n")}`);
  if (p.projectBullets.length) parts.push(`Project bullets:\n${p.projectBullets.map((b) => `• ${b}`).join("\n")}`);
  if (p.resumeText.trim()) {
    const rt = p.resumeText.trim();
    parts.push(`Resume excerpt:\n${rt.length > 7000 ? `${rt.slice(0, 7000)}\n[…]` : rt}`);
  }
  return parts.join("\n\n") || "(Profile data is sparse.)";
}

function jobDigest(req: ResumeTailoringRequest): string {
  const { job } = req;
  const desc = job.descriptionText.trim();
  return [
    `Title: ${job.jobTitle.trim() || "Unknown title"}`,
    `Company: ${job.companyName.trim() || "Unknown company"}`,
    `URL: ${job.pageUrl.trim() || "(missing URL)"}`,
    desc ? `Posting description:\n${desc.length > 9000 ? `${desc.slice(0, 9000)}\n[…]` : desc}` : "Posting description missing.",
  ].join("\n");
}

function toStringList(v: unknown, max = 12): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

function parseBulletRewriteSuggestions(v: unknown): ResumeTailoringBulletSuggestion[] {
  if (!Array.isArray(v)) return [];
  const out: ResumeTailoringBulletSuggestion[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const originalIdea = typeof o.originalIdea === "string" ? o.originalIdea.trim() : "";
    const improvedBullet = typeof o.improvedBullet === "string" ? o.improvedBullet.trim() : "";
    const reason = typeof o.reason === "string" ? o.reason.trim() : "";
    if (!originalIdea && !improvedBullet && !reason) continue;
    out.push({
      originalIdea: originalIdea || "Existing bullet is too generic.",
      improvedBullet: improvedBullet || "Add specific tools, impact, and outcomes relevant to the role.",
      reason: reason || "Makes impact and role alignment clearer for recruiters.",
    });
    if (out.length >= 8) break;
  }
  return out;
}

function fallbackWarnings(req: ResumeTailoringRequest): string[] {
  const warnings: string[] = [];
  if (!req.job.descriptionText.trim()) warnings.push("Job description is missing or very short; suggestions may be less specific.");
  const profileSignal =
    req.profile.summary.trim().length +
    req.profile.resumeText.trim().length +
    req.profile.experienceBullets.join("").length +
    req.profile.projectBullets.join("").length;
  if (profileSignal < 120) warnings.push("Profile data is limited. Add resume text, experience bullets, and skills for better tailoring.");
  return warnings;
}

export async function resumeTailoringWithOpenAI(req: ResumeTailoringRequest): Promise<ResumeTailoringResponse> {
  const openai = getOpenAI();
  const model = getOpenAIModel();
  const system = [
    "You are a resume coach creating role-specific tailoring suggestions.",
    "Output practical and specific suggestions based on provided profile and job text only.",
    "Do not invent employers, degrees, certifications, or metrics.",
    "If profile/job data is weak, still return helpful guidance and include warnings.",
    'Return JSON only with shape: { "summary": string, "skillsToAdd": string[], "keywordsToInclude": string[], "experienceToEmphasize": string[], "bulletRewriteSuggestions": [{ "originalIdea": string, "improvedBullet": string, "reason": string }], "sectionPriority": string[], "warnings": string[] }',
    "Keep summary to 1-3 short sentences. Keep bullets concise and actionable.",
  ].join("\n");

  const user = [`Candidate profile:\n${profileDigest(req.profile)}`, `Job context:\n${jobDigest(req)}`].join("\n\n");

  const res = await openai.chat.completions.create({
    model,
    temperature: 0.35,
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
  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  const warnings = [...toStringList(o.warnings), ...fallbackWarnings(req)];

  return {
    summary: summary || "These suggestions prioritize clearer role alignment and measurable impact in your resume.",
    skillsToAdd: toStringList(o.skillsToAdd),
    keywordsToInclude: toStringList(o.keywordsToInclude),
    experienceToEmphasize: toStringList(o.experienceToEmphasize),
    bulletRewriteSuggestions: parseBulletRewriteSuggestions(o.bulletRewriteSuggestions),
    sectionPriority: toStringList(o.sectionPriority),
    warnings: Array.from(new Set(warnings)).slice(0, 8),
  };
}
