import type { JobContext, UserProfile } from "./types";

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function sanitizeFilenamePart(value: string, fallback: string): string {
  const trimmed = value.trim().replace(INVALID_FILENAME_CHARS, "").replace(/\s+/g, "_");
  return trimmed.length > 0 ? trimmed.slice(0, 80) : fallback;
}

/** Basename only (no extension). Used for PDF/DOCX when the user edits the export name. */
export function sanitizeExportBasename(raw: string, fallback: string): string {
  let s = raw
    .trim()
    .replace(INVALID_FILENAME_CHARS, "")
    .replace(/\s+/g, "_")
    .replace(/\.(pdf|docx)$/i, "");
  s = s.replace(/_+/g, "_").replace(/^_|_$/g, "");
  if (s.length > 120) s = s.slice(0, 120);
  return s.length > 0 ? s : fallback;
}

export function buildDefaultExportBasename(profile: UserProfile, job: JobContext | null): string {
  const name = sanitizeFilenamePart(profile.fullName, "Applicant");
  const role = sanitizeFilenamePart(job?.jobTitle ?? "", "Role");
  const co = sanitizeFilenamePart(job?.companyName ?? "", "Company");
  return `${name}_${role}_${co}_CoverLetter`;
}

export function truncate(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

export function formatListPreview(items: string[], maxItems: number): string {
  const cleaned = items.map((s) => s.trim()).filter(Boolean);
  if (cleaned.length === 0) return "—";
  const shown = cleaned.slice(0, maxItems).join(" · ");
  if (cleaned.length > maxItems) return `${shown} +${cleaned.length - maxItems}`;
  return shown;
}
