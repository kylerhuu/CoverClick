import type {
  DegreeType,
  ProfileEducationEntry,
  ProfileExperienceEntry,
  ProfileProjectEntry,
  ProfileSkillCategory,
  ProfileStructuredEntries,
  UserProfile,
} from "./contract.js";
import { getOpenAI, getOpenAIModel } from "./openaiClient.js";

const EXTRACTION_SYSTEM = `You extract structured candidate profile fields from resume text ONLY.
Rules:
- Never invent employers, schools, degrees, dates, skills, links, or metrics not supported by the resume.
- If uncertain, leave fields blank and add a warning.
- Detect separate entries; do NOT merge multiple experiences/projects into one.
- Detect project tech stacks when present.
- Detect skill categories when present (e.g. Programming, Data & Analysis, Product & Business).
- summary: 2-4 sentences grounded in resume facts.
- resumeText: echo the same source text input (may truncate with "[…]" if too long).
Return ONLY valid JSON matching the schema hint in the user message.`;

export async function extractProfileFromResumeText(resumeText: string): Promise<UserProfile> {
  const openai = getOpenAI();
  const model = getOpenAIModel();

  const schemaHint = `Return a single JSON object with keys:
fullName, email, phone, location, linkedin, portfolio, school, major, graduationYear,
summary, skills (array of strings), experienceBullets (array), projectBullets (array),
structuredEntries: {
  experience: [{ company, companySubtitle, location, title, dates, bullets }],
  projects: [{ name, subtitle, techStack, bullets }],
  education: [{ school, degreeType, degree, major, concentrationOrMinor, gpa, graduationDate, details }],
  skills: [{ category, items }],
  warnings: string[]
},
resumeText (echo input text),
defaultTone ("professional"|"warm"|"concise"|"enthusiastic"|"formal"),
signatureBlock.`;

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

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function asDegreeType(v: unknown): DegreeType {
  const s = asStr(v);
  if (
    s === "High School" ||
    s === "Associate" ||
    s === "Bachelor's" ||
    s === "Master's" ||
    s === "MBA" ||
    s === "JD" ||
    s === "MD" ||
    s === "PhD" ||
    s === "Certificate" ||
    s === "Other"
  ) {
    return s;
  }
  return "Other";
}

function inferDegreeType(text: string): DegreeType {
  const s = text.toLowerCase();
  if (!s) return "Other";
  if (s.includes("high school")) return "High School";
  if (s.includes("associate") || s.includes("a.a") || s.includes("a.s")) return "Associate";
  if (s.includes("mba")) return "MBA";
  if (s.includes("jd") || s.includes("juris doctor")) return "JD";
  if (s.includes("md") || s.includes("doctor of medicine")) return "MD";
  if (s.includes("phd") || s.includes("ph.d") || s.includes("doctor of philosophy")) return "PhD";
  if (s.includes("master")) return "Master's";
  if (s.includes("bachelor") || s.includes("b.s") || s.includes("b.a") || s.includes("bs ") || s.includes("ba ")) {
    return "Bachelor's";
  }
  if (s.includes("certificate") || s.includes("certification")) return "Certificate";
  return "Other";
}

function normalizeExperience(v: unknown): ProfileExperienceEntry[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => asObj(x))
    .map((x) => ({
      company: asStr(x.company),
      companySubtitle: asStr(x.companySubtitle),
      location: asStr(x.location),
      title: asStr(x.title),
      dates: asStr(x.dates),
      bullets: asStrArr(x.bullets).slice(0, 12),
    }))
    .filter((x) => x.company || x.title || x.dates || x.bullets.length)
    .slice(0, 12);
}

function normalizeProjects(v: unknown): ProfileProjectEntry[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => asObj(x))
    .map((x) => ({
      name: asStr(x.name),
      subtitle: asStr(x.subtitle),
      techStack: asStrArr(x.techStack).slice(0, 20),
      bullets: asStrArr(x.bullets).slice(0, 12),
    }))
    .filter((x) => x.name || x.subtitle || x.techStack.length || x.bullets.length)
    .slice(0, 16);
}

