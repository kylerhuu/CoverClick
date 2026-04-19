import type { UserProfile } from "./types";
import { cleanItemList } from "./profileArrays";

const STRING_KEYS = [
  "fullName",
  "email",
  "phone",
  "location",
  "linkedin",
  "portfolio",
  "school",
  "major",
  "graduationYear",
  "summary",
  "resumeText",
  "signatureBlock",
] as const satisfies readonly (keyof UserProfile)[];

const ARRAY_KEYS = ["skills", "experienceBullets", "projectBullets"] as const satisfies readonly (keyof UserProfile)[];

export type ProfileImportConflict = {
  id: string;
  label: string;
  before: string;
  after: string;
};

const FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  location: "Location",
  linkedin: "LinkedIn",
  portfolio: "Portfolio",
  school: "School",
  major: "Major",
  graduationYear: "Graduation year",
  summary: "Summary",
  resumeText: "Resume text",
  signatureBlock: "Signature",
  skills: "Skills",
  experienceBullets: "Experience bullets",
  projectBullets: "Project bullets",
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function arrLines(items: string[]): string {
  const lines = cleanItemList(items);
  return lines.length ? lines.map((s) => `• ${s}`).join("\n") : "—";
}

function listsMeaningfullyDiffer(a: string[], b: string[]): boolean {
  const ca = cleanItemList(a);
  const cb = cleanItemList(b);
  if (ca.length === 0 || cb.length === 0) return false;
  if (ca.length !== cb.length) return true;
  for (let i = 0; i < ca.length; i++) {
    if (ca[i] !== cb[i]) return true;
  }
  return false;
}

/** True when the profile has no meaningful user content (import baseline). */
export function isProfileImportBaselineEmpty(profile: UserProfile): boolean {
  for (const k of STRING_KEYS) {
    if (str(profile[k]).trim()) return false;
  }
  for (const k of ARRAY_KEYS) {
    const items = profile[k];
    if (!Array.isArray(items) || cleanItemList(items).length > 0) return false;
  }
  return true;
}

/**
 * Fields where both the current profile and extraction have different non-empty values.
 * Used to decide whether to show a comparison UI.
 */
export function getProfileImportConflicts(base: UserProfile, extracted: UserProfile): ProfileImportConflict[] {
  const out: ProfileImportConflict[] = [];

  for (const k of STRING_KEYS) {
    const b = str(base[k]).trim();
    const x = str(extracted[k]).trim();
    if (!b || !x || b === x) continue;
    out.push({
      id: k,
      label: FIELD_LABELS[k] ?? k,
      before: b.length > 280 ? `${b.slice(0, 280)}…` : b,
      after: x.length > 280 ? `${x.slice(0, 280)}…` : x,
    });
  }

  for (const k of ARRAY_KEYS) {
    const b = base[k];
    const x = extracted[k];
    if (!Array.isArray(b) || !Array.isArray(x)) continue;
    if (!listsMeaningfullyDiffer(b, x)) continue;
    const bl = cleanItemList(b);
    const xl = cleanItemList(x);
    if (bl.length === 0 || xl.length === 0) continue;
    out.push({
      id: k,
      label: FIELD_LABELS[k] ?? k,
      before: arrLines(b),
      after: arrLines(x),
    });
  }

  return out;
}
