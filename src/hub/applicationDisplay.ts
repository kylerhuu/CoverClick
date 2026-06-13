import type { JobApplication, JobApplicationStatus } from "../lib/types";
import { jobApplicationStatusLabel } from "../lib/types";
import { formatRelativeDate } from "../lib/jobSource";

/** Sort priority: READY_TO_APPLY → PREPARING → APPLIED → ARCHIVED (and related statuses). */
const STATUS_SORT_PRIORITY: Record<JobApplicationStatus, number> = {
  READY_TO_APPLY: 0,
  PREPARING: 1,
  SAVED: 2,
  APPLIED: 3,
  INTERVIEWING: 4,
  OFFER: 5,
  ARCHIVED: 6,
  REJECTED: 7,
};

export function sortApplicationsByStatusPriority(apps: JobApplication[]): JobApplication[] {
  return [...apps].sort((a, b) => {
    const pa = STATUS_SORT_PRIORITY[a.status] ?? 99;
    const pb = STATUS_SORT_PRIORITY[b.status] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.dateSaved).getTime() - new Date(a.dateSaved).getTime();
  });
}

export function hubSummaryCounts(apps: JobApplication[]): { saved: number; ready: number; preparing: number } {
  return {
    saved: apps.filter((a) => a.status === "SAVED").length,
    ready: apps.filter((a) => a.status === "READY_TO_APPLY").length,
    preparing: apps.filter((a) => a.status === "PREPARING").length,
  };
}

export function resumeVariantChipLabel(app: JobApplication): string | null {
  const name = app.resumeVariantName?.trim();
  if (!name) return null;
  return `Resume: ${name}`;
}

export function resumeVariantChipClass(): string {
  return "bg-violet-50/80 text-violet-700 ring-violet-200/55";
}

export function coverLetterStatus(app: JobApplication): string {
  if (app.coverLetterDraft) return "Draft ready";
  if (app.status === "PREPARING") return "Generating…";
  return "None";
}

export function fitScoreLabel(app: JobApplication): string | null {
  if (app.fitScore != null) return `${app.fitScore}%`;
  return null;
}

export type FitScoreTone = "strong" | "moderate" | "muted";

export function fitScoreTone(app: JobApplication): FitScoreTone {
  if (app.fitScore == null) return "muted";
  if (app.fitScore >= 75) return "strong";
  if (app.fitScore >= 50) return "moderate";
  return "muted";
}

export function statusBadgeLabel(app: JobApplication): string {
  return jobApplicationStatusLabel(app.status);
}

export function statusPillClass(status: JobApplicationStatus): string {
  switch (status) {
    case "PREPARING":
    case "SAVED":
      return "bg-amber-50 text-amber-800 ring-amber-200/80";
    case "READY_TO_APPLY":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200/80";
    case "APPLIED":
      return "bg-sky-50 text-sky-800 ring-sky-200/80";
    case "INTERVIEWING":
      return "bg-violet-50 text-violet-800 ring-violet-200/80";
    case "OFFER":
      return "bg-indigo-50 text-indigo-800 ring-indigo-200/80";
    case "REJECTED":
      return "bg-rose-50 text-rose-800 ring-rose-200/80";
    case "ARCHIVED":
      return "bg-slate-100 text-slate-600 ring-slate-200/80";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200/80";
  }
}

export function fitScoreChipClass(tone: FitScoreTone): string {
  switch (tone) {
    case "strong":
      return "bg-emerald-50/80 text-emerald-700 ring-emerald-200/60";
    case "moderate":
      return "bg-amber-50/80 text-amber-700 ring-amber-200/60";
    case "muted":
      return "bg-slate-50 text-slate-500 ring-slate-200/50";
  }
}

export function letterChipClass(app: JobApplication): string {
  if (app.coverLetterDraft) return "bg-emerald-50/70 text-emerald-700 ring-emerald-200/50";
  if (app.status === "PREPARING") return "bg-indigo-50/70 text-indigo-600 ring-indigo-200/50";
  return "bg-slate-50 text-slate-500 ring-slate-200/50";
}

/** Banner tone for Current Job tab saved-state indicator. */
export function currentJobSavedBannerClass(app: JobApplication | null): string {
  if (!app) return "";
  switch (app.status) {
    case "PREPARING":
    case "SAVED":
      return "border-amber-200/90 bg-amber-50 text-amber-950";
    case "READY_TO_APPLY":
      return "border-emerald-200/90 bg-emerald-50 text-emerald-950";
    case "APPLIED":
    case "INTERVIEWING":
    case "OFFER":
      return "border-sky-200/90 bg-sky-50 text-sky-950";
    default:
      return "border-slate-200/90 bg-slate-50 text-slate-700";
  }
}

