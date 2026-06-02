import type { ResumeSummaryGenerateRequest } from "./contract.js";
import { getOpenAI, getOpenAIModel } from "./openaiClient.js";

function digest(req: ResumeSummaryGenerateRequest): string {
  const { resume } = req;
  return [
    `Target role: ${req.targetRole?.trim() || "General"}`,
    `Name: ${resume.contact.fullName || "Candidate"}`,
    resume.education.length ? `Education:\n${resume.education.map((e) => `- ${e.school} | ${e.degree} | ${e.dates}`).join("\n")}` : "",
    resume.experience.length
      ? `Experience:\n${resume.experience
          .map((e) => `- ${e.title} at ${e.company} (${e.dates}) ${e.location}\n  ${e.bullets.slice(0, 2).join("\n  ")}`)
          .join("\n")}`
      : "",
    resume.projects.length
      ? `Projects:\n${resume.projects.map((p) => `- ${p.name} (${p.role}) ${p.bullets.slice(0, 1).join(" ")}`).join("\n")}`
      : "",
    resume.skills.length ? `Skills:\n${resume.skills.map((g) => `${g.category}: ${g.items.join(", ")}`).join("\n")}` : "",
    resume.certifications.length ? `Certifications: ${resume.certifications.join(", ")}` : "",
    resume.leadership.length ? `Leadership: ${resume.leadership.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function generateResumeSummaryWithOpenAI(req: ResumeSummaryGenerateRequest): Promise<string> {
  const openai = getOpenAI();
  const model = getOpenAIModel();
  const system = [
    "Write a concise professional resume summary.",
    "Use only details provided. Do not invent employers, metrics, or credentials.",
    "Return JSON only: { \"summary\": string }",
    "Length target: 2-3 sentences, approximately 45-80 words.",
    "Tone: recruiter-friendly and ATS-safe.",
  ].join("\n");

  const res = await openai.chat.completions.create({
    model,
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: digest(req) },
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
  const summary = parsed && typeof parsed === "object" && typeof (parsed as Record<string, unknown>).summary === "string"
    ? ((parsed as Record<string, unknown>).summary as string).trim()
    : "";
  if (!summary) {
    throw new Error("Model returned empty summary.");
  }
  return summary;
}
