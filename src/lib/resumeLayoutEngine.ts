import type { ResumeFitMode } from "./resumeFitSettings";
import { healthyPageBand, type ResumeDomFitContext } from "./resumePageMetrics";

export type { ResumeDomFitContext } from "./resumePageMetrics";

const BULLET_TRIM_ESTIMATE_THRESHOLD = 1.0001;
import type {
  ResumeEducationItem,
  ResumeEntryPriority,
  ResumeExperienceItem,
  ResumeProjectItem,
  ResumeSectionKey,
  StructuredResume,
} from "./types";

/** Conservative planning target (estimate units). */
export const PAGE_TARGET = 88;
export const PAGE_BUDGET = 100;
const ESTIMATE_SAFETY = 1.12;
const MAX_COMPUTE_TIGHTEN_STEPS = 48;
export const MAX_DOM_TIGHTEN_STEPS = 24;

export type ResumeLayoutMode = "comfortable" | "balanced" | "compact";

export type ResumeSpacingTokens = {
  profile: ResumeLayoutMode;
  sectionGap: number;
  sectionHeaderAfter: number;
  entryGap: number;
  subLineGap: number;
  bulletGap: number;
  bulletLineHeight: number;
  contactGap: number;
};

export type ResumeRenderPlan = {
  hiddenSections: string[];
  bulletLimits: Record<string, number>;
  compactSkills: boolean;
  compactEducation: boolean;
  shortenedSummary: boolean;
  summaryText?: string;
  omittedNotes: string[];
  layoutMode: ResumeLayoutMode;
};

export type OnePageLayoutResult = {
  layoutMode: ResumeLayoutMode;
  estimatedPageUse: number;
  overflowRisk: "low" | "medium" | "high";
  renderPlan: ResumeRenderPlan;
};

const PRIORITY_RANK: Record<ResumeEntryPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function normalizeEntryPriority(p?: ResumeEntryPriority): ResumeEntryPriority {
  return p === "medium" || p === "low" ? p : "high";
}

export function experienceEntryKey(item: ResumeExperienceItem, index: number): string {
  return `experience:${item.id?.trim() || `exp-${index}`}`;
}

export function projectEntryKey(item: ResumeProjectItem, index: number): string {
  return `project:${item.id?.trim() || `proj-${index}`}`;
}

export function entryImportanceSortKey(priority: ResumeEntryPriority, index: number): number {
  return PRIORITY_RANK[priority] * 1000 + index;
}

/** Higher sort value = hide / compress first. Locked entries sort last. */
export function entryCompressionSortKey(
  priority: ResumeEntryPriority,
  index: number,
  locked = false,
): number {
  if (locked) return -10_000 - index;
  return PRIORITY_RANK[priority] * 1000 + index;
}

export function isEntryLocked(locked?: boolean): boolean {
  return locked === true;
}

/** Rank bullets for render-time selection (higher = keep). */
export function scoreBulletStrength(text: string): number {
  const t = text.trim();
  if (!t) return -100;
  let score = 0;
  if (/\d|%|\$|\bk\b|\bm\b|\bx\b/i.test(t)) score += 40;
  if (/\b(increased|reduced|grew|saved|revenue|users|customers|conversion|impact|roi|paying|profit|sales)\b/i.test(t)) {
    score += 28;
  }
  if (/\b(built|implemented|architected|scaled|deployed|kubernetes|aws|api|system|ml|ai|pipeline|platform)\b/i.test(t)) {
    score += 16;
  }
  if (/\b(responsible for|helped|assisted|supported|worked on|participated)\b/i.test(t)) score -= 12;
  return score + Math.min(t.length / 24, 4);
}

