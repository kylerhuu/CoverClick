import type {
  ResumeEducationItem,
  ResumeEntryPriority,
  ResumeExperienceItem,
  ResumeProjectItem,
  ResumeSectionKey,
  StructuredResume,
} from "./types";
export const PAGE_BUDGET = 100;

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
  /** Render-only summary text when shortened. */
  summaryText?: string;
  omittedNotes: string[];
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

/** Lower sort value = more important (preserve bullets longer). */
export function entryImportanceSortKey(priority: ResumeEntryPriority, index: number): number {
  return PRIORITY_RANK[priority] * 1000 + index;
}

/** Higher sort value = hide / compress first. */
export function entryCompressionSortKey(priority: ResumeEntryPriority, index: number): number {
  return PRIORITY_RANK[priority] * 1000 + index;
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

function lineCountFromWords(words: number, wordsPerLine = 18): number {
  return Math.max(1, Math.ceil(words / wordsPerLine));
}

export function shortenSummaryText(summary: string, maxWords = 38): string {
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
  return 1.05 * spacing.bulletLineHeight;
}

function isSummaryHidden(plan: ResumeRenderPlan): boolean {
  return plan.hiddenSections.includes("summary");
}

function isProjectHidden(plan: ResumeRenderPlan, key: string): boolean {
  return plan.hiddenSections.includes(key);
}

function bulletLimitFor(plan: ResumeRenderPlan, key: string, fallback: number): number {
  return plan.bulletLimits[key] ?? fallback;
}

function visibleSummaryText(resume: StructuredResume, plan: ResumeRenderPlan): string {
  if (isSummaryHidden(plan)) return "";
  if (plan.summaryText != null) return plan.summaryText;
  return resume.summary.trim();
}

function displayBullets(bullets: string[], key: string, plan: ResumeRenderPlan, fallbackMax: number): string[] {
  const max = bulletLimitFor(plan, key, fallbackMax);
  return bullets.slice(0, max);
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
  return 8 + Math.max(0, Math.ceil(contact.length / 85) - 1) * 1.2;
}

function estimateEducationEntry(
  e: ResumeEducationItem,
  plan: ResumeRenderPlan,
  spacing: ResumeSpacingTokens,
): number {
  let units = 1.9;
  if (e.school) units += 0.35;
  if (e.degree) units += 0.3;
  if (e.major && !plan.compactEducation) units += 0.3;
  if (e.concentrationOrMinor && !plan.compactEducation) units += 0.25;
  if (e.gpa) units += 0.25;
  const details = plan.compactEducation ? [] : e.details;
  units += details.length * bulletCost(spacing);
  return units;
}

function estimateSkillsUnits(resume: StructuredResume, plan: ResumeRenderPlan, spacing: ResumeSpacingTokens): number {
  const groups = resume.skills.filter((s) => s.category || s.items.length);
  if (!groups.length) return 0;

  if (plan.compactSkills) {
    const chars = groups.map((g) => `${g.category}: ${g.items.join(", ")}`).join(" | ").length;
    return 2.2 + Math.ceil(chars / 110) * 1.1 * spacing.bulletLineHeight;
  }

  return groups.reduce((sum, g) => {
    const line = `${g.category || "Skills"}: ${g.items.join(", ")}`;
    return sum + 1.2 + lineCountFromWords(wordCount(line), 14) * 1.05 * spacing.bulletLineHeight;
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
    units += 4 + spacing.sectionGap / 4;

    if (key === "summary") {
      const text = visibleSummaryText(resume, plan);
      if (!text) continue;
      units += 2.5 + lineCountFromWords(wordCount(text)) * 1.1 * spacing.bulletLineHeight;
      continue;
    }

    if (key === "experience") {
      resume.experience.forEach((e, i) => {
        if (!e.company && !e.title && !e.bullets.length) return;
        const ek = experienceEntryKey(e, i);
        units += 2.2;
        if (e.company || e.companySubtitle) units += 0.35;
        if (e.title || e.dates || e.location) units += 0.35;
        const shown = displayBullets(e.bullets, ek, plan, e.bullets.length);
        units += shown.length * bulletCost(spacing);
        units += spacing.entryGap / 14;
      });
      continue;
    }

    if (key === "projects") {
      resume.projects.forEach((p, i) => {
        const pk = projectEntryKey(p, i);
        if (isProjectHidden(plan, pk)) return;
        if (!p.name && !p.subtitle && !p.techStack.length && !p.bullets.length) return;
        units += 2;
        if (p.name || p.subtitle) units += 0.35;
        if (p.techStack.length) units += 0.35;
        const shown = displayBullets(p.bullets, pk, plan, p.bullets.length);
        units += shown.length * bulletCost(spacing);
        units += spacing.entryGap / 14;
      });
      continue;
    }

    if (key === "education") {
      for (const e of resume.education) {
        units += estimateEducationEntry(e, plan, spacing) + spacing.entryGap / 16;
      }
      continue;
    }

    if (key === "skills") {
      units += estimateSkillsUnits(resume, plan, spacing);
    }
  }

  return Math.round(units * 10) / 10;
}

function overflowRiskFromEstimate(use: number): OnePageLayoutResult["overflowRisk"] {
  if (use <= 92) return "low";
  if (use <= 108) return "medium";
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
  const load = visibleSectionKeys.length * 1.4 + entries * 0.9 + bullets * 0.45 + summaryWords / 55;
  if (load <= 11) return "comfortable";
  if (load >= 20) return "compact";
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

function sortedByImportance<T>(entries: RankedEntry<T>[]): RankedEntry<T>[] {
  return [...entries].sort(
    (a, b) => entryImportanceSortKey(a.priority, a.index) - entryImportanceSortKey(b.priority, b.index),
  );
}

function sortedByCompressionFirst<T>(entries: RankedEntry<T>[]): RankedEntry<T>[] {
  return [...entries].sort(
    (a, b) => entryCompressionSortKey(b.priority, b.index) - entryCompressionSortKey(a.priority, a.index),
  );
}

type BulletTier = "normal" | "tight" | "minimal";

function capForTier(tier: BulletTier, importanceIndex: number, priority: ResumeEntryPriority): number {
  const isTop = importanceIndex < 2 && priority !== "low";
  if (tier === "minimal") return 1;
  if (tier === "tight") {
    if (priority === "high" && isTop) return 2;
    if (priority === "high") return 2;
    if (priority === "medium") return isTop ? 2 : 1;
    return 1;
  }
  // normal
  if (priority === "low") return isTop ? 2 : 1;
  if (priority === "medium") return isTop ? 3 : 2;
  return isTop ? 3 : 2;
}

function applyExperienceBulletTier(resume: StructuredResume, plan: ResumeRenderPlan, tier: BulletTier): boolean {
  const important = sortedByImportance(rankExperience(resume));
  let changed = false;

  for (let i = 0; i < important.length; i += 1) {
    const { key, item, priority } = important[i];
    const cap = capForTier(tier, i, priority);
    const count = item.bullets.length;
    const prev = plan.bulletLimits[key];
    const next = prev == null ? cap : Math.min(prev, cap);
    if (count <= next) continue;
    plan.bulletLimits[key] = next;
    const label = item.company || item.title || "Experience entry";
    pushNote(plan, `${label} limited to ${next} bullet${next === 1 ? "" : "s"} (one-page fit)`);
    changed = true;
  }

  return changed;
}

function applyProjectBulletTier(resume: StructuredResume, plan: ResumeRenderPlan, tier: BulletTier): boolean {
  const important = sortedByImportance(rankProjects(resume));
  let changed = false;

  for (let i = 0; i < important.length; i += 1) {
    const { key, item, priority } = important[i];
    const cap = capForTier(tier, i, priority);
    const count = item.bullets.length;
    const prev = plan.bulletLimits[key];
    const next = prev == null ? cap : Math.min(prev, cap);
    if (count <= next) continue;
    plan.bulletLimits[key] = next;
    const label = item.name || item.subtitle || "Project entry";
    pushNote(plan, `${label} limited to ${next} bullet${next === 1 ? "" : "s"} (one-page fit)`);
    changed = true;
  }

  return changed;
}

function clonePlan(): ResumeRenderPlan {
  return {
    hiddenSections: [],
    bulletLimits: {},
    compactSkills: false,
    compactEducation: false,
    shortenedSummary: false,
    omittedNotes: [],
  };
}

function pushNote(plan: ResumeRenderPlan, note: string): void {
  if (!plan.omittedNotes.includes(note)) plan.omittedNotes.push(note);
}

export function computeOnePageLayoutPlan(
  resume: StructuredResume,
  visibleSectionKeys: ResumeSectionKey[],
): OnePageLayoutResult {
  const plan = clonePlan();
  let layoutMode = chooseInitialLayoutMode(resume, visibleSectionKeys);
  let spacing = spacingTokensForMode(layoutMode);

  const measure = () => estimatePageUse(resume, plan, spacing, visibleSectionKeys);

  let estimatedPageUse = measure();

  const ensureFit = (step: () => boolean): void => {
    if (estimatedPageUse <= PAGE_BUDGET) return;
    if (step()) {
      estimatedPageUse = measure();
    }
  };

  // 1) Adaptive spacing already chosen; force compact if still high risk
  if (estimatedPageUse > PAGE_BUDGET && layoutMode !== "compact") {
    layoutMode = "compact";
    spacing = spacingTokensForMode(layoutMode);
    estimatedPageUse = measure();
  }

  // 2) Summary shortening
  ensureFit(() => {
    if (isSummaryHidden(plan) || !visibleSectionKeys.includes("summary")) return false;
    const raw = resume.summary.trim();
    if (!raw || plan.shortenedSummary) return false;
    const short = shortenSummaryText(raw);
    if (short === raw) return false;
    plan.shortenedSummary = true;
    plan.summaryText = short;
    pushNote(plan, "Summary shortened to fit one page");
    return true;
  });

  // 3) Summary hiding
  ensureFit(() => {
    if (isSummaryHidden(plan) || !visibleSectionKeys.includes("summary") || !resume.summary.trim()) return false;
    plan.hiddenSections.push("summary");
    pushNote(plan, "Summary hidden to fit one page");
    return true;
  });

  // 4) Skills compression
  ensureFit(() => {
    if (plan.compactSkills || !visibleSectionKeys.includes("skills")) return false;
    plan.compactSkills = true;
    pushNote(plan, "Skills compressed into fewer lines");
    return true;
  });

  // 5) Education compression
  ensureFit(() => {
    if (plan.compactEducation || !visibleSectionKeys.includes("education")) return false;
    plan.compactEducation = true;
    pushNote(plan, "Education details omitted from export");
    return true;
  });

  // 6) Bullet reduction passes (never hide experience)
  const bulletTiers: BulletTier[] = ["normal", "tight", "minimal"];
  for (const tier of bulletTiers) {
    if (estimatedPageUse <= PAGE_BUDGET) break;
    applyExperienceBulletTier(resume, plan, tier);
    applyProjectBulletTier(resume, plan, tier);
    estimatedPageUse = measure();
  }

  while (estimatedPageUse > PAGE_BUDGET) {
    const ranked = sortedByCompressionFirst(rankProjects(resume)).filter((r) => !isProjectHidden(plan, r.key));
    let reduced = false;
    for (const row of ranked) {
      const current = plan.bulletLimits[row.key] ?? row.item.bullets.length;
      if (row.item.bullets.length > 0 && current > 1) {
        plan.bulletLimits[row.key] = current - 1;
        reduced = true;
        estimatedPageUse = measure();
        break;
      }
    }
    if (reduced) continue;

    for (const tier of bulletTiers) {
      if (estimatedPageUse <= PAGE_BUDGET) break;
      if (applyExperienceBulletTier(resume, plan, tier)) estimatedPageUse = measure();
      if (estimatedPageUse <= PAGE_BUDGET) break;
      if (applyProjectBulletTier(resume, plan, tier)) estimatedPageUse = measure();
    }
    if (estimatedPageUse <= PAGE_BUDGET) break;

    // 7) Hide lowest-priority projects only after bullet passes
    const hideCandidate = sortedByCompressionFirst(rankProjects(resume)).find((r) => !isProjectHidden(plan, r.key));
    if (!hideCandidate) break;
    plan.hiddenSections.push(hideCandidate.key);
    const name = hideCandidate.item.name || hideCandidate.item.subtitle || "Project";
    pushNote(plan, `${name} hidden to fit one page`);
    estimatedPageUse = measure();
  }

  if (estimatedPageUse > PAGE_BUDGET && layoutMode !== "compact") {
    layoutMode = "compact";
    spacing = spacingTokensForMode(layoutMode);
    estimatedPageUse = measure();
  }

  return {
    layoutMode,
    estimatedPageUse,
    overflowRisk: overflowRiskFromEstimate(estimatedPageUse),
    renderPlan: plan,
  };
}
