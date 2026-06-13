import type { DegreeType, ResumeEducationItem } from "./types";

function trim(value: string): string {
  return value.trim();
}

export function degreeLabel(degreeType: DegreeType): string {
  switch (degreeType) {
    case "Bachelor's":
      return "Bachelor's Degree";
    case "Master's":
      return "Master's Degree";
    case "High School":
      return "High School Diploma";
    default:
      return degreeType === "Other" ? "Degree" : degreeType;
  }
}

/** Avoid storing or rendering the same text in both degree and major. */
export function normalizeEducationItem<T extends ResumeEducationItem>(entry: T): T {
  const major = trim(entry.major);
  const concentrationOrMinor = trim(entry.concentrationOrMinor ?? "");
  let degree = trim(entry.degree);
  const type = entry.degreeType ?? "Other";
  const label = degreeLabel(type);

  if (major) {
    if (!degree || degree.toLowerCase() === major.toLowerCase()) {
      degree = "";
    } else if (degree.toLowerCase() === label.toLowerCase()) {
      degree = "";
    }
  }

  return {
    ...entry,
    degree,
    major,
    concentrationOrMinor,
  };
}

/** Degree line for preview/export — only explicit stored degree text. */
export function educationDegreeLine(entry: ResumeEducationItem): string {
  const major = trim(entry.major);
  const explicit = trim(entry.degree);
  if (!explicit) return "";
  if (major && explicit.toLowerCase() === major.toLowerCase()) return "";
  return explicit;
}

/** Major line for preview/export — omits text already shown on the degree line. */
export function educationMajorLine(entry: ResumeEducationItem): string {
  const degreeLine = educationDegreeLine(entry);
  const pieces = [trim(entry.major), trim(entry.concentrationOrMinor ?? "")].filter(Boolean);
  const majorLine = pieces.join(" | ");
  if (!majorLine) return "";
  if (degreeLine && majorLine.toLowerCase() === degreeLine.toLowerCase()) return "";
  if (degreeLine && majorLine.length < degreeLine.length && degreeLine.toLowerCase().includes(majorLine.toLowerCase())) {
    return "";
  }
  return majorLine;
}

export function parseSchoolLineOverride(
  line: string,
  entry: ResumeEducationItem,
): { school: string; graduationDate: string } {
  const trimmed = line.trim();
  const gradMatch = trimmed.match(/Expected Graduation:\s*(.+)$/i);
  if (gradMatch) {
    const graduationDate = gradMatch[1].trim();
    const school = trimmed.replace(/\s*Expected Graduation:\s*.+$/i, "").replace(/\s+/g, " ").trim();
    return { school: school || entry.school, graduationDate: graduationDate || entry.graduationDate };
  }
  return { school: trimmed || entry.school, graduationDate: entry.graduationDate };
}

export function parseMajorLineOverride(line: string): { major: string; concentrationOrMinor: string } {
  if (!line.trim()) return { major: "", concentrationOrMinor: "" };
  const parts = line.split("|").map((s) => s.trim()).filter(Boolean);
  return {
    major: parts[0] ?? "",
    concentrationOrMinor: parts.slice(1).join(" | "),
  };
}

export function parseDegreeLineOverride(line: string, entry: ResumeEducationItem): string {
  const trimmed = line.trim();
  if (!trimmed) return "";
  const label = entry.degreeType ? degreeLabel(entry.degreeType) : "";
  if (label && trimmed.toLowerCase() === label.toLowerCase()) return "";
  return trimmed;
}
