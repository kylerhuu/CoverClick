import type { JobApplication } from "../lib/types";
import { jobApplicationStatusLabel } from "../lib/types";

export function coverLetterStatus(app: JobApplication): string {
  if (app.coverLetterDraft) return "Draft ready";
  if (app.status === "PREPARING") return "Generating…";
  return "None";
}

export function fitScoreLabel(app: JobApplication): string {
  if (app.fitScore != null) return `${app.fitScore}%`;
  if (app.preparationError) return "—";
  return "—";
}

export function statusBadgeLabel(app: JobApplication): string {
  return jobApplicationStatusLabel(app.status);
}
