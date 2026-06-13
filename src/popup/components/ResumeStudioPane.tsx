import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ResumeEntryPriority,
  ResumeSectionKey,
  ResumeOptimizeForJobResponse,
  StructuredResume,
} from "../../lib/types";
import { cn } from "../../lib/classNames";
import {
  cloneRenderPlan,
  cloneRenderPlanDeep,
  emptyFinalExportOverrides,
  exportOverridesAreDirty,
  getResumeRenderModel,
  getVisibleResumeSections,
  mergeFinalExportOverridesIntoResume,
  mergeRenderPlans,
  normalizeResumeForRender,
  tightenRenderPlanOneStep,
  type FinalExportOverrides,
} from "../../lib/resumeRender";
import {
  applyDomPrimaryTruthToPlan,
  computeOnePageLayoutPlan,
  MAX_DOM_TIGHTEN_STEPS,
  type ResumeRenderPlan,
} from "../../lib/resumeLayoutEngine";
import type { ResumeFitMode, ResumeStudioLayoutSettings } from "../../lib/resumeFitSettings";
import type { ResumeTargetLength } from "../../lib/resumePageMetrics";
import { formatPageFitDisplay, type ResumeDomFitContext } from "../../lib/resumePageMetrics";
import {
  ResumeDownloadReview,
  seedFinalExportOverrides,
  type ResumeExportContext,
} from "./resume/ResumeDownloadReview";
import {
  applySelectedTrimSuggestions,
  buildTrimSuggestions,
  projectTrimImpact,
} from "../../lib/resumeTrimSuggestions";
import { loadResumeStudioLayoutSettings, saveResumeStudioLayoutSettings } from "../../lib/storage";
import { degreeLabel } from "../../lib/resumeEducation";
import { ResumePreview } from "./resume/ResumePreview";

type Props = {
  resume: StructuredResume;
  resumeVariantName: string;
  exportFileBaseName: string;
  onExportFileBaseNameChange: (value: string) => void;
  targetRole: string;
  summaryBusy: boolean;
  summaryError: string | null;
  jobAvailable: boolean;
  optimizeBusy: boolean;
  optimizeError: string | null;
  optimizeResult: ResumeOptimizeForJobResponse | null;
  suggestionDecisions: Record<string, "pending" | "accepted" | "rejected">;
  onTargetRoleChange: (value: string) => void;
  onResumeChange: (next: StructuredResume) => void;
  onImportFromProfile: () => void;
  onGenerateSummary: () => void;
  onOptimizeForJob: () => void;
  onAcceptSuggestion: (id: string) => void;
  onRejectSuggestion: (id: string) => void;
  onExportDocx: (ctx: ResumeExportContext) => void;
  onExportPdf: (ctx: ResumeExportContext) => void;
  onQuickEditResume?: () => void;
  libraryMode?: boolean;
};

const NARROW_PANEL_HINT_KEY = "coverclick-resume-narrow-panel-hint";
const SPLIT_MIN_WIDTH_PX = 980;

const degreeTypeOptions = ["High School", "Associate", "Bachelor's", "Master's", "MBA", "JD", "MD", "PhD", "Certificate", "Other"] as const;
const sectionMeta: { key: ResumeSectionKey; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "experience", label: "Experience" },
  { key: "projects", label: "Projects" },
  { key: "education", label: "Education" },
  { key: "skills", label: "Skills" },
];

function splitLines(v: string): string[] {
  return v.split("\n").map((x) => x.trim()).filter(Boolean);
}
function joinLines(v: string[]): string {
  return v.join("\n");
}

function moveSection(resume: StructuredResume, key: ResumeSectionKey, dir: -1 | 1): StructuredResume {
  const sorted = [...sectionMeta].sort(
    (a, b) => (resume.sectionSettings[a.key]?.order ?? 0) - (resume.sectionSettings[b.key]?.order ?? 0),
  );
  const idx = sorted.findIndex((s) => s.key === key);
  const other = sorted[idx + dir];
  if (idx < 0 || !other) return resume;
  const currentOrder = resume.sectionSettings[key].order;
  const swapOrder = resume.sectionSettings[other.key].order;
  return {
    ...resume,
    sectionSettings: {
      ...resume.sectionSettings,
      [key]: { ...resume.sectionSettings[key], order: swapOrder },
      [other.key]: { ...resume.sectionSettings[other.key], order: currentOrder },
    },
  };
}

