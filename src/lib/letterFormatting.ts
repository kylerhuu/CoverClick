/**
 * Normalizes line endings and trims trailing whitespace while keeping intentional structure.
 */
export function normalizeLetterText(raw: string): string {
  let t = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.replace(/\s+$/u, "");
}

/**
 * Splits letter text into DOCX blocks: each block is one or more visual lines in the same paragraph,
 * separated by `\n\n` in the editor (paragraph break).
 */
export function letterParagraphBlocks(text: string): string[] {
  const t = normalizeLetterText(text);
  if (!t) return [];
  return t.split(/\n{2,}/u).map((b) => b.replace(/\n+$/u, "").trimEnd());
}