export function currentJobSavedBannerMessage(app: JobApplication, preparingInBackground: boolean): string {
  if (preparingInBackground || app.status === "PREPARING") {
    return "Preparing in background — keep browsing other jobs.";
  }
  if (app.status === "READY_TO_APPLY") {
    return "Ready to apply — open Application Hub to view materials.";
  }
  if (app.status === "APPLIED") {
    return "Applied — track progress in Application Hub.";
  }
  return "Already saved. Re-save to refresh materials, or open Application Hub.";
}

/** Quiet inline saved-state copy for the Current Job decision screen. */
export function currentJobSavedInlineMessage(app: JobApplication, preparingInBackground: boolean): string {
  if (preparingInBackground || app.status === "PREPARING") {
    return "Saved · preparing materials in background";
  }
  if (app.status === "READY_TO_APPLY") {
    return "Saved · ready in Application Hub";
  }
  if (app.status === "APPLIED") {
    return "Saved · applied";
  }
  return "Saved to Application Hub";
}

/** Colored status label for dense hub list rows (text only, no pill). */
export function statusListTextClass(status: JobApplicationStatus): string {
  switch (status) {
    case "PREPARING":
    case "SAVED":
      return "text-amber-700";
    case "READY_TO_APPLY":
      return "text-emerald-700";
    case "APPLIED":
    case "INTERVIEWING":
    case "OFFER":
      return "text-sky-700";
    case "REJECTED":
      return "text-rose-700";
    default:
      return "text-slate-500";
  }
}

/** Uppercase status label for hub list cards. */
export function hubListStatusLabel(app: JobApplication): string {
  switch (app.status) {
    case "READY_TO_APPLY":
      return "Ready to apply";
    case "PREPARING":
      return "Preparing materials…";
    case "SAVED":
      return "Saved";
    case "APPLIED":
      return "Applied";
    case "INTERVIEWING":
      return "Interviewing";
    case "OFFER":
      return "Offer";
    case "REJECTED":
      return "Rejected";
    case "ARCHIVED":
      return "Archived";
    default:
      return jobApplicationStatusLabel(app.status);
  }
}

/** Single active progress line for preparing hub list cards. */
export function hubListProgressLine(app: JobApplication): string | null {
  if (app.status !== "PREPARING") return null;
  const steps = app.preparationSteps ?? {
    jobSaved: false,
    fitAnalyzed: false,
    coverLetterDrafted: false,
    resumeSuggestionsGenerated: false,
  };
  const order: { key: keyof typeof steps; label: string }[] = [
    { key: "jobSaved", label: "Saving job" },
    { key: "fitAnalyzed", label: "Calculating fit score" },
    { key: "coverLetterDrafted", label: "Generating cover letter" },
    { key: "resumeSuggestionsGenerated", label: "Tailoring resume" },
  ];
  for (let i = 0; i < order.length; i++) {
    const { key, label } = order[i];
    const done = steps[key];
    const prevDone = i === 0 || steps[order[i - 1].key];
    if (!done && prevDone) return label;
  }
  return "Generating application assets";
}

/** Optional relative time for ready hub list cards. */
export function hubListRelativeTime(app: JobApplication): string | null {
  if (app.status !== "READY_TO_APPLY") return null;
  const relative = formatRelativeDate(app.dateSaved);
  return relative ? `Saved ${relative.toLowerCase()}` : null;
}

/** Fit score match label for rings and hero. */
export function fitScoreMatchLabel(score: number): string {
  if (score >= 75) return "Strong Match";
  if (score >= 50) return "Good Match";
  return "Match";
}

/** Hub list metadata — Match first, then resume. */
export function hubListMetadataLine(app: JobApplication): string {
  if (app.status === "PREPARING" || app.status === "SAVED") return "";
  const parts: string[] = [];
  if (app.fitScore != null) parts.push(`${app.fitScore}% Match`);
  const resume = app.resumeVariantName?.trim();
  if (resume) parts.push(resume);
  return parts.join(" · ");
}

/** Status chip label for hub row (uppercase styling applied in UI). */
export function hubListStatusChipLabel(app: JobApplication): string | null {
  switch (app.status) {
    case "READY_TO_APPLY":
      return "Ready to apply";
    case "PREPARING":
    case "SAVED":
      return "Preparing";
    case "APPLIED":
      return "Applied";
    case "INTERVIEWING":
      return "Interviewing";
    case "OFFER":
      return "Offer";
    default:
      return null;
  }
}

export type PreparedAssetItem = {
  id: string;
  iconLabel: string;
  title: string;
  subtitle: string;
};

