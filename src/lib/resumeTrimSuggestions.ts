import type { ResumeSectionKey, StructuredResume } from "./types";
import {
  applyTrimById,
  cloneRenderPlanDeep,
  estimatePageUse,
  experienceEntryKey,
  isEntryLocked,
  mergeRenderPlans,
  projectEntryKey,
  projectLabel,
  experienceLabel,
  shortenSummaryText,
  spacingTokensForMode,
  type ResumeRenderPlan,
} from "./resumeLayoutEngine";
import { pagesUsedFromHeight } from "./resumePageMetrics";

export type TrimSuggestion = {
  id: string;
  label: string;
  /** Estimated page reduction if applied (e.g. 0.08 pages). */
  savingsPages: number;
  alreadyApplied: boolean;
};

function planPagesUsed(
  resume: StructuredResume,
  plan: ResumeRenderPlan,
  sectionKeys: ResumeSectionKey[],
): number {
  const spacing = spacingTokensForMode(plan.layoutMode);
  const units = estimatePageUse(resume, plan, spacing, sectionKeys);
  return units / 100;
}

function savingsFromPatch(
  resume: StructuredResume,
  basePlan: ResumeRenderPlan,
  sectionKeys: ResumeSectionKey[],
  patch: Partial<ResumeRenderPlan> & { apply?: (p: ResumeRenderPlan) => void },
): number {
  const before = planPagesUsed(resume, basePlan, sectionKeys);
  const trial = cloneRenderPlanDeep(basePlan);
  if (patch.apply) patch.apply(trial);
  else Object.assign(trial, { ...patch, bulletLimits: { ...trial.bulletLimits, ...patch.bulletLimits } });
  const after = planPagesUsed(resume, trial, sectionKeys);
  return Math.max(0, Math.round((before - after) * 100) / 100);
}

export function buildTrimSuggestions(
  resume: StructuredResume,
  sectionKeys: ResumeSectionKey[],
  autoPlan: ResumeRenderPlan,
  manualPlan: ResumeRenderPlan,
): TrimSuggestion[] {
  const merged = mergeRenderPlans(autoPlan, manualPlan);
  const suggestions: TrimSuggestion[] = [];

  const push = (s: Omit<TrimSuggestion, "alreadyApplied"> & { checkApplied: (p: ResumeRenderPlan) => boolean }) => {
    if (s.savingsPages < 0.01) return;
    suggestions.push({ id: s.id, label: s.label, savingsPages: s.savingsPages, alreadyApplied: s.checkApplied(merged) });
  };

  if (sectionKeys.includes("summary") && resume.summary.trim() && !merged.hiddenSections.includes("summary")) {
    push({
      id: "hide-summary",
      label: "Hide Summary",
      savingsPages: savingsFromPatch(resume, merged, sectionKeys, {
        apply: (p) => {
          if (!p.hiddenSections.includes("summary")) p.hiddenSections.push("summary");
        },
      }),
      checkApplied: (p) => p.hiddenSections.includes("summary"),
    });
    if (!merged.shortenedSummary) {
      push({
        id: "shorten-summary",
        label: "Shorten Summary",
        savingsPages: savingsFromPatch(resume, merged, sectionKeys, {
          apply: (p) => {
            p.shortenedSummary = true;
            p.summaryText = shortenSummaryText(resume.summary);
          },
        }),
        checkApplied: (p) => p.shortenedSummary,
      });
    }
  }

  if (sectionKeys.includes("skills") && !merged.compactSkills) {
    push({
      id: "compact-skills",
      label: "Compress Skills",
      savingsPages: savingsFromPatch(resume, merged, sectionKeys, {
        apply: (p) => {
          p.compactSkills = true;
        },
      }),
      checkApplied: (p) => p.compactSkills,
    });
  }

  if (sectionKeys.includes("education") && !merged.compactEducation) {
    push({
      id: "compact-education",
      label: "Compress Education",
      savingsPages: savingsFromPatch(resume, merged, sectionKeys, {
        apply: (p) => {
          p.compactEducation = true;
        },
      }),
      checkApplied: (p) => p.compactEducation,
    });
  }

  resume.projects.forEach((p, i) => {
    const key = projectEntryKey(p, i);
    if (isEntryLocked(p.locked)) return;
    if (merged.hiddenSections.includes(key)) return;
    if (!p.name && !p.subtitle && !p.bullets.length) return;
    const name = projectLabel(p);
    const count = p.bullets.length;
    if (count === 0) return;

    const cap = merged.bulletLimits[key] ?? count;
    if (cap > 2 && count >= 2) {
      push({
        id: `limit-${key}-2`,
        label: `Limit ${name} to 2 bullets`,
        savingsPages: savingsFromPatch(resume, merged, sectionKeys, {
          apply: (plan) => {
            plan.bulletLimits[key] = 2;
          },
        }),
        checkApplied: (p) => (p.bulletLimits[key] ?? count) <= 2,
      });
    }
    if (cap > 1) {
      push({
        id: `limit-${key}-1`,
        label: `Limit ${name} to 1 bullet`,
        savingsPages: savingsFromPatch(resume, merged, sectionKeys, {
          apply: (plan) => {
            plan.bulletLimits[key] = 1;
          },
        }),
        checkApplied: (p) => (p.bulletLimits[key] ?? count) <= 1,
      });
    }

    push({
      id: `hide-${key}`,
      label: `Hide ${name} project`,
      savingsPages: savingsFromPatch(resume, merged, sectionKeys, {
        apply: (plan) => {
          if (!plan.hiddenSections.includes(key)) plan.hiddenSections.push(key);
        },
      }),
      checkApplied: (p) => p.hiddenSections.includes(key),
    });
  });

  resume.experience.forEach((e, i) => {
    if (isEntryLocked(e.locked)) return;
    const key = experienceEntryKey(e, i);
    const count = e.bullets.length;
    if (count === 0) return;
    const name = experienceLabel(e);
    const cap = merged.bulletLimits[key] ?? count;
    if (cap > 2 && count >= 2) {
      push({
        id: `limit-${key}-2`,
        label: `Limit ${name} to 2 bullets`,
        savingsPages: savingsFromPatch(resume, merged, sectionKeys, {
          apply: (plan) => {
            plan.bulletLimits[key] = 2;
          },
        }),
        checkApplied: (p) => (p.bulletLimits[key] ?? count) <= 2,
      });
    }
    if (cap > 1) {
      push({
        id: `limit-${key}-1`,
        label: `Limit ${name} to 1 bullet`,
        savingsPages: savingsFromPatch(resume, merged, sectionKeys, {
          apply: (plan) => {
            plan.bulletLimits[key] = 1;
          },
        }),
        checkApplied: (p) => (p.bulletLimits[key] ?? count) <= 1,
      });
    }
  });

  return suggestions
    .filter((s) => !s.alreadyApplied)
    .sort((a, b) => b.savingsPages - a.savingsPages)
    .slice(0, 12);
}