export function selectStrongestBullets(bullets: string[], max: number): string[] {
  if (max < 1 || bullets.length <= max) return bullets;
  return [...bullets]
    .map((b, index) => ({ b, index, score: scoreBulletStrength(b) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, max)
    .sort((a, b) => a.index - b.index)
    .map((x) => x.b);
}

export function spacingTokensForMode(mode: ResumeLayoutMode): ResumeSpacingTokens {
  if (mode === "comfortable") {
    return {
      profile: "comfortable",
      sectionGap: 18,
      sectionHeaderAfter: 7,
      entryGap: 11,
      subLineGap: 5,
      bulletGap: 3,
      bulletLineHeight: 1.38,
      contactGap: 16,
    };
  }
  if (mode === "compact") {
    return {
      profile: "compact",
      sectionGap: 11,
      sectionHeaderAfter: 4,
      entryGap: 6,
      subLineGap: 2,
      bulletGap: 1,
      bulletLineHeight: 1.26,
      contactGap: 9,
    };
  }
  return {
    profile: "balanced",
    sectionGap: 14,
    sectionHeaderAfter: 6,
    entryGap: 8,
    subLineGap: 3,
    bulletGap: 2,
    bulletLineHeight: 1.31,
    contactGap: 12,
  };
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function lineCountFromWords(words: number, wordsPerLine = 16): number {
  return Math.max(1, Math.ceil(words / wordsPerLine));
}

export function shortenSummaryText(summary: string, maxWords = 32): string {
  const trimmed = summary.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return trimmed;

  const sentences = trimmed.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  let out = "";
  for (const sentence of sentences) {
    const candidate = out ? `${out} ${sentence}` : sentence;
    if (wordCount(candidate) > maxWords) break;
    out = candidate;
  }
  if (out && wordCount(out) <= maxWords) return out;

  return `${words.slice(0, maxWords).join(" ")}…`;
}

function bulletCost(spacing: ResumeSpacingTokens): number {
  return 1.08 * spacing.bulletLineHeight;
}

function bulletUnits(text: string, spacing: ResumeSpacingTokens): number {
  const lines = Math.max(1, Math.ceil(text.length / 72));
  return lines * bulletCost(spacing);
}

function isSummaryHidden(plan: ResumeRenderPlan): boolean {
  return plan.hiddenSections.includes("summary");
}

function isProjectHidden(plan: ResumeRenderPlan, key: string): boolean {
  return plan.hiddenSections.includes(key);
}

function visibleSummaryText(resume: StructuredResume, plan: ResumeRenderPlan): string {
  if (isSummaryHidden(plan)) return "";
  if (plan.summaryText != null) return plan.summaryText;
  return resume.summary.trim();
}

function displayBullets(bullets: string[], key: string, plan: ResumeRenderPlan): string[] {
  const max = plan.bulletLimits[key];
  if (max == null) return bullets;
  return selectStrongestBullets(bullets, max);
}

function estimateContactUnits(resume: StructuredResume): number {
  const contact = [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.location,
    ...resume.contact.links,
    ...resume.links,
  ]
    .filter(Boolean)
    .join("  |  ");
  return 9 + Math.max(0, Math.ceil(contact.length / 72) - 1) * 1.4;
}

function estimateEducationEntry(
  e: ResumeEducationItem,
  plan: ResumeRenderPlan,
  spacing: ResumeSpacingTokens,
): number {
  let units = 2;
  if (e.school) units += 0.4;
  if (e.degree) units += 0.35;
  if (e.major && !plan.compactEducation) units += 0.35;
  if (e.concentrationOrMinor && !plan.compactEducation) units += 0.28;
  if (e.gpa) units += 0.28;
  const details = plan.compactEducation ? [] : e.details;
  for (const d of details) units += bulletUnits(d, spacing);
  return units;
}

function estimateSkillsUnits(resume: StructuredResume, plan: ResumeRenderPlan, spacing: ResumeSpacingTokens): number {
  const groups = resume.skills.filter((s) => s.category || s.items.length);
  if (!groups.length) return 0;

  const merged = groups
    .map((g) => (g.category ? `${g.category}: ${g.items.join(", ")}` : g.items.join(", ")))
    .filter(Boolean)
    .join("  |  ");

  if (plan.compactSkills) {
    return 2.4 + lineCountFromWords(wordCount(merged), 12) * 1.15 * spacing.bulletLineHeight;
  }

  return groups.reduce((sum, g) => {
    const line = `${g.category || "Skills"}: ${g.items.join(", ")}`;
    return sum + 1.3 + lineCountFromWords(wordCount(line), 12) * 1.12 * spacing.bulletLineHeight;
  }, 0);
}

function effectiveVisibleSections(
  resume: StructuredResume,
  plan: ResumeRenderPlan,
  visibleSectionKeys: ResumeSectionKey[],
): ResumeSectionKey[] {
  return visibleSectionKeys.filter((key) => {
    if (key === "summary") return !isSummaryHidden(plan) && !!visibleSummaryText(resume, plan);
    if (key === "projects") {
      return resume.projects.some((p, i) => {
        const pk = projectEntryKey(p, i);
        return !isProjectHidden(plan, pk) && (p.name || p.subtitle || p.techStack.length || p.bullets.length);
      });
    }
    if (key === "experience") {
      return resume.experience.some((e) => e.company || e.title || e.bullets.length);
    }
    if (key === "education") {
      return resume.education.some(
        (e) => e.school || e.degree || e.major || e.graduationDate || e.details.length || e.gpa,
      );
    }
    if (key === "skills") {
      return resume.skills.some((s) => s.category || s.items.length);
    }
    return true;
  });
}

export function estimatePageUse(
  resume: StructuredResume,
  plan: ResumeRenderPlan,
  spacing: ResumeSpacingTokens,
  visibleSectionKeys: ResumeSectionKey[],
): number {
  let units = estimateContactUnits(resume);
  const keys = effectiveVisibleSections(resume, plan, visibleSectionKeys);

  for (const key of keys) {
    units += 4.5 + spacing.sectionGap / 3.5;

    if (key === "summary") {
      const text = visibleSummaryText(resume, plan);
      units += 2.8 + lineCountFromWords(wordCount(text), 16) * 1.15 * spacing.bulletLineHeight;
      continue;
    }

    if (key === "experience") {
      resume.experience.forEach((e, i) => {
        if (!e.company && !e.title && !e.bullets.length) return;
        const ek = experienceEntryKey(e, i);
        units += 2.4;
        if (e.company || e.companySubtitle) units += 0.4;
        if (e.title || e.dates || e.location) units += 0.4;
        for (const b of displayBullets(e.bullets, ek, plan)) units += bulletUnits(b, spacing);
        units += spacing.entryGap / 12;
      });
      continue;
    }

    if (key === "projects") {
      resume.projects.forEach((p, i) => {
        const pk = projectEntryKey(p, i);
        if (isProjectHidden(plan, pk)) return;
        if (!p.name && !p.subtitle && !p.techStack.length && !p.bullets.length) return;
        units += 2.2;
        if (p.name || p.subtitle) units += 0.4;
        if (p.techStack.length) units += 0.4;
        for (const b of displayBullets(p.bullets, pk, plan)) units += bulletUnits(b, spacing);
        units += spacing.entryGap / 12;
      });
      continue;
    }

    if (key === "education") {
      for (const e of resume.education) {
        units += estimateEducationEntry(e, plan, spacing) + spacing.entryGap / 14;
      }
      continue;
    }

    if (key === "skills") {
      units += estimateSkillsUnits(resume, plan, spacing);
    }
  }

  return Math.round(units * ESTIMATE_SAFETY * 10) / 10;
}

function overflowRiskFromEstimate(use: number): OnePageLayoutResult["overflowRisk"] {
  if (use <= PAGE_TARGET - 4) return "low";
  if (use <= PAGE_TARGET + 6) return "medium";
  return "high";
}

function chooseInitialLayoutMode(resume: StructuredResume, visibleSectionKeys: ResumeSectionKey[]): ResumeLayoutMode {
  const entries =
    resume.experience.length + resume.projects.length + resume.education.length + resume.skills.length;
  const bullets =
    resume.experience.reduce((n, e) => n + e.bullets.length, 0) +
    resume.projects.reduce((n, p) => n + p.bullets.length, 0) +
    resume.education.reduce((n, e) => n + e.details.length, 0);
  const summaryWords = resume.summary ? wordCount(resume.summary) : 0;
  const load = visibleSectionKeys.length * 1.5 + entries * 1 + bullets * 0.5 + summaryWords / 50;
  if (load <= 10) return "comfortable";
  if (load >= 18 || visibleSectionKeys.length >= 4) return "compact";
  return "balanced";
}

type RankedEntry<T> = { item: T; index: number; key: string; priority: ResumeEntryPriority };

function rankExperience(resume: StructuredResume): RankedEntry<ResumeExperienceItem>[] {
  return resume.experience
    .map((item, index) => ({
      item,
      index,
      key: experienceEntryKey(item, index),
      priority: normalizeEntryPriority(item.priority),
    }))
    .filter(({ item }) => item.company || item.title || item.bullets.length > 0);
}

function rankProjects(resume: StructuredResume): RankedEntry<ResumeProjectItem>[] {
  return resume.projects
    .map((item, index) => ({
      item,
      index,
      key: projectEntryKey(item, index),
      priority: normalizeEntryPriority(item.priority),
    }))
    .filter(({ item }) => item.name || item.subtitle || item.techStack.length || item.bullets.length);
}

function sortedByCompressionFirst<T extends { priority: ResumeEntryPriority; index: number; item: { locked?: boolean } }>(
  entries: T[],
): T[] {
  return [...entries].sort(
    (a, b) =>
      entryCompressionSortKey(b.priority, b.index, isEntryLocked(b.item.locked)) -
      entryCompressionSortKey(a.priority, a.index, isEntryLocked(a.item.locked)),
  );
}

export function experienceLabel(item: ResumeExperienceItem): string {
  return item.company?.trim() || item.title?.trim() || "Experience entry";
}

export function projectLabel(item: ResumeProjectItem): string {
  return item.name?.trim() || item.subtitle?.trim() || "Project";
}

export function cloneRenderPlan(): ResumeRenderPlan {
  return {
    hiddenSections: [],
    bulletLimits: {},
    compactSkills: false,
    compactEducation: false,
    shortenedSummary: false,
    omittedNotes: [],
    layoutMode: "balanced",
  };
}

export function cloneRenderPlanDeep(plan: ResumeRenderPlan): ResumeRenderPlan {
  return {
    ...plan,
    hiddenSections: [...plan.hiddenSections],
    bulletLimits: { ...plan.bulletLimits },
    omittedNotes: [...plan.omittedNotes],
  };
}

const MODE_RANK: Record<ResumeLayoutMode, number> = { comfortable: 0, balanced: 1, compact: 2 };

export function mergeRenderPlans(base: ResumeRenderPlan, extra: ResumeRenderPlan): ResumeRenderPlan {
  const bulletLimits = { ...base.bulletLimits };
  for (const [k, v] of Object.entries(extra.bulletLimits)) {
    bulletLimits[k] = bulletLimits[k] == null ? v : Math.min(bulletLimits[k], v);
  }
  const hiddenSections = [...new Set([...base.hiddenSections, ...extra.hiddenSections])];
  const layoutMode =
    MODE_RANK[extra.layoutMode] > MODE_RANK[base.layoutMode] ? extra.layoutMode : base.layoutMode;
  return {
    hiddenSections,
    bulletLimits,
    compactSkills: base.compactSkills || extra.compactSkills,
    compactEducation: base.compactEducation || extra.compactEducation,
    shortenedSummary: base.shortenedSummary || extra.shortenedSummary,
    summaryText: extra.summaryText ?? base.summaryText,
    omittedNotes: [...new Set([...base.omittedNotes, ...extra.omittedNotes])],
    layoutMode,
  };
}

function pushNote(plan: ResumeRenderPlan, note: string): void {
  if (!plan.omittedNotes.includes(note)) plan.omittedNotes.push(note);
}

export function applyTrimById(resume: StructuredResume, plan: ResumeRenderPlan, id: string): void {
  if (id === "hide-summary") {
    if (!plan.hiddenSections.includes("summary")) plan.hiddenSections.push("summary");
    return;
  }
  if (id === "shorten-summary") {
    plan.shortenedSummary = true;
    plan.summaryText = shortenSummaryText(resume.summary);
    return;
  }
  if (id === "compact-skills") {
    plan.compactSkills = true;
    return;
  }
  if (id === "compact-education") {
    plan.compactEducation = true;
    return;
  }
  const limitMatch = id.match(/^limit-(.+)-(\d+)$/);
  if (limitMatch) {
    plan.bulletLimits[limitMatch[1]] = Number(limitMatch[2]);
    return;
  }
  if (id.startsWith("hide-")) {
    const key = id.slice("hide-".length);
    if (!plan.hiddenSections.includes(key)) plan.hiddenSections.push(key);
  }
}

function effectiveBulletCap(key: string, bulletCount: number, plan: ResumeRenderPlan): number {
  return plan.bulletLimits[key] ?? bulletCount;
}

/** One step down per entry; preserve 2 bullets unless single-bullet trim is allowed. */
function nextBulletCapForForce(effective: number, allowSingleBullet: boolean): number | null {
  if (effective > 3) return 3;
  if (effective > 2) return effective - 1;
  if (effective === 2 && allowSingleBullet) return 1;
  return null;
}

/** DOM is primary when available; otherwise estimate must be strictly over one page. */
export function canTrimBulletsForForce(
  estimatedUnits: number,
  dom?: ResumeDomFitContext,
): boolean {
  if (dom) return dom.overflows;
  return estimatedPagesFromUnits(estimatedUnits) > BULLET_TRIM_ESTIMATE_THRESHOLD;
}

/** Continue non-bullet tightening: DOM overflow wins over estimate. */
export function shouldTightenLayoutForForce(
  estimatedUnits: number,
  targetPages: number,
  dom?: ResumeDomFitContext,
  baselineUnits?: number,
): boolean {
  if (dom) return dom.overflows;
  return shouldContinueForceTightening(estimatedUnits, targetPages, baselineUnits);
}

/**
 * When DOM says the page fits, undo aggressive bullet caps (keep ≥2 bullets per entry).
 */
export function applyDomPrimaryTruthToPlan(
  resume: StructuredResume,
  plan: ResumeRenderPlan,
  dom: ResumeDomFitContext,
  targetPages: number,
): void {
  if (dom.overflows) return;

  const relaxEntry = (key: string, bulletCount: number) => {
    if (bulletCount < 2) return;
    const cap = plan.bulletLimits[key];
    if (cap != null && cap < 2) {
      delete plan.bulletLimits[key];
    }
  };

  resume.experience.forEach((e, i) => relaxEntry(experienceEntryKey(e, i), e.bullets.length));
  resume.projects.forEach((p, i) => relaxEntry(projectEntryKey(p, i), p.bullets.length));

  if (!dom.overflows && dom.pagesUsed <= targetPages) {
    plan.omittedNotes = plan.omittedNotes.filter(
      (n) => !/\breduced from \d+ bullets? to \d+\b/i.test(n) && !/\blimited to \d+ bullets?\b/i.test(n),
    );
  }
}

function estimatedPagesFromUnits(units: number): number {
  return Math.round((units / PAGE_BUDGET) * 100) / 100;
}

/** Continue force tightening only while content still exceeds the page target. */
export function shouldContinueForceTightening(
  units: number,
  targetPages: number,
  baselineUnits?: number,
): boolean {
  const pages = estimatedPagesFromUnits(units);
  const band = healthyPageBand(targetPages);
  if (pages < band.min) {
    const baselinePages =
      baselineUnits != null ? estimatedPagesFromUnits(baselineUnits) : null;
    if (baselinePages != null && baselinePages < band.min) return false;
    return false;
  }
  if (pages <= targetPages && pages >= band.min) return false;
  return pages > targetPages;
}

function pushBulletReductionNote(
  plan: ResumeRenderPlan,
  label: string,
  fromCount: number,
  toCount: number,
): void {
  pushNote(
    plan,
    `${label} reduced from ${fromCount} bullet${fromCount === 1 ? "" : "s"} to ${toCount}`,
  );
}

function reduceOneExperienceBullet(
  resume: StructuredResume,
  plan: ResumeRenderPlan,
  allowSingleBullet: boolean,
): boolean {
  for (const row of sortedByCompressionFirst(rankExperience(resume))) {
    if (isEntryLocked(row.item.locked)) continue;
    const count = row.item.bullets.length;
    if (count === 0) continue;
    const effective = effectiveBulletCap(row.key, count, plan);
    const next = nextBulletCapForForce(effective, allowSingleBullet);
    if (next == null || next >= effective) continue;
    plan.bulletLimits[row.key] = next;
    pushBulletReductionNote(plan, experienceLabel(row.item), effective, next);
    return true;
  }
  return false;
}

function reduceOneProjectBullet(
  resume: StructuredResume,
  plan: ResumeRenderPlan,
  allowSingleBullet: boolean,
): boolean {
  for (const row of sortedByCompressionFirst(rankProjects(resume)).filter(
    (r) => !isProjectHidden(plan, r.key) && !isEntryLocked(r.item.locked),
  )) {
    const count = row.item.bullets.length;
    if (count === 0) continue;
    const effective = effectiveBulletCap(row.key, count, plan);
    const next = nextBulletCapForForce(effective, allowSingleBullet);
    if (next == null || next >= effective) continue;
    plan.bulletLimits[row.key] = next;
    pushBulletReductionNote(plan, projectLabel(row.item), effective, next);
    return true;
  }
  return false;
}

function allProjectsAtOneBullet(resume: StructuredResume, plan: ResumeRenderPlan): boolean {
  const visible = rankProjects(resume).filter((r) => !isProjectHidden(plan, r.key));
  if (!visible.length) return true;
  return visible.every((r) => {
    const cap = effectiveBulletCap(r.key, r.item.bullets.length, plan);
    return cap <= 1 || r.item.bullets.length <= 1;
  });
}

function hideNextProject(resume: StructuredResume, plan: ResumeRenderPlan): boolean {
  if (!allProjectsAtOneBullet(resume, plan)) return false;
  const candidate = sortedByCompressionFirst(rankProjects(resume)).find(
    (r) => !isProjectHidden(plan, r.key) && !isEntryLocked(r.item.locked),
  );
  if (!candidate) return false;
  plan.hiddenSections.push(candidate.key);
  const name = projectLabel(candidate.item);
  if (candidate.priority === "low") {
    pushNote(plan, `${name} omitted because priority is Low`);
  } else if (candidate.priority === "medium") {
    pushNote(plan, `${name} omitted because priority is Medium`);
  } else {
    pushNote(plan, `${name} omitted to fit one page`);
  }
  return true;
}

export type TightenStepResult = {
  applied: boolean;
  layoutMode: ResumeLayoutMode;
};

/**
 * Applies exactly one progressive compression step (Parts 3–6 order).
 * Mutates `plan` in place.
 */
/** Smart Fit only: spacing, summary shorten, skills/education compress — no bullets or hides. */
export function tightenSmartFitStep(
  resume: StructuredResume,
  plan: ResumeRenderPlan,
  visibleSectionKeys: ResumeSectionKey[],
): TightenStepResult {
  if (plan.layoutMode !== "compact") {
    plan.layoutMode = "compact";
    return { applied: true, layoutMode: "compact" };
  }
  if (!isSummaryHidden(plan) && visibleSectionKeys.includes("summary")) {
    const raw = resume.summary.trim();
    if (raw && !plan.shortenedSummary) {
      const short = shortenSummaryText(raw);
      if (short !== raw) {
        plan.shortenedSummary = true;
        plan.summaryText = short;
        pushNote(plan, "Summary shortened to fit target length");
        return { applied: true, layoutMode: plan.layoutMode };
      }
    }
  }
  if (!plan.compactSkills && visibleSectionKeys.includes("skills")) {
    plan.compactSkills = true;
    pushNote(plan, "Skills compressed into fewer lines");
    return { applied: true, layoutMode: plan.layoutMode };
  }
  if (!plan.compactEducation && visibleSectionKeys.includes("education")) {
    plan.compactEducation = true;
    pushNote(plan, "Education details omitted from export");
    return { applied: true, layoutMode: plan.layoutMode };
  }
  return { applied: false, layoutMode: plan.layoutMode };
}

export function tightenRenderPlanOneStep(
  resume: StructuredResume,
  plan: ResumeRenderPlan,
  visibleSectionKeys: ResumeSectionKey[],
  targetPages = 1,
  dom?: ResumeDomFitContext,
): TightenStepResult {
  const measureUnits = () =>
    estimatePageUse(resume, plan, spacingTokensForMode(plan.layoutMode), visibleSectionKeys);
  const layoutStillTightening = shouldTightenLayoutForForce(measureUnits(), targetPages, dom);
  // 1. Compact spacing
  if (layoutStillTightening && plan.layoutMode !== "compact") {
    plan.layoutMode = "compact";
    return { applied: true, layoutMode: "compact" };
  }

  // 2. Summary shortening
  if (layoutStillTightening && !isSummaryHidden(plan) && visibleSectionKeys.includes("summary")) {
    const raw = resume.summary.trim();
    if (raw && !plan.shortenedSummary) {
      const short = shortenSummaryText(raw);
      if (short !== raw) {
        plan.shortenedSummary = true;
        plan.summaryText = short;
        pushNote(plan, "Summary shortened to fit one page");
        return { applied: true, layoutMode: plan.layoutMode };
      }
    }
  }

  // 3. Summary hiding
  if (layoutStillTightening && !isSummaryHidden(plan) && visibleSectionKeys.includes("summary") && resume.summary.trim()) {
    plan.hiddenSections.push("summary");
    pushNote(plan, "Summary hidden to save space");
    return { applied: true, layoutMode: plan.layoutMode };
  }

  // 4. Skills compression
  if (layoutStillTightening && !plan.compactSkills && visibleSectionKeys.includes("skills")) {
    plan.compactSkills = true;
    pushNote(plan, "Skills compressed into fewer lines");
    return { applied: true, layoutMode: plan.layoutMode };
  }

  // 5. Education compression
  if (layoutStillTightening && !plan.compactEducation && visibleSectionKeys.includes("education")) {
    plan.compactEducation = true;
    pushNote(plan, "Education details omitted from export");
    return { applied: true, layoutMode: plan.layoutMode };
  }

  const units = measureUnits();
  const canTrimBullets = canTrimBulletsForForce(units, dom);
  const allowSingleBullet = dom
    ? dom.overflows
    : estimatedPagesFromUnits(units) > BULLET_TRIM_ESTIMATE_THRESHOLD;

  // 6. One project entry (compress projects before experience)
  if (canTrimBullets && reduceOneProjectBullet(resume, plan, allowSingleBullet)) {
    return { applied: true, layoutMode: plan.layoutMode };
  }

  // 7. One experience entry (never hide experience)
  if (canTrimBullets && reduceOneExperienceBullet(resume, plan, allowSingleBullet)) {
    return { applied: true, layoutMode: plan.layoutMode };
  }

  // 8. Project hiding (only after that project's bullets are at 1)
  if (layoutStillTightening && hideNextProject(resume, plan)) {
    return { applied: true, layoutMode: plan.layoutMode };
  }

  return { applied: false, layoutMode: plan.layoutMode };
}

function targetToUnits(targetPages: number): number {
  return PAGE_BUDGET * targetPages;
}

export function computeOnePageLayoutPlan(
  resume: StructuredResume,
  visibleSectionKeys: ResumeSectionKey[],
  fitMode: ResumeFitMode = "preserve",
  targetPages = 1,
): OnePageLayoutResult {
  const plan = cloneRenderPlan();
  plan.layoutMode = chooseInitialLayoutMode(resume, visibleSectionKeys);
  const targetUnits = targetToUnits(targetPages);

  const measure = () => {
    const spacing = spacingTokensForMode(plan.layoutMode);
    return estimatePageUse(resume, plan, spacing, visibleSectionKeys);
  };

  let estimatedPageUse = measure();

  if (fitMode === "preserve") {
    return {
      layoutMode: plan.layoutMode,
      estimatedPageUse,
      overflowRisk: overflowRiskFromEstimate(estimatedPageUse / targetPages),
      renderPlan: plan,
    };
  }

  if (fitMode === "smart") {
    let steps = 0;
    while (estimatedPageUse > targetUnits && steps < 8) {
      const result = tightenSmartFitStep(resume, plan, visibleSectionKeys);
      if (!result.applied) break;
      plan.layoutMode = result.layoutMode;
      estimatedPageUse = measure();
      steps += 1;
    }
    return {
      layoutMode: plan.layoutMode,
      estimatedPageUse,
      overflowRisk: overflowRiskFromEstimate(estimatedPageUse / targetPages),
      renderPlan: plan,
    };
  }

  // Force fit: stop at target without compressing below healthy fill band.
  const baselinePageUse = estimatedPageUse;
  let steps = 0;
  while (
    shouldTightenLayoutForForce(estimatedPageUse, targetPages, undefined, baselinePageUse) &&
    steps < MAX_COMPUTE_TIGHTEN_STEPS
  ) {
    const pagesBefore = estimatedPagesFromUnits(estimatedPageUse);
    const band = healthyPageBand(targetPages);
    if (pagesBefore < band.min) break;

    const before = JSON.stringify(plan);
    const result = tightenRenderPlanOneStep(resume, plan, visibleSectionKeys, targetPages, undefined);
    if (!result.applied) break;
    plan.layoutMode = result.layoutMode;
    estimatedPageUse = measure();
    steps += 1;
    if (JSON.stringify(plan) === before) break;

    const pagesAfter = estimatedPagesFromUnits(estimatedPageUse);
    if (pagesAfter <= targetPages && pagesAfter >= band.min) break;
    if (pagesAfter < band.min && estimatedPagesFromUnits(baselinePageUse) >= band.min) break;
  }

  return {
    layoutMode: plan.layoutMode,
    estimatedPageUse,
    overflowRisk: overflowRiskFromEstimate(estimatedPageUse / targetPages),
    renderPlan: plan,
  };
}
