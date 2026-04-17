const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function sanitizeFilenamePart(value: string, fallback: string): string {
  const trimmed = value.trim().replace(INVALID_FILENAME_CHARS, "").replace(/\s+/g, "_");
  return trimmed.length > 0 ? trimmed.slice(0, 80) : fallback;
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
