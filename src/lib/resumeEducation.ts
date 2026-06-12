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
  } else if (!degree && type !== "Other") {
    degree = label;
  }

  return {
    ...entry,
    degree,
    major,
    concentrationOrMinor,
  };
}

/** Degree line for preview/export — uses explicit degree or falls back to degree type label. */
export function educationDegreeLine(entry: ResumeEducationItem): string {
  const major = trim(entry.major);
  const explicit = trim(entry.degree);
  const label = entry.degreeType ? degreeLabel(entry.degreeType) : "";

  if (explicit) {
    if (major && explicit.toLowerCase() === major.toLowerCase()) return label || explicit;
    return explicit;
  }
  return label;
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
