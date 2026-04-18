import type { UserProfile } from "./types";

const WEIGHTS: ReadonlyArray<{ key: keyof UserProfile; label: string; weight: number }> = [
  { key: "fullName", label: "Name", weight: 12 },
  { key: "email", label: "Email", weight: 10 },
  { key: "summary", label: "Summary", weight: 18 },
  { key: "skills", label: "Skills", weight: 10 },
  { key: "experienceBullets", label: "Experience", weight: 14 },
  { key: "projectBullets", label: "Projects", weight: 8 },
  { key: "phone", label: "Phone", weight: 4 },
  { key: "location", label: "Location", weight: 4 },
  { key: "linkedin", label: "LinkedIn", weight: 4 },
  { key: "portfolio", label: "Portfolio", weight: 4 },
  { key: "school", label: "School", weight: 4 },
  { key: "major", label: "Major", weight: 4 },
  { key: "graduationYear", label: "Grad year", weight: 4 },
];

function fieldFilled(profile: UserProfile, key: keyof UserProfile): boolean {
  const v = profile[key];
  if (Array.isArray(v)) return v.some((s) => typeof s === "string" && s.trim().length > 0);
  if (typeof v === "string") return v.trim().length > 0;
  return false;
}

export function profileCompleteness(profile: UserProfile): {
  score: number;
  missingLabels: string[];
} {
  let earned = 0;
  let total = 0;
  const missing: string[] = [];
  for (const { key, label, weight } of WEIGHTS) {
    total += weight;
    if (fieldFilled(profile, key)) earned += weight;
    else missing.push(label);
  }
  const score = total > 0 ? Math.round((earned / total) * 100) : 0;
  return { score, missingLabels: missing.slice(0, 5) };
}
