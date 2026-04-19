import type { JobContext, StructuredCoverLetter, UserProfile } from "./types";

export const EMPTY_STRUCTURED_LETTER: StructuredCoverLetter = {
  senderBlock: "",
  dateLine: "",
  recipientBlock: "",
  greeting: "",
  bodyParagraphs: ["", "", ""],
  closing: "",
  signature: "",
};

export function defaultDateLine(): string {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildSenderBlockFromProfile(p: UserProfile): string {
  const lines: string[] = [];
  const name = p.fullName.trim();
  if (name) lines.push(name);
  const contact = [p.email.trim(), p.phone.trim()].filter(Boolean).join(" · ");
  if (contact) lines.push(contact);
  if (p.location.trim()) lines.push(p.location.trim());
  if (p.linkedin.trim()) lines.push(p.linkedin.trim());
  if (p.portfolio.trim()) lines.push(p.portfolio.trim());
  return lines.join("\n");
}

export function buildRecipientBlock(job: JobContext): string {
  const company = job.companyName.trim() || "Hiring Team";
  const role = job.jobTitle.trim();
  if (role) return `${company}\nRe: ${role}`;
  return `${company}\nRe: Open role`;
}

const CANON_BLOCK_SEP = "\n\n";

/**
 * Canonical 9-block plain representation for the continuous editor (double-newline delimited).
 * Order: sender, date, recipient, greeting, body×3, closing, signature.
 */
export function canonicalPlainFromStructured(letter: StructuredCoverLetter): string {
  const [a, b, c] = letter.bodyParagraphs;
  return [
    letter.senderBlock,
    letter.dateLine,
    letter.recipientBlock,
    letter.greeting,
    a,
    b,
    c,
    letter.closing,
    letter.signature,
  ].join(CANON_BLOCK_SEP);
}

/**
 * Parse canonical 9-block plain text back into a structured letter.
 * If a user inserts extra `\n\n` inside the body region, extra segments are merged into the third body paragraph.
 */
export function structuredFromCanonicalPlain(
  text: string,
  profile: UserProfile,
  job: JobContext,
): StructuredCoverLetter {
  const raw = text.replace(/\r\n/g, "\n");
  const parts = raw.split(/\n\n/);
  if (parts.length <= 9) {
    while (parts.length < 9) parts.push("");
    return {
      senderBlock: parts[0] ?? "",
      dateLine: (parts[1] ?? "").trim() ? (parts[1] as string) : defaultDateLine(),
      recipientBlock: (parts[2] ?? "").trim() ? (parts[2] as string) : buildRecipientBlock(job),
      greeting: parts[3] ?? "",
      bodyParagraphs: [
        parts[4] ?? "",
        parts[5] ?? "",
        (parts[6] ?? "").trim().length ? (parts[6] as string).trim() : " ",
      ],
      closing: (parts[7] ?? "").trim() ? (parts[7] as string) : "Sincerely,",
      signature: (parts[8] ?? "").trim()
        ? (parts[8] as string)
        : profile.signatureBlock.trim() || profile.fullName.trim(),
    };
  }

  const sender = parts[0] ?? "";
  const date = parts[1] ?? "";
  const recipient = parts[2] ?? "";
  const greeting = parts[3] ?? "";
  const closing = parts[parts.length - 2] ?? "Sincerely,";
  const signature = parts[parts.length - 1] ?? profile.fullName.trim();
  const mid = parts.slice(4, parts.length - 2);
  let b1 = "";
  let b2 = "";
  let b3 = " ";
  if (mid.length >= 3) {
    b1 = mid[0] ?? "";
    b2 = mid[1] ?? "";
    b3 = mid.slice(2).join(CANON_BLOCK_SEP) || " ";
  } else if (mid.length === 2) {
    b1 = mid[0] ?? "";
    b2 = mid[1] ?? "";
  } else if (mid.length === 1) {
    b1 = mid[0] ?? "";
  }

  return {
    senderBlock: sender,
    dateLine: date.trim() ? date : defaultDateLine(),
    recipientBlock: recipient.trim() ? recipient : buildRecipientBlock(job),
    greeting,
    bodyParagraphs: [b1, b2, b3.trim() ? b3 : " "],
    closing: closing.trim() ? closing : "Sincerely,",
    signature: signature.trim() ? signature : profile.signatureBlock.trim() || profile.fullName.trim(),
  };
}

export function structuredLetterToPlainText(letter: StructuredCoverLetter): string {
  const [a, b, c] = letter.bodyParagraphs;
  return [
    letter.senderBlock.trim(),
    "",
    letter.dateLine.trim(),
    "",
    letter.recipientBlock.trim(),
    "",
    letter.greeting.trim(),
    "",
    a.trim(),
    "",
    b.trim(),
    "",
    c.trim(),
    "",
    letter.closing.trim(),
    "",
    letter.signature.trim(),
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Split long plain text into three paragraphs by paragraph breaks, then by thirds. */
export function plainTextToStructuredLetter(
  text: string,
  profile: UserProfile,
  job: JobContext,
): StructuredCoverLetter {
  const t = text.replace(/\r\n/g, "\n").trim();
  if (!t) return emptyStructuredFromContext(profile, job);

  const paras = t.split(/\n{2,}/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (paras.length >= 6) {
    const sender = paras.slice(0, -5).join("\n");
    const [greeting, b1, b2, b3, closing, sig] = paras.slice(-6);
    return {
      senderBlock: sender || buildSenderBlockFromProfile(profile),
      dateLine: defaultDateLine(),
      recipientBlock: buildRecipientBlock(job),
      greeting,
      bodyParagraphs: [b1, b2, b3],
      closing,
      signature: sig,
    };
  }

  if (paras.length >= 4) {
    return {
      senderBlock: buildSenderBlockFromProfile(profile),
      dateLine: defaultDateLine(),
      recipientBlock: buildRecipientBlock(job),
      greeting: paras[0] ?? "Dear Hiring Manager,",
      bodyParagraphs: [paras[1] ?? "", paras[2] ?? "", paras[3] ?? ""],
      closing: paras.length > 4 ? (paras[paras.length - 2] ?? "Sincerely,") : "Sincerely,",
      signature: paras[paras.length - 1] ?? profile.fullName.trim(),
    };
  }

  const words = t.split(/\s+/).filter(Boolean);
  const third = Math.max(1, Math.ceil(words.length / 3));
  const b1 = words.slice(0, third).join(" ");
  const b2 = words.slice(third, third * 2).join(" ");
  const b3 = words.slice(third * 2).join(" ");
  return {
    senderBlock: buildSenderBlockFromProfile(profile),
    dateLine: defaultDateLine(),
    recipientBlock: buildRecipientBlock(job),
    greeting: "Dear Hiring Manager,",
    bodyParagraphs: [b1, b2, b3 || " "],
    closing: "Sincerely,",
    signature: profile.signatureBlock.trim() || profile.fullName.trim() || " ",
  };
}

export function emptyStructuredFromContext(profile: UserProfile, job: JobContext): StructuredCoverLetter {
  return {
    senderBlock: buildSenderBlockFromProfile(profile),
    dateLine: defaultDateLine(),
    recipientBlock: buildRecipientBlock(job),
    greeting: "",
    bodyParagraphs: ["", "", ""],
    closing: "Sincerely,",
    signature: profile.signatureBlock.trim() || profile.fullName.trim(),
  };
}

export function updateBodyParagraph(
  letter: StructuredCoverLetter,
  index: 0 | 1 | 2,
  value: string,
): StructuredCoverLetter {
  const next: [string, string, string] = [...letter.bodyParagraphs] as [string, string, string];
  next[index] = value;
  return { ...letter, bodyParagraphs: next };
}