/** Prepared asset cards for detail mission control. */
export function getPreparedAssetItems(app: JobApplication): PreparedAssetItem[] {
  const items: PreparedAssetItem[] = [];
  if (app.coverLetterDraft) {
    items.push({
      id: "materials",
      iconLabel: "CL",
      title: "Cover Letter",
      subtitle: "Tailored to this role",
    });
  }
  const resume = app.resumeVariantName?.trim();
  if (resume || app.resumeVariantId) {
    items.push({
      id: "resume",
      iconLabel: "CV",
      title: "Resume",
      subtitle: resume || "Variant selected",
    });
  }
  if (app.fitScore != null) {
    const qualifier = fitScoreMatchLabel(app.fitScore);
    items.push({
      id: "fit",
      iconLabel: "FT",
      title: "Fit Score",
      subtitle: `${app.fitScore}% Match · ${qualifier}`,
    });
  }
  return items;
}

/** Hub card status line (sentence case, not pill). */
export function hubListStatusLine(app: JobApplication): string {
  switch (app.status) {
    case "READY_TO_APPLY":
      return "Ready to apply";
    case "PREPARING":
      return "Preparing";
    case "SAVED":
      return "Saved";
    case "APPLIED":
      return "Applied";
    case "INTERVIEWING":
      return "Interviewing";
    case "OFFER":
      return "Offer";
    default:
      return hubListStatusLabel(app);
  }
}

/** Detail hero — fit match line. */
export function detailHeroFitLine(app: JobApplication): string | null {
  if (app.fitScore == null) return null;
  return `${app.fitScore}% Match`;
}

/** Detail hero — resume line. */
export function detailHeroResumeLine(app: JobApplication): string | null {
  const name = app.resumeVariantName?.trim();
  if (!name) return app.resumeVariantId ? "Resume selected" : null;
  return `Resume: ${name}`;
}

export type DetailReadinessLine = {
  label: string;
};

/** @deprecated Use getPreparedAssetItems for detail briefing. */
export function detailReadinessLines(app: JobApplication): DetailReadinessLine[] {
  if (app.status !== "READY_TO_APPLY") return [];
  const lines: DetailReadinessLine[] = [];
  if (app.coverLetterDraft) {
    lines.push({ label: "Materials prepared" });
  }
  if (app.resumeVariantName?.trim() || app.resumeVariantId) {
    lines.push({ label: "Resume selected" });
  }
  if (app.fitScore != null) {
    lines.push({ label: "Fit score generated" });
  }
  if (lines.length === 0) {
    lines.push({ label: "Materials prepared" });
  }
  return lines;
}

/** Hero status label for detail view. */
export function detailHeroStatusLabel(app: JobApplication): string {
  switch (app.status) {
    case "READY_TO_APPLY":
      return "Ready to apply";
    case "PREPARING":
      return "Preparing";
    case "APPLIED":
      return "Applied";
    case "INTERVIEWING":
      return "Interviewing";
    case "OFFER":
      return "Offer";
    case "REJECTED":
      return "Rejected";
    case "ARCHIVED":
      return "Archived";
    case "SAVED":
      return "Saved";
    default:
      return jobApplicationStatusLabel(app.status);
  }
}

export function detailHeroStatusClass(status: JobApplicationStatus): string {
  switch (status) {
    case "READY_TO_APPLY":
      return "text-emerald-700";
    case "PREPARING":
    case "SAVED":
      return "text-amber-800";
    case "APPLIED":
    case "INTERVIEWING":
    case "OFFER":
      return "text-sky-700";
    case "REJECTED":
      return "text-rose-700";
    default:
      return "text-slate-500";
  }
}

/** Short section title for grouped hub inbox lists. */
export function hubSectionTitle(status: JobApplicationStatus): string {
  switch (status) {
    case "READY_TO_APPLY":
      return "Ready to apply";
    case "PREPARING":
      return "Preparing";
    case "SAVED":
      return "Saved";
    case "APPLIED":
      return "Applied";
    case "INTERVIEWING":
      return "Interviewing";
    case "OFFER":
      return "Offer";
    case "REJECTED":
      return "Rejected";
    case "ARCHIVED":
      return "Archived";
    default:
      return jobApplicationStatusLabel(status);
  }
}

export function hubSectionDotClass(status: JobApplicationStatus): string {
  switch (status) {
    case "READY_TO_APPLY":
      return "bg-[#34D399]";
    case "PREPARING":
    case "SAVED":
      return "bg-amber-400";
    case "APPLIED":
    case "INTERVIEWING":
    case "OFFER":
      return "bg-sky-500";
    case "REJECTED":
      return "bg-rose-400";
    default:
      return "bg-slate-300";
  }
}

export type HubListSection = {
  status: JobApplicationStatus;
  applications: JobApplication[];
};

/** Group applications into inbox sections preserving status priority order. */
export function groupApplicationsForHubList(apps: JobApplication[]): HubListSection[] {
  const sorted = sortApplicationsByStatusPriority(apps);
  const sections: HubListSection[] = [];
  for (const app of sorted) {
    const last = sections[sections.length - 1];
    if (!last || last.status !== app.status) {
      sections.push({ status: app.status, applications: [app] });
    } else {
      last.applications.push(app);
    }
  }
  return sections;
}
