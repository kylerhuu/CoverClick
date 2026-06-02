import type { JobFitScoreRequest, JobFitScoreResponse, UserProfile } from "./contract.js";
import { getOpenAI, getOpenAIModel } from "./openaiClient.js";

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

function jobDigest(job: JobFitScoreRequest["job"]): string {
  const desc = job.descriptionText.trim();
  return [
    `Title: ${job.jobTitle || "Unknown"}`,
    `Company: ${job.companyName || "Unknown"}`,
    `URL: ${job.pageUrl || "(missing)"}`,
    desc ? `Posting description:\n${desc.length > 9000 ? `${desc.slice(0, 9000)}\n[…]` : desc}` : "Posting description missing.",
  ].join("\n");
}

function clampScore(n: unknown): number {
  const value = typeof n === "number" ? n : typeof n === "string" ? Number.parseFloat(n) : NaN;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeShouldApply(v: unknown): JobFitScoreResponse["shouldApply"] {
  if (typeof v !== "string") return "MAYBE";
  const upper = v.toUpperCase();
  if (upper === "YES" || upper === "MAYBE" || upper === "NO") return upper;
  return "MAYBE";
}

export async function jobFitScoreWithOpenAI(req: JobFitScoreRequest): Promise<JobFitScoreResponse> {
  const openai = getOpenAI();
  const model = getOpenAIModel();
  const system = [
    "You estimate job fit and ATS-style keyword alignment for a candidate against a job posting.",
    "Important: scores are estimates only, not guarantees.",
    "Use only information provided in candidate profile and posting text. Do not invent facts.",
    'Return JSON only with shape: { "atsScore": number, "jobFitScore": number, "summary": string, "strengths": string[], "weaknesses": string[], "missingKeywords": string[], "recommendedChanges": string[], "shouldApply": "YES" | "MAYBE" | "NO" }',
    "Keep summary to 1-3 sentences.",
    "Scores should be integers from 0-100.",
    "Each list should have concise bullets (typically 3-6 items).",
  ].join("\n");

  const user = [`Candidate profile:\n${profileDigest(req.profile)}`, `Job context:\n${jobDigest(req.job)}`].join("\n\n");

  const res = await openai.chat.completions.create({
    model,
    temperature: 0.4,
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

  return {
    atsScore: clampScore(o.atsScore),
    jobFitScore: clampScore(o.jobFitScore),
    summary: summary || "Estimate unavailable. Try running analysis again.",
    strengths: stringList(o.strengths),
    weaknesses: stringList(o.weaknesses),
    missingKeywords: stringList(o.missingKeywords),
    recommendedChanges: stringList(o.recommendedChanges),
    shouldApply: normalizeShouldApply(o.shouldApply),
  };
}
