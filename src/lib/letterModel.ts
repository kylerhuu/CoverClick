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
