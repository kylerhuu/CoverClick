import type { UserProfile } from "./contract.js";
import { getOpenAI, getOpenAIModel } from "./openaiClient.js";

const EXTRACTION_SYSTEM = `You extract structured candidate profile fields from resume text ONLY.
Rules:
- Never invent employers, degrees, dates, or metrics not supported by the resume.
- If unknown, use empty string "" or empty array [].
- skills: short tokens or phrases, max ~24 items.
- experienceBullets and projectBullets: outcome-focused lines the candidate could cite in a cover letter; max ~12 each.
- summary: 2–4 sentences in the candidate's voice, grounded in the resume.
- resumeText: return the same input resume excerpt you were given (may be truncated in the user message), not invented text.
Return ONLY valid JSON matching the schema in the user message.`;

export async function extractProfileFromResumeText(resumeText: string): Promise<UserProfile> {
  const openai = getOpenAI();
  const model = getOpenAIModel();

  const schemaHint = `Return a single JSON object with keys:
fullName, email, phone, location, linkedin, portfolio, school, major, graduationYear,
summary, skills (array of strings), experienceBullets (array), projectBullets (array),
resumeText (echo the source text you were given, may truncate with "[…]" if very long),
defaultTone ("professional"|"warm"|"concise"|"enthusiastic"|"formal"),
signatureBlock (optional closing, often empty).`;

  const res = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM },
      {
        role: "user",
        content: `Resume text:\n\n${resumeText}\n\n${schemaHint}`,
      },
    ],
  });

  const raw = res.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned empty extraction.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("OpenAI returned invalid JSON.");
  }

  const out = normalizeExtractedProfile(parsed);
  if (!out.resumeText.trim()) out.resumeText = resumeText.trim().slice(0, 28000);
  return out;
}

function asStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asStrArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean);
}

function normalizeExtractedProfile(raw: unknown): UserProfile {
  if (!raw || typeof raw !== "object") {
    return emptyProfile();
  }
  const o = raw as Record<string, unknown>;
  const tone = o.defaultTone;
  const defaultTone =
    tone === "warm" ||
    tone === "concise" ||
    tone === "enthusiastic" ||
    tone === "formal" ||
    tone === "professional"
      ? tone
      : "professional";

  return {
    fullName: asStr(o.fullName),
    email: asStr(o.email),
    phone: asStr(o.phone),
    location: asStr(o.location),
    linkedin: asStr(o.linkedin),
    portfolio: asStr(o.portfolio),
    school: asStr(o.school),
    major: asStr(o.major),
    graduationYear: asStr(o.graduationYear),
    summary: asStr(o.summary),
    skills: asStrArr(o.skills).slice(0, 32),
    experienceBullets: asStrArr(o.experienceBullets).slice(0, 16),
    projectBullets: asStrArr(o.projectBullets).slice(0, 16),
    resumeText: asStr(o.resumeText),
    defaultTone,
    signatureBlock: asStr(o.signatureBlock),
  };
}

function emptyProfile(): UserProfile {
  return {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    portfolio: "",
    school: "",
    major: "",
    graduationYear: "",
    summary: "",
    skills: [],
    experienceBullets: [],
    projectBullets: [],
    resumeText: "",
    defaultTone: "professional",
    signatureBlock: "",
  };
}
