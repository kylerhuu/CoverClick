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
  getResumeRenderModel,
  getVisibleResumeSections,
  normalizeResumeForRender,
  tightenRenderPlanOneStep,
} from "../../lib/resumeRender";
import { computeOnePageLayoutPlan, MAX_DOM_TIGHTEN_STEPS, type ResumeRenderPlan } from "../../lib/resumeLayoutEngine";
import type { ResumeFitMode, ResumeStudioLayoutSettings } from "../../lib/resumeFitSettings";
import type { ResumeTargetLength } from "../../lib/resumePageMetrics";
import { formatPageFitDisplay } from "../../lib/resumePageMetrics";
import { buildTrimSuggestions, applyTrimSuggestion } from "../../lib/resumeTrimSuggestions";
import { loadResumeStudioLayoutSettings, saveResumeStudioLayoutSettings } from "../../lib/storage";
import { ResumePreview } from "./resume/ResumePreview";

type Props = {
  resume: StructuredResume;
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
  onExportDocx: () => void;
  onExportPdf: () => void;
};

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
  const [forceOptimizerExhausted, setForceOptimizerExhausted] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const isWide = w >= 980;
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
    setForceOptimizerExhausted(false);
  }, [resume]);

  const persistLayoutSettings = useCallback((next: ResumeStudioLayoutSettings) => {
    setLayoutSettings(next);
    void saveResumeStudioLayoutSettings(next);
    if (next.fitMode !== "force") {
      setForcePlanOverride(null);
      domTightenStepsRef.current = 0;
    }
  }, []);

  const renderOptions = useMemo(() => {
    const opts = {
      fitMode: layoutSettings.fitMode,
      targetPages: layoutSettings.targetLength,
      manualTrimPlan,
    };
    if (layoutSettings.fitMode === "force" && forcePlanOverride) {
      return { ...opts, renderPlan: forcePlanOverride };
    }
    return opts;
  }, [layoutSettings, manualTrimPlan, forcePlanOverride]);

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

  const handleExportPageMeasure = useCallback(
    ({ pagesUsed: used, overflows }: { contentHeight: number; pagesUsed: number; overflows: boolean }) => {
      setPagesUsed(used);
      if (layoutSettings.fitMode !== "force") return;
      if (!overflows) return;
      if (domTightenStepsRef.current >= MAX_DOM_TIGHTEN_STEPS) return;
      const sourceResume = normalizeResumeForRender(resume);
      const currentFull = model.layout.renderPlan;
      const next = cloneRenderPlanDeep(currentFull);
      const { applied } = tightenRenderPlanOneStep(sourceResume, next, sectionKeys);
      if (!applied) {
        setForceOptimizerExhausted(true);
        return;
      }
      domTightenStepsRef.current += 1;
      if (domTightenStepsRef.current >= MAX_DOM_TIGHTEN_STEPS) setForceOptimizerExhausted(true);
      setForcePlanOverride(next);
    },
    [resume, sectionKeys, layoutSettings.fitMode, model.layout.renderPlan],
  );

  const applySuggestion = useCallback(
    (id: string) => {
      setTrimUndoStack((stack) => [...stack, cloneRenderPlanDeep(manualTrimPlan)]);
      setManualTrimPlan((prev) => applyTrimSuggestion(normalizeResumeForRender(resume), prev, id));
    },
    [resume, manualTrimPlan],
  );

  const undoLastTrim = useCallback(() => {
    setTrimUndoStack((stack) => {
      if (!stack.length) return stack;
      const prev = stack[stack.length - 1];
      setManualTrimPlan(prev);
      return stack.slice(0, -1);
    });
  }, []);

  const resetLayoutTrims = useCallback(() => {
    setManualTrimPlan(cloneRenderPlan());
    setTrimUndoStack([]);
    setForcePlanOverride(null);
    domTightenStepsRef.current = 0;
  }, []);

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
          <button type="button" className="rounded border px-2 py-0.5 text-[10px]" onClick={() => onResumeChange({ ...resume, experience: [...resume.experience, { id: `exp-${resume.experience.length + 1}`, priority: "high", company: "", companySubtitle: "", title: "", dates: "", location: "", bullets: [] }] })}>Add Experience</button>
        </div>
        {resume.experience.map((exp, idx) => (
          <div key={exp.id ?? `exp-${idx}`} className="space-y-2 rounded border border-slate-200 bg-slate-50/60 p-2">
            <label className="flex items-center gap-2 text-[10px] font-medium text-slate-600">
              Priority
              <select
                className={cn(inputCls, "max-w-[120px] py-1 text-[11px]")}
                value={exp.priority ?? "high"}
                onChange={(e) =>
                  onResumeChange({
                    ...resume,
                    experience: resume.experience.map((x, i) =>
                      i === idx ? { ...x, priority: e.target.value as ResumeEntryPriority } : x,
                    ),
                  })
                }
              >
                {priorityOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
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
          <button type="button" className="rounded border px-2 py-0.5 text-[10px]" onClick={() => onResumeChange({ ...resume, projects: [...resume.projects, { id: `proj-${resume.projects.length + 1}`, priority: "high", name: "", subtitle: "", techStack: [], bullets: [] }] })}>Add Project</button>
        </div>
        {resume.projects.map((proj, idx) => (
          <div key={proj.id ?? `proj-${idx}`} className="space-y-2 rounded border border-slate-200 bg-slate-50/60 p-2">
            <label className="flex items-center gap-2 text-[10px] font-medium text-slate-600">
              Priority
              <select
                className={cn(inputCls, "max-w-[120px] py-1 text-[11px]")}
                value={proj.priority ?? "high"}
                onChange={(e) =>
                  onResumeChange({
                    ...resume,
                    projects: resume.projects.map((x, i) =>
                      i === idx ? { ...x, priority: e.target.value as ResumeEntryPriority } : x,
                    ),
                  })
                }
              >
                {priorityOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
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
              <select className={inputCls} value={edu.degreeType ?? "Other"} onChange={(e) => onResumeChange({ ...resume, education: resume.education.map((x, i) => i === idx ? { ...x, degreeType: e.target.value as (typeof degreeTypeOptions)[number] } : x) })}>
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

  return (
    <div ref={containerRef} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-white via-slate-50/40 to-slate-50/90">
      <div className="pointer-events-none fixed left-[-14000px] top-0 z-0 overflow-visible" aria-hidden>
        <ResumePreview
          resume={resume}
          template="ats-classic"
          variant="export"
          renderOptions={renderOptions}
          onExportPageMeasure={handleExportPageMeasure}
        />
      </div>
      <div className="shrink-0 space-y-3 border-b border-slate-200/70 bg-white/90 px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold text-slate-900">Resume Studio</h2>
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
        {layoutSettings.fitMode === "force" && forceOptimizerExhausted && pagesUsed != null && pagesUsed > layoutSettings.targetLength ? (
          <p className="text-[11px] font-semibold text-amber-800">⚠ Optimizer still cannot fit your target</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700"
            onClick={resetLayoutTrims}
          >
            Reset layout trims
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
                  <h3 className="text-[11px] font-semibold text-sky-950">Suggestions to fit your target</h3>
                  <ul className="mt-2 space-y-1.5">
                    {trimSuggestions.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 text-[10px] text-sky-950">
                        <span>
                          {s.label}
                          <span className="text-sky-700"> (−{s.savingsPages.toFixed(2)} pages)</span>
                        </span>
                        <button
                          type="button"
                          className="shrink-0 rounded border border-sky-300 bg-white px-2 py-0.5 text-[10px] font-semibold"
                          onClick={() => applySuggestion(s.id)}
                        >
                          Apply
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {omittedNotes.length > 0 ? (
                <section className="mb-3 rounded-lg border border-amber-200/90 bg-amber-50/80 p-3">
                  <h3 className="text-[11px] font-semibold text-amber-950">Applied layout trims (export only)</h3>
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
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={onExportDocx} className="rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-[12px] font-semibold text-indigo-950">Export DOCX</button>
                <button type="button" onClick={onExportPdf} className="rounded-lg border border-slate-300 bg-white py-2 text-[12px] font-semibold text-slate-800">Export PDF</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
