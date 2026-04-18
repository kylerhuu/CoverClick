import type { JobContext, UserProfile } from "./contract.js";

export function defaultDateLine(): string {
  return new Date().toLocaleDateString("en-US", {
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