function normalizeEducation(v: unknown): ProfileEducationEntry[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => asObj(x))
    .map((x) => {
      const degree = asStr(x.degree);
      const degreeTypeRaw = asDegreeType(x.degreeType);
      const degreeType = degreeTypeRaw === "Other" ? inferDegreeType(degree) : degreeTypeRaw;
      return {
        school: asStr(x.school),
        degreeType,
        degree,
        major: asStr(x.major),
        concentrationOrMinor: asStr(x.concentrationOrMinor),
        gpa: asStr(x.gpa),
        graduationDate: asStr(x.graduationDate),
        details: asStrArr(x.details).slice(0, 8),
      };
    })
    .filter((x) => x.school || x.degree || x.major || x.graduationDate)
    .slice(0, 8);
}

function normalizeSkillCategories(v: unknown): ProfileSkillCategory[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => asObj(x))
    .map((x) => ({
      category: asStr(x.category),
      items: asStrArr(x.items).slice(0, 32),
    }))
    .filter((x) => x.category || x.items.length)
    .slice(0, 12);
}

function normalizeStructuredEntries(v: unknown): ProfileStructuredEntries {
  const o = asObj(v);
  const experience = normalizeExperience(o.experience);
  const projects = normalizeProjects(o.projects);
  const education = normalizeEducation(o.education);
  const skills = normalizeSkillCategories(o.skills);
  const warnings = asStrArr(o.warnings).slice(0, 20);
  return { experience, projects, education, skills, warnings };
}

function legacyFromStructured(structured: ProfileStructuredEntries): Pick<UserProfile, "skills" | "experienceBullets" | "projectBullets" | "school" | "major" | "graduationYear"> {
  const skills = structured.skills.flatMap((g) => g.items).slice(0, 32);
  const experienceBullets = structured.experience.flatMap((e) => e.bullets).slice(0, 16);
  const projectBullets = structured.projects.flatMap((p) => p.bullets).slice(0, 16);
  const primaryEdu = structured.education[0];
  return {
    skills,
    experienceBullets,
    projectBullets,
    school: primaryEdu?.school ?? "",
    major: primaryEdu?.major ?? "",
    graduationYear: primaryEdu?.graduationDate ?? "",
  };
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

  const structuredEntries = normalizeStructuredEntries(o.structuredEntries);
  const legacyFromStructuredFields = legacyFromStructured(structuredEntries);

  const skillsLegacy = asStrArr(o.skills).slice(0, 32);
  const experienceBulletsLegacy = asStrArr(o.experienceBullets).slice(0, 16);
  const projectBulletsLegacy = asStrArr(o.projectBullets).slice(0, 16);

  return {
    fullName: asStr(o.fullName),
    email: asStr(o.email),
    phone: asStr(o.phone),
    location: asStr(o.location),
    linkedin: asStr(o.linkedin),
    portfolio: asStr(o.portfolio),
    school: asStr(o.school) || legacyFromStructuredFields.school,
    major: asStr(o.major) || legacyFromStructuredFields.major,
    graduationYear: asStr(o.graduationYear) || legacyFromStructuredFields.graduationYear,
    summary: asStr(o.summary),
    skills: skillsLegacy.length ? skillsLegacy : legacyFromStructuredFields.skills,
    experienceBullets: experienceBulletsLegacy.length ? experienceBulletsLegacy : legacyFromStructuredFields.experienceBullets,
    projectBullets: projectBulletsLegacy.length ? projectBulletsLegacy : legacyFromStructuredFields.projectBullets,
    resumeText: asStr(o.resumeText),
    defaultTone,
    signatureBlock: asStr(o.signatureBlock),
    structuredEntries,
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
    structuredEntries: {
      experience: [],
      projects: [],
      education: [],
      skills: [],
      warnings: [],
    },
  };
}
