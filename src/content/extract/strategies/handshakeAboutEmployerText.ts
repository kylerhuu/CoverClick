function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

const SECTION_STOP_RE =
  /^(who\s+is\b|similar\s+jobs|connect\s+with\s+alumni|what\s+they(?:'|’)re\s+looking|upcoming\s+events|ask\s+the\s+hiring)/i;
const JUNK_LINE_RE =
  /^(learn\s+more|follow|company\s+overview|company\s+size|industry|location|company\s+culture|tip:)/i;

/** Variants: full line, segment before " - ", and brand without trailing CPG (e.g. iHerbCPG → iHerb). */
export function employerNameVariants(line: string): { raw: string; origin: string }[] {
  const trimmed = collapseWhitespace(line);
  if (!trimmed) return [];

  const out: { raw: string; origin: string }[] = [{ raw: trimmed, origin: "handshake:about-employer" }];
  const primary = trimmed.split(/\s+[-–—]\s+/)[0]?.trim();
  if (primary && primary.toLowerCase() !== trimmed.toLowerCase()) {
    out.push({ raw: primary, origin: "handshake:about-employer-primary" });
  }
  const base = primary ?? trimmed;
  const cpg = base.match(/^(.+?)CPG$/i);
  if (cpg?.[1]) {
    const brand = collapseWhitespace(cpg[1]);
    if (brand.length >= 2 && brand.toLowerCase() !== base.toLowerCase()) {
      out.push({ raw: brand, origin: "handshake:about-employer-brand" });
    }
  }
  return out;
}

function lineLooksLikeEmployerName(line: string): boolean {
  if (!line || line.length < 2 || line.length > 120) return false;
  if (SECTION_STOP_RE.test(line)) return false;
  if (JUNK_LINE_RE.test(line)) return false;
  if (/^https?:\/\//i.test(line)) return false;
  return true;
}

/** Parse employer lines from posting text (job description often includes this section). */
export function employerLinesFromAboutSectionText(text: string): string[] {
  const idx = text.search(/about\s+the\s+employer/i);
  if (idx < 0) return [];

  let chunk = text.slice(idx);
  const stopMatch = chunk.search(
    /\n\s*(similar\s+jobs|connect\s+with\s+alumni|what\s+they(?:'|’)re\s+looking|upcoming\s+events|ask\s+the\s+hiring)/i,
  );
  if (stopMatch > 0) chunk = chunk.slice(0, stopMatch);

  const lines = chunk
    .split(/\n+/)
    .map((l) => collapseWhitespace(l))
    .filter(Boolean);

  const out: string[] = [];
  let passedHeading = false;
  for (const line of lines) {
    if (!passedHeading) {
      if (/about\s+the\s+employer/i.test(line)) passedHeading = true;
      continue;
    }
    if (SECTION_STOP_RE.test(line)) break;
    if (!lineLooksLikeEmployerName(line)) continue;
    out.push(line);
    if (out.length >= 4) break;
  }
  return out;
}
