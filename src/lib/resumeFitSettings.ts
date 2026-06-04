import type { ResumeTargetLength } from "./resumePageMetrics";

export type ResumeFitMode = "preserve" | "smart" | "force";

export type ResumeStudioLayoutSettings = {
  fitMode: ResumeFitMode;
  targetLength: ResumeTargetLength;
};

export const DEFAULT_RESUME_LAYOUT_SETTINGS: ResumeStudioLayoutSettings = {
  fitMode: "preserve",
  targetLength: 1,
};

export function normalizeFitMode(raw: unknown): ResumeFitMode {
  if (raw === "smart" || raw === "force") return raw;
  return "preserve";
}

export function normalizeTargetLength(raw: unknown): ResumeTargetLength {
  if (raw === 1.5 || raw === 2) return raw;
  return 1;
}
