const JUNK = new RegExp(
  [
    "cookie|privacy policy|terms of (use|service)|sign in|log in|create account",
    "|recommended for you|similar jobs|people also viewed|jobs for you",
    "|skip to main|jump to content|was this helpful|©\\s*20\\d{2}",
  ].join(""),
  "i",
);

/**
 * Heuristic: scraped posting text looks polluted or like a broad body fallback — worth a cheap AI cleanup pass.
 */
export function shouldUseAiDescriptionClean(raw: string): boolean {
  const t = raw.replace(/\r\n/g, "\n").trim();
  if (t.length < 1) return false;
  if (t.length < 350) return true;

  const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 6) return t.length > 4000;

  const junkLines = lines.filter((l) => l.length < 120 && JUNK.test(l)).length;
  if (junkLines / lines.length >= 0.22) return true;

  const keys = lines.map((l) => l.toLowerCase());
  const uniq = new Set(keys);
  if (uniq.size / keys.length < 0.28 && lines.length > 40) return true;

  const head = t.slice(0, 2200);
  if ((head.match(/cookie|privacy policy|sign in to/gi) ?? []).length >= 4) return true;

  return false;
}
