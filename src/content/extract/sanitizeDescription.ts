/** Collapses whitespace but keeps single newlines for readability. */
export function normalizeDescriptionWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const JUNK_LINE = new RegExp(
  [
    "^(apply( now)?|save|saved|share|copy link|report|similar jobs|see more jobs|",
    "recommended for you|jobs for you|people also viewed|was this helpful|",
    "create job alert|set alert|follow|message|connect|easy apply|",
    "company overview|about the company|show more|see all)\\b",
  ].join(""),
  "i",
);

export function stripBoilerplateLines(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      out.push("");
      continue;
    }
    if (t.length < 80 && JUNK_LINE.test(t)) continue;
    if (/^[\d,]+\s*(applicants|views|followers)/i.test(t)) continue;
    out.push(line);
  }
  return normalizeDescriptionWhitespace(out.join("\n"));
}