/** Apply a trim suggestion id to a manual trim plan (render-only). */
export function applyTrimSuggestion(
  resume: StructuredResume,
  manualPlan: ResumeRenderPlan,
  suggestionId: string,
): ResumeRenderPlan {
  const next = cloneRenderPlanDeep(manualPlan);
  applyTrimById(resume, next, suggestionId);
  return next;
}

export function applySelectedTrimSuggestions(
  resume: StructuredResume,
  manualPlan: ResumeRenderPlan,
  suggestionIds: string[],
): ResumeRenderPlan {
  const next = cloneRenderPlanDeep(manualPlan);
  for (const id of suggestionIds) applyTrimById(resume, next, id);
  return next;
}

export type TrimProjectionStep = {
  id: string;
  label: string;
  pagesAfter: number;
};

export type TrimProjection = {
  currentPages: number;
  steps: TrimProjectionStep[];
  projectedPages: number;
};

/** Project page count after applying selected trims (anchors to measured pages when provided). */
export function projectTrimImpact(
  resume: StructuredResume,
  sectionKeys: ResumeSectionKey[],
  basePlan: ResumeRenderPlan,
  suggestions: TrimSuggestion[],
  selectedIds: string[],
  anchorPagesUsed: number | null,
): TrimProjection {
  const unitBase = planPagesUsed(resume, basePlan, sectionKeys);
  const scale = anchorPagesUsed != null && unitBase > 0 ? anchorPagesUsed / unitBase : 1;
  const currentPages = Math.round(unitBase * scale * 100) / 100;

  const ordered = suggestions
    .filter((s) => selectedIds.includes(s.id))
    .sort((a, b) => b.savingsPages - a.savingsPages);

  const plan = cloneRenderPlanDeep(basePlan);
  const steps: TrimProjectionStep[] = [];
  for (const s of ordered) {
    applyTrimById(resume, plan, s.id);
    const pagesAfter = Math.round(planPagesUsed(resume, plan, sectionKeys) * scale * 100) / 100;
    steps.push({ id: s.id, label: s.label, pagesAfter });
  }

  const projectedPages = steps.length ? steps[steps.length - 1].pagesAfter : currentPages;
  return { currentPages, steps, projectedPages };
}

/** DOM height → pages (for live preview). */
export function pagesUsedFromContentHeight(contentHeightPx: number): number {
  return pagesUsedFromHeight(contentHeightPx);
}
