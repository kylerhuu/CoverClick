import type {
  ResumeOptimizeForJobRequest,
  ResumeOptimizeForJobResponse,
  ResumeOptimizationSuggestion,
  StructuredResume,
} from "./contract.js";
import { getOpenAI, getOpenAIModel } from "./openaiClient.js";

function resumeDigest(resume: StructuredResume): string {
  return [
    `Contact: ${resume.contact.fullName} | ${resume.contact.location}`,
    resume.summary ? `Summary: ${resume.summary}` : "",
    resume.experience.length
      ? `Experience:
${resume.experience
          .map((e) => `- [${e.id ?? ""}] ${e.title} @ ${e.company} (${e.dates})\n  bullets: ${e.bullets.join(" || ")}`)
          .join("\n")}`
      : "",
    resume.projects.length
      ? `Projects:
${resume.projects
          .map(
            (p) =>
              `- [${p.id ?? ""}] ${p.name} | ${p.subtitle} | tech: ${p.techStack.join(", ")}\n  bullets: ${p.bullets.join(" || ")}`,
          )
          .join("\n")}`
      : "",
    resume.education.length
      ? `Education:
${resume.education
          .map(
            (e) =>
              `- [${e.id ?? ""}] ${e.school} | ${e.degree} | ${e.major} | ${e.graduationDate} | GPA ${e.gpa ?? ""}`,
          )
          .join("\n")}`
      : "",
    resume.skills.length
      ? `Skills:
${resume.skills.map((g) => `- [${g.id ?? ""}] ${g.category}: ${g.items.join(", ")}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function jobDigest(req: ResumeOptimizeForJobRequest): string {
  const { job } = req;
  return [
    `Title: ${job.jobTitle || "Unknown title"}`,
    `Company: ${job.companyName || "Unknown company"}`,
    `URL: ${job.pageUrl || "(missing)"}`,
    job.descriptionText?.trim() ? `Description:\n${job.descriptionText.slice(0, 9000)}` : "Description missing.",
  ].join("\n");
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeSuggestion(raw: unknown, idx: number): ResumeOptimizationSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const section = asString(o.section);
  const changeType = asString(o.changeType);
  const priority = asString(o.priority);
  if (!["summary", "experience", "projects", "skills", "education"].includes(section)) return null;
  if (!["rewrite", "add", "remove", "reorder", "emphasize"].includes(changeType)) return null;
  if (!["high", "medium", "low"].includes(priority)) return null;
  const suggestedText = asString(o.suggestedText);
  const reason = asString(o.reason);
  const fieldPath = asString(o.fieldPath);
  if (!suggestedText || !reason) return null;
  return {
    id: asString(o.id) || `sg-${idx + 1}`,
    section: section as ResumeOptimizationSuggestion["section"],
    targetId: asString(o.targetId) || undefined,
    fieldPath: ["summary", "bullets", "techStack", "subtitle", "details", "items"].includes(fieldPath)
      ? (fieldPath as ResumeOptimizationSuggestion["fieldPath"])
      : undefined,
    changeType: changeType as ResumeOptimizationSuggestion["changeType"],
    currentText: asString(o.currentText),
    suggestedText,
    reason,
    priority: priority as ResumeOptimizationSuggestion["priority"],
  };
}

export async function resumeOptimizeForJobWithOpenAI(req: ResumeOptimizeForJobRequest): Promise<ResumeOptimizeForJobResponse> {
  const openai = getOpenAI();
  const model = getOpenAIModel();
  const system = [
    "You optimize an existing structured resume for a specific job posting.",
    "Critical constraints:",
    "- Never invent employers, titles, schools, certifications, skills, or metrics.",
    "- Use only resume data and job description provided.",
    "- Suggest field-level or bullet-level edits only (no full section rewrites).",
    "- If uncertain, emit warnings and lower-priority manual suggestions.",
    'Return JSON only with shape: { "summary": string, "suggestions": [{ "id": string, "section": "summary" | "experience" | "projects" | "skills" | "education", "targetId": string, "fieldPath": "summary" | "bullets" | "techStack" | "subtitle" | "details" | "items", "changeType": "rewrite" | "add" | "remove" | "reorder" | "emphasize", "currentText": string, "suggestedText": string, "reason": string, "priority": "high" | "medium" | "low" }], "keywordsToAdd": string[], "warnings": string[] }',
    "Use targetId whenever possible using the section item ids shown in brackets.",
  ].join("\n");

  const user = [`Resume:\n${resumeDigest(req.resume)}`, `Job:\n${jobDigest(req)}`].join("\n\n");
  const response = await openai.chat.completions.create({
    model,
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned empty content.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("OpenAI returned invalid JSON.");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON shape from model.");
  const obj = parsed as Record<string, unknown>;
  const suggestionsRaw = Array.isArray(obj.suggestions) ? obj.suggestions : [];
  const suggestions = suggestionsRaw
    .map((s, i) => normalizeSuggestion(s, i))
    .filter((s): s is ResumeOptimizationSuggestion => Boolean(s))
    .slice(0, 25);

  const warnings = asStringArray(obj.warnings);
  if (!req.job.descriptionText.trim()) warnings.push("Job description is missing or short; optimization quality may be limited.");
  if (!req.resume.experience.length && !req.resume.projects.length) {
    warnings.push("Resume has limited experience/project content. Add bullets for better optimization.");
  }

  return {
    summary: asString(obj.summary) || "Suggestions generated to improve alignment with the target job while preserving your original experience.",
    suggestions,
    keywordsToAdd: asStringArray(obj.keywordsToAdd),
    warnings: Array.from(new Set(warnings)).slice(0, 10),
  };
}