const priorityOptions: { value: ResumeEntryPriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const inputCls = cn(
  "min-w-0 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-900 shadow-sm",
  "outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/15",
);
const textCls = cn(
  "min-h-[72px] w-full rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-[12px] text-slate-900 shadow-sm",
  "outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/15",
);

export function ResumeStudioPane({
  resume,
  resumeVariantName,
  exportFileBaseName,
  onExportFileBaseNameChange,
  targetRole,
  summaryBusy,
  summaryError,
  jobAvailable,
  optimizeBusy,
  optimizeError,
  optimizeResult,
  suggestionDecisions,
  onTargetRoleChange,
  onResumeChange,
  onImportFromProfile,
  onGenerateSummary,
  onOptimizeForJob,
  onAcceptSuggestion,
  onRejectSuggestion,
  onExportDocx,
  onExportPdf,
  onQuickEditResume,
  libraryMode = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const domTightenStepsRef = useRef(0);
  const [wide, setWide] = useState(true);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [layoutSettings, setLayoutSettings] = useState<ResumeStudioLayoutSettings>({
    fitMode: "preserve",
    targetLength: 1,
  });
  const [manualTrimPlan, setManualTrimPlan] = useState<ResumeRenderPlan>(() => cloneRenderPlan());
  const [trimUndoStack, setTrimUndoStack] = useState<ResumeRenderPlan[]>([]);
  const [forcePlanOverride, setForcePlanOverride] = useState<ResumeRenderPlan | null>(null);
  const [pagesUsed, setPagesUsed] = useState<number | null>(null);
  const domFitRef = useRef<ResumeDomFitContext | null>(null);
  const [domFitRevision, setDomFitRevision] = useState(0);
  const [forceOptimizerExhausted, setForceOptimizerExhausted] = useState(false);
  const [selectedTrimIds, setSelectedTrimIds] = useState<Set<string>>(() => new Set());
  const [fullContentPreview, setFullContentPreview] = useState(false);
  const [downloadReviewOpen, setDownloadReviewOpen] = useState(false);
  const [downloadReviewManualEdit, setDownloadReviewManualEdit] = useState(false);
  const [finalExportOverrides, setFinalExportOverrides] = useState<FinalExportOverrides>(() =>
    emptyFinalExportOverrides(),
  );
  const [narrowHintDismissed, setNarrowHintDismissed] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem(NARROW_PANEL_HINT_KEY) === "1",
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const isWide = w >= SPLIT_MIN_WIDTH_PX;
      setWide(isWide);
      if (isWide) setView("edit");
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const orderedSections = [...sectionMeta].sort(
    (a, b) => (resume.sectionSettings[a.key]?.order ?? 0) - (resume.sectionSettings[b.key]?.order ?? 0),
  );

  useEffect(() => {
    void loadResumeStudioLayoutSettings().then(setLayoutSettings);
  }, []);

  useEffect(() => {
    setManualTrimPlan(cloneRenderPlan());
    setTrimUndoStack([]);
    setForcePlanOverride(null);
    domTightenStepsRef.current = 0;
    setPagesUsed(null);
    domFitRef.current = null;
    setDomFitRevision((n) => n + 1);
    setForceOptimizerExhausted(false);
    setSelectedTrimIds(new Set());
    setFullContentPreview(false);
    setFinalExportOverrides(emptyFinalExportOverrides());
    setDownloadReviewManualEdit(false);
  }, [resume]);

  const persistLayoutSettings = useCallback((next: ResumeStudioLayoutSettings) => {
    setLayoutSettings(next);
    void saveResumeStudioLayoutSettings(next);
    setFullContentPreview(false);
    if (next.fitMode !== "force") {
      setForcePlanOverride(null);
      domTightenStepsRef.current = 0;
    }
  }, []);

  const renderOptions = useMemo(() => {
    if (fullContentPreview) {
      return {
        fitMode: "preserve" as const,
        targetPages: layoutSettings.targetLength,
        manualTrimPlan: cloneRenderPlan(),
        fullContentPreview: true,
      };
    }
    const opts = {
      fitMode: layoutSettings.fitMode,
      targetPages: layoutSettings.targetLength,
      manualTrimPlan,
      finalExportOverrides,
      domFitContext: domFitRef.current ?? undefined,
    };
    if (layoutSettings.fitMode === "force" && forcePlanOverride) {
      return { ...opts, renderPlan: forcePlanOverride };
    }
    return opts;
  }, [layoutSettings, manualTrimPlan, forcePlanOverride, fullContentPreview, finalExportOverrides, domFitRevision]);

  const overridesDirty = useMemo(
    () => exportOverridesAreDirty(resume, renderOptions, finalExportOverrides),
    [resume, renderOptions, finalExportOverrides],
  );

  const clearReviewOverrides = useCallback(() => {
    setFinalExportOverrides(emptyFinalExportOverrides());
    setDownloadReviewManualEdit(false);
  }, []);

  const saveReviewEditsToVariant = useCallback(() => {
    const merged = mergeFinalExportOverridesIntoResume(resume, finalExportOverrides);
    onResumeChange(merged);
    clearReviewOverrides();
  }, [resume, finalExportOverrides, onResumeChange, clearReviewOverrides]);

  const model = useMemo(() => getResumeRenderModel(resume, renderOptions), [resume, renderOptions]);
  const omittedNotes = model.layout.renderPlan.omittedNotes;
  const sectionKeys = useMemo(
    () => getVisibleResumeSections(model.sourceResume).map((s) => s.key),
    [model.sourceResume],
  );

  const pageFit = useMemo(() => {
    if (pagesUsed == null) return null;
    return formatPageFitDisplay(pagesUsed, layoutSettings.targetLength);
  }, [pagesUsed, layoutSettings.targetLength]);

  const mergedBasePlan = useMemo(() => {
    if (fullContentPreview) return cloneRenderPlan();
    const auto = computeOnePageLayoutPlan(
      model.sourceResume,
      sectionKeys,
      layoutSettings.fitMode,
      layoutSettings.targetLength,
    ).renderPlan;
    return mergeRenderPlans(auto, manualTrimPlan);
  }, [model.sourceResume, sectionKeys, layoutSettings, manualTrimPlan, fullContentPreview]);

  const trimSuggestions = useMemo(() => {
    if (pagesUsed == null || pagesUsed <= layoutSettings.targetLength) return [];
    const auto = computeOnePageLayoutPlan(
      model.sourceResume,
      sectionKeys,
      layoutSettings.fitMode,
      layoutSettings.targetLength,
    ).renderPlan;
    return buildTrimSuggestions(model.sourceResume, sectionKeys, auto, manualTrimPlan);
  }, [pagesUsed, layoutSettings, model.sourceResume, sectionKeys, manualTrimPlan]);

  const trimProjection = useMemo(() => {
    if (pagesUsed == null || selectedTrimIds.size === 0) return null;
    return projectTrimImpact(
      model.sourceResume,
      sectionKeys,
      mergedBasePlan,
      trimSuggestions,
      [...selectedTrimIds],
      pagesUsed,
    );
  }, [pagesUsed, selectedTrimIds, trimSuggestions, mergedBasePlan, model.sourceResume, sectionKeys]);

  const handleExportPageMeasure = useCallback(
    ({ pagesUsed: used, overflows }: { contentHeight: number; pagesUsed: number; overflows: boolean }) => {
      const dom: ResumeDomFitContext = { pagesUsed: used, overflows };
      const prevDom = domFitRef.current;
      const domChanged =
        !prevDom || prevDom.overflows !== overflows || Math.abs(prevDom.pagesUsed - used) >= 0.01;
      if (domChanged) {
        domFitRef.current = dom;
        setDomFitRevision((n) => n + 1);
      }
      setPagesUsed((prev) => (prev === used ? prev : used));

      if (fullContentPreview) return;
      if (layoutSettings.fitMode !== "force") return;

      const target = layoutSettings.targetLength;
      const sourceResume = normalizeResumeForRender(resume);

      if (!overflows) {
        if (forcePlanOverride) {
          const relaxed = cloneRenderPlanDeep(forcePlanOverride);
          applyDomPrimaryTruthToPlan(sourceResume, relaxed, dom, target);
          const before = JSON.stringify(forcePlanOverride);
          const after = JSON.stringify(relaxed);
          if (before !== after) setForcePlanOverride(relaxed);
        }
        return;
      }

      if (domTightenStepsRef.current >= MAX_DOM_TIGHTEN_STEPS) return;
      const currentFull = forcePlanOverride ?? model.layout.renderPlan;
      const next = cloneRenderPlanDeep(currentFull);
      const { applied } = tightenRenderPlanOneStep(sourceResume, next, sectionKeys, target, dom);
      if (!applied) {
        setForceOptimizerExhausted(true);
        return;
      }
      domTightenStepsRef.current += 1;
      if (domTightenStepsRef.current >= MAX_DOM_TIGHTEN_STEPS) setForceOptimizerExhausted(true);
      const nextJson = JSON.stringify(next);
      const curJson = JSON.stringify(forcePlanOverride ?? model.layout.renderPlan);
      if (nextJson !== curJson) setForcePlanOverride(next);
    },
    [resume, sectionKeys, layoutSettings, model.layout.renderPlan, fullContentPreview, forcePlanOverride],
  );

  const toggleTrimSelection = useCallback((id: string) => {
    setSelectedTrimIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const applySelectedTrims = useCallback(() => {
    if (selectedTrimIds.size === 0) return;
    setFullContentPreview(false);
    setTrimUndoStack((stack) => [...stack, cloneRenderPlanDeep(manualTrimPlan)]);
    setManualTrimPlan((prev) =>
      applySelectedTrimSuggestions(normalizeResumeForRender(resume), prev, [...selectedTrimIds]),
    );
    setSelectedTrimIds(new Set());
  }, [resume, manualTrimPlan, selectedTrimIds]);

  const undoLastTrim = useCallback(() => {
    setTrimUndoStack((stack) => {
      if (!stack.length) return stack;
      const prev = stack[stack.length - 1];
      setManualTrimPlan(prev);
      return stack.slice(0, -1);
    });
  }, []);

  const restoreAllContent = useCallback(() => {
    setManualTrimPlan(cloneRenderPlan());
    setTrimUndoStack([]);
    setForcePlanOverride(null);
    setSelectedTrimIds(new Set());
    domTightenStepsRef.current = 0;
    setForceOptimizerExhausted(false);
    setFullContentPreview(true);
  }, []);

  const renderEntryControls = (
    locked: boolean,
    priority: ResumeEntryPriority,
    onLock: (next: boolean) => void,
    onPriority: (p: ResumeEntryPriority) => void,
  ) => (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
      <button
        type="button"
        onClick={() => onLock(!locked)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1.5 text-[11px] font-bold transition",
          locked
            ? "border-amber-500 bg-amber-100 text-amber-950 shadow-sm"
            : "border-slate-300 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/80",
        )}
      >
        <span aria-hidden>{locked ? "🔒" : "🔓"}</span>
        {locked ? "Never Trim (on)" : "Never Trim"}
      </button>
      <label className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
        Priority
        <select
          className={cn(inputCls, "max-w-[96px] py-1 text-[10px] font-normal")}
          value={priority}
          onChange={(e) => onPriority(e.target.value as ResumeEntryPriority)}
        >
          {priorityOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <p className="w-full text-[9px] leading-snug text-slate-500">
        <span className="font-semibold text-slate-600">Never Trim</span> — this entry cannot be shortened or hidden by
        fitting. <span className="font-semibold text-slate-600">Priority</span> — what gets compressed first if space is
        tight.
      </p>
    </div>
  );

  const editor = (
    <div className="min-w-0 space-y-4">
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onImportFromProfile} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold">Import from Profile</button>
          <button type="button" onClick={onGenerateSummary} disabled={summaryBusy} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-950 disabled:opacity-50">{summaryBusy ? "Generating…" : "Generate Summary"}</button>
          <button type="button" onClick={onOptimizeForJob} disabled={!jobAvailable || optimizeBusy} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-950 disabled:opacity-50">{optimizeBusy ? "Optimizing…" : "Optimize for This Job"}</button>
        </div>
        <input className={inputCls} placeholder="Target role (optional)" value={targetRole} onChange={(e) => onTargetRoleChange(e.target.value)} />
        {summaryError ? <p className="text-[11px] text-red-700">{summaryError}</p> : null}
        {optimizeError ? <p className="text-[11px] text-red-700">{optimizeError}</p> : null}
      </div>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Section visibility & order</h3>
        {orderedSections.map((s, idx) => (
          <div key={s.key} className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-[11px] text-slate-700">
              <input
                type="checkbox"
                checked={resume.sectionSettings[s.key]?.isVisible !== false}
                onChange={(e) =>
                  onResumeChange({
                    ...resume,
                    sectionSettings: {
                      ...resume.sectionSettings,
                      [s.key]: { ...resume.sectionSettings[s.key], isVisible: e.target.checked },
                    },
                  })
                }
              />
              {s.label}
            </label>
            <div className="flex gap-1">
              <button type="button" disabled={idx === 0} className="rounded border px-2 text-[10px]" onClick={() => onResumeChange(moveSection(resume, s.key, -1))}>↑</button>
              <button type="button" disabled={idx === orderedSections.length - 1} className="rounded border px-2 text-[10px]" onClick={() => onResumeChange(moveSection(resume, s.key, 1))}>↓</button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">Contact</h3>
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} placeholder="Full name" value={resume.contact.fullName} onChange={(e) => onResumeChange({ ...resume, contact: { ...resume.contact, fullName: e.target.value } })} />
          <input className={inputCls} placeholder="Email" value={resume.contact.email} onChange={(e) => onResumeChange({ ...resume, contact: { ...resume.contact, email: e.target.value } })} />
          <input className={inputCls} placeholder="Phone" value={resume.contact.phone} onChange={(e) => onResumeChange({ ...resume, contact: { ...resume.contact, phone: e.target.value } })} />
          <input className={inputCls} placeholder="Location" value={resume.contact.location} onChange={(e) => onResumeChange({ ...resume, contact: { ...resume.contact, location: e.target.value } })} />
        </div>
        <textarea className={textCls} placeholder="Links (one per line)" value={joinLines(resume.contact.links)} onChange={(e) => onResumeChange({ ...resume, contact: { ...resume.contact, links: splitLines(e.target.value) } })} />
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">Summary</h3>
        <textarea className={textCls} placeholder="Professional summary" value={resume.summary} onChange={(e) => onResumeChange({ ...resume, summary: e.target.value })} />
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Experience</h3>
          <button type="button" className="rounded border px-2 py-0.5 text-[10px]" onClick={() => onResumeChange({ ...resume, experience: [...resume.experience, { id: `exp-${resume.experience.length + 1}`, locked: false, priority: "high", company: "", companySubtitle: "", title: "", dates: "", location: "", bullets: [] }] })}>Add Experience</button>
        </div>
        <p className="text-[10px] text-slate-500">Lock important roles first. High priority entries are trimmed after Low.</p>
        {resume.experience.map((exp, idx) => (
          <div key={exp.id ?? `exp-${idx}`} className="space-y-2 rounded border border-slate-200 bg-slate-50/60 p-2">
            {renderEntryControls(
              exp.locked === true,
              exp.priority ?? "high",
              (locked) =>
                onResumeChange({
                  ...resume,
                  experience: resume.experience.map((x, i) => (i === idx ? { ...x, locked } : x)),
                }),
              (priority) =>
                onResumeChange({
                  ...resume,
                  experience: resume.experience.map((x, i) => (i === idx ? { ...x, priority } : x)),
                }),
            )}
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Company" value={exp.company} onChange={(e) => onResumeChange({ ...resume, experience: resume.experience.map((x, i) => i === idx ? { ...x, company: e.target.value } : x) })} />
              <input className={inputCls} placeholder="Company subtitle (optional)" value={exp.companySubtitle ?? ""} onChange={(e) => onResumeChange({ ...resume, experience: resume.experience.map((x, i) => i === idx ? { ...x, companySubtitle: e.target.value } : x) })} />
              <input className={inputCls} placeholder="Role / title" value={exp.title} onChange={(e) => onResumeChange({ ...resume, experience: resume.experience.map((x, i) => i === idx ? { ...x, title: e.target.value } : x) })} />
              <input className={inputCls} placeholder="Dates" value={exp.dates} onChange={(e) => onResumeChange({ ...resume, experience: resume.experience.map((x, i) => i === idx ? { ...x, dates: e.target.value } : x) })} />
              <input className={inputCls} placeholder="Location" value={exp.location} onChange={(e) => onResumeChange({ ...resume, experience: resume.experience.map((x, i) => i === idx ? { ...x, location: e.target.value } : x) })} />
            </div>
            <textarea className={textCls} placeholder="Bullets (one per line)" value={joinLines(exp.bullets)} onChange={(e) => onResumeChange({ ...resume, experience: resume.experience.map((x, i) => i === idx ? { ...x, bullets: splitLines(e.target.value) } : x) })} />
            <button type="button" className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700" onClick={() => onResumeChange({ ...resume, experience: resume.experience.filter((_, i) => i !== idx) })}>Remove entry</button>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Projects</h3>
          <button type="button" className="rounded border px-2 py-0.5 text-[10px]" onClick={() => onResumeChange({ ...resume, projects: [...resume.projects, { id: `proj-${resume.projects.length + 1}`, locked: false, priority: "high", name: "", subtitle: "", techStack: [], bullets: [] }] })}>Add Project</button>
        </div>
        {resume.projects.map((proj, idx) => (
          <div key={proj.id ?? `proj-${idx}`} className="space-y-2 rounded border border-slate-200 bg-slate-50/60 p-2">
            {renderEntryControls(
              proj.locked === true,
              proj.priority ?? "high",
              (locked) =>
                onResumeChange({
                  ...resume,
                  projects: resume.projects.map((x, i) => (i === idx ? { ...x, locked } : x)),
                }),
              (priority) =>
                onResumeChange({
                  ...resume,
                  projects: resume.projects.map((x, i) => (i === idx ? { ...x, priority } : x)),
                }),
            )}
            <input className={inputCls} placeholder="Project name" value={proj.name} onChange={(e) => onResumeChange({ ...resume, projects: resume.projects.map((x, i) => i === idx ? { ...x, name: e.target.value } : x) })} />
            <input className={inputCls} placeholder="Subtitle / description" value={proj.subtitle} onChange={(e) => onResumeChange({ ...resume, projects: resume.projects.map((x, i) => i === idx ? { ...x, subtitle: e.target.value } : x) })} />
            <input className={inputCls} placeholder="Tech stack (comma-separated)" value={proj.techStack.join(", ")} onChange={(e) => onResumeChange({ ...resume, projects: resume.projects.map((x, i) => i === idx ? { ...x, techStack: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : x) })} />
            <textarea className={textCls} placeholder="Bullets (one per line)" value={joinLines(proj.bullets)} onChange={(e) => onResumeChange({ ...resume, projects: resume.projects.map((x, i) => i === idx ? { ...x, bullets: splitLines(e.target.value) } : x) })} />
            <button type="button" className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700" onClick={() => onResumeChange({ ...resume, projects: resume.projects.filter((_, i) => i !== idx) })}>Remove entry</button>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Education</h3>
          <button type="button" className="rounded border px-2 py-0.5 text-[10px]" onClick={() => onResumeChange({ ...resume, education: [...resume.education, { id: `edu-${resume.education.length + 1}`, school: "", degreeType: "Other", degree: "", major: "", concentrationOrMinor: "", gpa: "", graduationDate: "", details: [] }] })}>Add Education</button>
        </div>
        {resume.education.map((edu, idx) => (
          <div key={edu.id ?? `edu-${idx}`} className="space-y-2 rounded border border-slate-200 bg-slate-50/60 p-2">
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="School" value={edu.school} onChange={(e) => onResumeChange({ ...resume, education: resume.education.map((x, i) => i === idx ? { ...x, school: e.target.value } : x) })} />
              <input className={inputCls} placeholder="Graduation date" value={edu.graduationDate} onChange={(e) => onResumeChange({ ...resume, education: resume.education.map((x, i) => i === idx ? { ...x, graduationDate: e.target.value } : x) })} />
              <select
                className={inputCls}
                value={edu.degreeType ?? "Other"}
                onChange={(e) => {
                  const degreeType = e.target.value as (typeof degreeTypeOptions)[number];
                  const major = edu.major.trim();
                  onResumeChange({
                    ...resume,
                    education: resume.education.map((x, i) =>
                      i === idx
                        ? {
                            ...x,
                            degreeType,
                            degree: major ? "" : degreeLabel(degreeType),
                          }
                        : x,
                    ),
                  });
                }}
              >
                {degreeTypeOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <input className={inputCls} placeholder="Degree" value={edu.degree} onChange={(e) => onResumeChange({ ...resume, education: resume.education.map((x, i) => i === idx ? { ...x, degree: e.target.value } : x) })} />
              <input className={inputCls} placeholder="Major" value={edu.major} onChange={(e) => onResumeChange({ ...resume, education: resume.education.map((x, i) => i === idx ? { ...x, major: e.target.value } : x) })} />
              <input className={inputCls} placeholder="Concentration / minor (optional)" value={edu.concentrationOrMinor ?? ""} onChange={(e) => onResumeChange({ ...resume, education: resume.education.map((x, i) => i === idx ? { ...x, concentrationOrMinor: e.target.value } : x) })} />
              <input className={inputCls} placeholder="GPA (optional)" value={edu.gpa ?? ""} onChange={(e) => onResumeChange({ ...resume, education: resume.education.map((x, i) => i === idx ? { ...x, gpa: e.target.value } : x) })} />
            </div>
            <textarea className={textCls} placeholder="Additional details (one per line)" value={joinLines(edu.details)} onChange={(e) => onResumeChange({ ...resume, education: resume.education.map((x, i) => i === idx ? { ...x, details: splitLines(e.target.value) } : x) })} />
            <button type="button" className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700" onClick={() => onResumeChange({ ...resume, education: resume.education.filter((_, i) => i !== idx) })}>Remove entry</button>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Skills</h3>
          <button type="button" className="rounded border px-2 py-0.5 text-[10px]" onClick={() => onResumeChange({ ...resume, skills: [...resume.skills, { id: `skills-${resume.skills.length + 1}`, category: "", items: [] }] })}>Add Skill Category</button>
        </div>
        {resume.skills.map((sg, idx) => (
          <div key={sg.id ?? `skills-${idx}`} className="space-y-2 rounded border border-slate-200 bg-slate-50/60 p-2">
            <input className={inputCls} placeholder="Category" value={sg.category} onChange={(e) => onResumeChange({ ...resume, skills: resume.skills.map((x, i) => i === idx ? { ...x, category: e.target.value } : x) })} />
            <textarea className={textCls} placeholder="Skills (comma-separated)" value={sg.items.join(", ")} onChange={(e) => onResumeChange({ ...resume, skills: resume.skills.map((x, i) => i === idx ? { ...x, items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : x) })} />
            <button type="button" className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700" onClick={() => onResumeChange({ ...resume, skills: resume.skills.filter((_, i) => i !== idx) })}>Remove entry</button>
          </div>
        ))}
      </section>

      {optimizeResult ? (
        <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Optimization</h3>
          <p className="text-[11px] text-slate-700">{optimizeResult.summary}</p>
          <div className="space-y-2">
            {optimizeResult.suggestions.map((s) => {
              const decision = suggestionDecisions[s.id] ?? "pending";
              if (decision === "rejected") return null;
              return (
                <div key={s.id} className="rounded-md border border-slate-200 bg-slate-50/80 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{s.section} · {s.changeType} · {s.priority}</p>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => onAcceptSuggestion(s.id)} disabled={decision === "accepted"} className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 disabled:opacity-60">Accept</button>
                      <button type="button" onClick={() => onRejectSuggestion(s.id)} className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-800">Reject</button>
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-600"><span className="font-semibold text-slate-700">Current:</span> {s.currentText || "(none)"}</p>
                  <p className="mt-1 text-[10px] text-slate-600"><span className="font-semibold text-slate-700">Suggested:</span> {s.suggestedText}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{s.reason}</p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );

  const dismissNarrowHint = () => {
    setNarrowHintDismissed(true);
    try {
      localStorage.setItem(NARROW_PANEL_HINT_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div ref={containerRef} className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-white via-slate-50/40 to-slate-50/90">
      {!wide && !narrowHintDismissed ? (
        <div className="shrink-0 border-b-2 border-sky-400 bg-gradient-to-r from-sky-100 via-sky-50 to-sky-100 px-4 py-3 shadow-sm" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold leading-none text-sky-600" aria-hidden>
              →
            </span>
            <p className="min-w-0 flex-1 text-[12px] font-semibold leading-snug text-sky-950">
              For the best experience, drag the right edge of this panel wider →
            </p>
            <button
              type="button"
              onClick={dismissNarrowHint}
              className="shrink-0 rounded-lg border border-sky-400 bg-white px-3 py-1.5 text-[11px] font-bold text-sky-900 shadow-sm hover:bg-sky-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none fixed left-[-14000px] top-0 z-0 overflow-visible" aria-hidden>
        <ResumePreview
          resume={resume}
          template="ats-classic"
          variant="export"
          renderOptions={renderOptions}
          layoutEpoch={domFitRevision + (forcePlanOverride ? 1 : 0)}
          onExportPageMeasure={handleExportPageMeasure}
        />
      </div>
      <div className="shrink-0 space-y-3 border-b border-slate-200/70 bg-white/90 px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold text-slate-900">Resume Studio</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {libraryMode
              ? `Editing saved resume version: ${resumeVariantName}. Changes apply across all jobs.`
              : `Quick editing ${resumeVariantName}. For full management, use Saved Resumes in Profile.`}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Preview matches export. Layout trims are render-only and never delete your resume text.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Target length
            <select
              className={cn(inputCls, "mt-1 w-full text-[11px]")}
              value={layoutSettings.targetLength}
              onChange={(e) =>
                persistLayoutSettings({
                  ...layoutSettings,
                  targetLength: Number(e.target.value) as ResumeTargetLength,
                })
              }
            >
              <option value={1}>1 Page</option>
              <option value={1.5}>1.5 Pages</option>
              <option value={2}>2 Pages</option>
            </select>
          </label>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Fit mode
            <select
              className={cn(inputCls, "mt-1 w-full text-[11px]")}
              value={layoutSettings.fitMode}
              onChange={(e) =>
                persistLayoutSettings({
                  ...layoutSettings,
                  fitMode: e.target.value as ResumeFitMode,
                })
              }
            >
              <option value="preserve">Preserve Content</option>
              <option value="smart">Smart Fit</option>
              <option value="force">Force One Page</option>
            </select>
          </label>
        </div>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Download file name
          <div className="mt-1 flex items-center gap-1.5">
            <input
              type="text"
              className={cn(inputCls, "min-w-0 flex-1 text-[11px]")}
              value={exportFileBaseName}
              onChange={(e) => onExportFileBaseNameChange(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder="Your_Name_Role_Resume"
            />
            <span className="shrink-0 text-[10px] font-medium text-slate-500">.pdf / .docx</span>
          </div>
        </label>
        {pagesUsed == null ? (
          <p className="text-[11px] text-slate-500">Measuring page length…</p>
        ) : pageFit ? (
          <p
            className={cn(
              "text-[11px] font-semibold",
              pageFit.tone === "ok" ? "text-emerald-700" : pageFit.tone === "slight" ? "text-amber-800" : "text-red-700",
            )}
          >
            {pageFit.headline}
            {pageFit.detail ? <span className="mt-0.5 block font-normal text-slate-600">{pageFit.detail}</span> : null}
          </p>
        ) : null}
        {fullContentPreview ? (
          <p className="text-[11px] font-medium text-indigo-800">
            Showing full resume content. Change fit mode or apply trims to re-enable automatic fitting.
          </p>
        ) : null}
        {layoutSettings.fitMode === "force" && forceOptimizerExhausted && pagesUsed != null && pagesUsed > layoutSettings.targetLength ? (
          <p className="text-[11px] font-semibold text-amber-800">⚠ Optimizer still cannot fit your target</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border-2 border-indigo-300 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-950"
            onClick={restoreAllContent}
          >
            Restore All Content
          </button>
          <button
            type="button"
            disabled={trimUndoStack.length === 0}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 disabled:opacity-40"
            onClick={undoLastTrim}
          >
            Undo last trim
          </button>
        </div>
      </div>

      {!wide ? (
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px]">
            <button type="button" className={cn("rounded px-3 py-1", view === "edit" ? "bg-indigo-50 text-indigo-900" : "text-slate-600")} onClick={() => setView("edit")}>Edit</button>
            <button type="button" className={cn("rounded px-3 py-1", view === "preview" ? "bg-indigo-50 text-indigo-900" : "text-slate-600")} onClick={() => setView("preview")}>Preview</button>
          </div>
        </div>
      ) : null}

      <div className={cn("min-h-0 flex-1 overflow-hidden px-3 py-3", wide ? "grid grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-3" : "") }>
        {(wide || view === "edit") ? (
          <div className="min-h-0 overflow-y-auto pr-1">{editor}</div>
        ) : null}

        {(wide || view === "preview") ? (
          <div className="min-h-0 overflow-y-auto">
            <div className={cn(wide ? "sticky top-2" : "")}>
              {trimSuggestions.length > 0 ? (
                <section className="mb-3 rounded-lg border border-sky-200/90 bg-sky-50/70 p-3">
                  <h3 className="text-[11px] font-semibold text-sky-950">Trim suggestions</h3>
                  <p className="mt-1 text-[10px] text-sky-900/90">
                    Your resume is longer than your {layoutSettings.targetLength}-page target. Select changes to preview impact, then apply together.
                  </p>
                  <p className="mt-2 text-[11px] font-semibold text-sky-950">
                    Current: {pagesUsed?.toFixed(2)} pages
                  </p>
                  <ul className="mt-2 space-y-2">
                    {trimSuggestions.map((s) => (
                      <li key={s.id}>
                        <label className="flex cursor-pointer items-start gap-2 text-[10px] text-sky-950">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={selectedTrimIds.has(s.id)}
                            onChange={() => toggleTrimSelection(s.id)}
                          />
                          <span>
                            {s.label}
                            <span className="text-sky-700"> — saves ~{s.savingsPages.toFixed(2)} pages</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  {trimProjection && selectedTrimIds.size > 0 ? (
                    <div className="mt-3 rounded-md border border-sky-200 bg-white/80 p-2 text-[10px] text-sky-950">
                      <p className="font-semibold">Projected if applied:</p>
                      <ul className="mt-1 space-y-0.5">
                        {trimProjection.steps.map((step) => (
                          <li key={step.id}>
                            → {step.label}: <span className="font-semibold">{step.pagesAfter.toFixed(2)} pages</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[11px] font-bold text-sky-950">
                        Final: {trimProjection.projectedPages.toFixed(2)} pages
                      </p>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    disabled={selectedTrimIds.size === 0}
                    className="mt-3 w-full rounded-lg border border-sky-400 bg-sky-100 py-2 text-[11px] font-bold text-sky-950 disabled:opacity-40"
                    onClick={applySelectedTrims}
                  >
                    Apply selected
                  </button>
                </section>
              ) : null}
              {omittedNotes.length > 0 ? (
                <section className="mb-3 rounded-lg border border-amber-200/90 bg-amber-50/80 p-3">
                  <h3 className="text-[11px] font-semibold text-amber-950">Auto-fit changes</h3>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[10px] text-amber-900/90">
                    {omittedNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <ResumePreview
                resume={resume}
                template="ats-classic"
                variant="preview"
                renderOptions={renderOptions}
                showPageBoundary
              />
              <button
                type="button"
                onClick={() => setDownloadReviewOpen(true)}
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 py-2.5 text-[12px] font-semibold text-white"
              >
                Review &amp; Download
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <ResumeDownloadReview
        open={downloadReviewOpen}
        onClose={() => {
          setDownloadReviewOpen(false);
          setDownloadReviewManualEdit(false);
        }}
        onEditResume={() => {
          setDownloadReviewOpen(false);
          setDownloadReviewManualEdit(false);
          onQuickEditResume?.();
        }}
        resume={resume}
        renderOptions={renderOptions}
        pagesUsed={pagesUsed}
        targetLength={layoutSettings.targetLength}
        exportFileBaseName={exportFileBaseName}
        onExportFileBaseNameChange={onExportFileBaseNameChange}
        resumeVariantName={resumeVariantName}
        manualEditMode={downloadReviewManualEdit}
        overridesDirty={overridesDirty}
        onEnterManualEdit={() => {
          setFinalExportOverrides((prev) => seedFinalExportOverrides(resume, renderOptions, prev));
          setDownloadReviewManualEdit(true);
        }}
        onFinalOverrideChange={(key, value) => {
          setFinalExportOverrides((prev) => ({ ...prev, [key]: value }));
        }}
        onDoneManualEdit={() => setDownloadReviewManualEdit(false)}
        onResetManualEdits={() => setFinalExportOverrides(emptyFinalExportOverrides())}
        onSaveToResumeVersion={saveReviewEditsToVariant}
        onExportOnlyClose={() => setDownloadReviewManualEdit(false)}
        onDiscardOverrides={clearReviewOverrides}
        onExportDocx={onExportDocx}
        onExportPdf={onExportPdf}
      />
    </div>
  );
}
