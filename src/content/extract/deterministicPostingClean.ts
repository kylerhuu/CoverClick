import { normalizeDescriptionWhitespace } from "./sanitizeDescription";

const NOISE_LINE = new RegExp(
  [
    "^(skip to|jump to|back to search|show more|see more|view all|load more)",
    "|^(people also viewed|similar jobs|recommended for you|jobs you may like)",
    "|^(was this helpful|create alert|set job alert|get job alerts)",
    "|^(cookie|cookies|privacy policy|terms of (use|service)|do not sell)",
    "|^(sign in|log in|register|join now|follow us|share on)",
    "|^(apply|applied|save|saved|easy apply|be an early applicant)",
    "|^(company overview|about (us|the company)|meet the team)",
    "|^(search jobs|filter|sort by|clear filters|remote|hybrid|on-site)",
    "|^#{1,6}\\s", // markdown-ish headings that are UI chrome
    "|^\\d+\\s*(min|sec|hours?)\\s*(read|ago)\\b",
  ].join(""),
  "i",
);

const TAGGY = /^[#\s•·▪▸►-]{0,4}(remote|hybrid|full-?time|part-?time|contract|intern|new|urgent)\s*$/i;

/** Collapse repeated identical lines (common when cards duplicate). */
function dedupeConsecutiveLines(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let prevNorm = "";
  for (const line of lines) {
    const n = line.trim().toLowerCase();
    if (n && n === prevNorm) continue;
    out.push(line);
    prevNorm = n;
  }
  return out.join("\n");
}

/** Remove short “chip” lines and obvious navigation chrome. */
function stripNoiseLines(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      out.push("");
      continue;
    }
    if (t.length <= 48 && (NOISE_LINE.test(t) || TAGGY.test(t))) continue;
    if (t.length <= 2 && !/\w/.test(t)) continue;
    out.push(line);
  }
  return normalizeDescriptionWhitespace(out.join("\n"));
}

/**
 * Second-pass deterministic cleanup after board merge + stripBoilerplateLines.
 * No network; safe to run on every scrape.
 */
export function deterministicCleanPostingText(text: string): string {
  let t = text.replace(/\r\n/g, "\n").trim();
  if (!t) return "";
  t = dedupeConsecutiveLines(t);
  t = stripNoiseLines(t);
  return normalizeDescriptionWhitespace(t);
}
