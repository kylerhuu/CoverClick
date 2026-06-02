import type { ResumeSectionKey, ResumeOptimizeForJobResponse, StructuredResume } from "../../lib/types";
import { cn } from "../../lib/classNames";

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

function inputClass() {
  return cn(
    "min-w-0 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-900 shadow-sm",
    "outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/15",
  );
}

function textClass() {
  return cn(
    "min-h-[72px] w-full rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-[12px] text-slate-900 shadow-sm",
    "outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/15",
  );
}

function sectionVisible(resume: StructuredResume, key: ResumeSectionKey): boolean {
  return resume.sectionSettings[key]?.isVisible !== false;
}

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
}: Props) {
  const inputCls = inputClass();
  const textCls = textClass();

  const orderedSections = [...sectionMeta].sort(
    (a, b) => (resume.sectionSettings[a.key]?.order ?? 0) - (resume.sectionSettings[b.key]?.order ?? 0),
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-gradient-to-b from-white via-slate-50/40 to-slate-50/90">
      <div className="shrink-0 border-b border-slate-200/70 bg-white/90 px-4 py-3">
        <h2 className="text-[13px] font-semibold text-slate-900">Resume Studio</h2>
        <p className="mt-0.5 text-[11px] text-slate-500">Use what you already gave CoverClick and format it into a real resume.</p>
      </div>

      <div className="shrink-0 space-y-2 border-b border-slate-200/60 bg-white/80 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onImportFromProfile} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold">Import from Profile</button>
          <button type="button" onClick={onGenerateSummary} disabled={summaryBusy} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-950 disabled:opacity-50">{summaryBusy ? "Generating…" : "Generate Summary"}</button>
          <button type="button" onClick={onOptimizeForJob} disabled={!jobAvailable || optimizeBusy} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-950 disabled:opacity-50">{optimizeBusy ? "Optimizing…" : "Optimize for This Job"}</button>
        </div>
        <input className={inputCls} placeholder="Target role (optional)" value={targetRole} onChange={(e) => onTargetRoleChange(e.target.value)} />
        {summaryError ? <p className="text-[11px] text-red-700">{summaryError}</p> : null}
        {optimizeError ? <p className="text-[11px] text-red-700">{optimizeError}</p> : null}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Section visibility & order</h3>
          {orderedSections.map((s, idx) => (
            <div key={s.key} className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-[11px] text-slate-700">
                <input
                  type="checkbox"
                  checked={sectionVisible(resume, s.key)}
                  onChange={(e) => onResumeChange({
                    ...resume,
                    sectionSettings: {
                      ...resume.sectionSettings,
                      [s.key]: { ...resume.sectionSettings[s.key], isVisible: e.target.checked },
                    },
                  })}
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

        <section className="space-y-2">
          <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">Contact</h3>
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Full name" value={resume.contact.fullName} onChange={(e) => onResumeChange({ ...resume, contact: { ...resume.contact, fullName: e.target.value } })} />
            <input className={inputCls} placeholder="Email" value={resume.contact.email} onChange={(e) => onResumeChange({ ...resume, contact: { ...resume.contact, email: e.target.value } })} />
            <input className={inputCls} placeholder="Phone" value={resume.contact.phone} onChange={(e) => onResumeChange({ ...resume, contact: { ...resume.contact, phone: e.target.value } })} />
            <input className={inputCls} placeholder="Location" value={resume.contact.location} onChange={(e) => onResumeChange({ ...resume, contact: { ...resume.contact, location: e.target.value } })} />
          </div>
          <textarea className={textCls} placeholder="Links (one per line)" value={joinLines(resume.contact.links)} onChange={(e) => onResumeChange({ ...resume, contact: { ...resume.contact, links: splitLines(e.target.value) } })} />
        </section>

        <section className="space-y-2">
          <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">Summary</h3>
          <textarea className={textCls} placeholder="Professional summary" value={resume.summary} onChange={(e) => onResumeChange({ ...resume, summary: e.target.value })} />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Experience</h3>
            <button type="button" className="rounded border px-2 py-0.5 text-[10px]" onClick={() => onResumeChange({ ...resume, experience: [...resume.experience, { id: `exp-${resume.experience.length + 1}`, company: "", companySubtitle: "", title: "", dates: "", location: "", bullets: [] }] })}>Add Experience</button>
          </div>
          {resume.experience.map((exp, idx) => (
            <div key={exp.id ?? `exp-${idx}`} className="space-y-2 rounded border border-slate-200 bg-white p-2">
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} placeholder="Company" value={exp.company} onChange={(e) => onResumeChange({ ...resume, experience: resume.experience.map((x, i) => i === idx ? { ...x, company: e.target.value } : x) })} />
                <input className={inputCls} placeholder="Company subtitle (optional)" value={exp.companySubtitle ?? ""} onChange={(e) => onResumeChange({ ...resume, experience: resume.experience.map((x, i) => i === idx ? { ...x, companySubtitle: e.target.value } : x) })} />
                <input className={inputCls} placeholder="Role / title" value={exp.title} onChange={(e) => onResumeChange({ ...resume, experience: resume.experience.map((x, i) => i === idx ? { ...x, title: e.target.value } : x) })} />
                <input className={inputCls} placeholder="Dates" value={exp.dates} onChange={(e) => onResumeChange({ ...resume, experience: resume.experience.map((x, i) => i === idx ? { ...x, dates: e.target.value } : x) })} />
                <input className={inputCls} placeholder="Location (optional)" value={exp.location} onChange={(e) => onResumeChange({ ...resume, experience: resume.experience.map((x, i) => i === idx ? { ...x, location: e.target.value } : x) })} />
              </div>
              <textarea className={textCls} placeholder="Bullets (one per line)" value={joinLines(exp.bullets)} onChange={(e) => onResumeChange({ ...resume, experience: resume.experience.map((x, i) => i === idx ? { ...x, bullets: splitLines(e.target.value) } : x) })} />
              <button type="button" className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700" onClick={() => onResumeChange({ ...resume, experience: resume.experience.filter((_, i) => i !== idx) })}>Remove entry</button>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Projects</h3>
            <button type="button" className="rounded border px-2 py-0.5 text-[10px]" onClick={() => onResumeChange({ ...resume, projects: [...resume.projects, { id: `proj-${resume.projects.length + 1}`, name: "", subtitle: "", techStack: [], bullets: [] }] })}>Add Project</button>
          </div>
          {resume.projects.map((proj, idx) => (
            <div key={proj.id ?? `proj-${idx}`} className="space-y-2 rounded border border-slate-200 bg-white p-2">
              <input className={inputCls} placeholder="Project name" value={proj.name} onChange={(e) => onResumeChange({ ...resume, projects: resume.projects.map((x, i) => i === idx ? { ...x, name: e.target.value } : x) })} />
              <input className={inputCls} placeholder="Subtitle / description" value={proj.subtitle} onChange={(e) => onResumeChange({ ...resume, projects: resume.projects.map((x, i) => i === idx ? { ...x, subtitle: e.target.value } : x) })} />
              <input className={inputCls} placeholder="Tech stack (comma-separated)" value={proj.techStack.join(", ")} onChange={(e) => onResumeChange({ ...resume, projects: resume.projects.map((x, i) => i === idx ? { ...x, techStack: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : x) })} />
              <textarea className={textCls} placeholder="Bullets (one per line)" value={joinLines(proj.bullets)} onChange={(e) => onResumeChange({ ...resume, projects: resume.projects.map((x, i) => i === idx ? { ...x, bullets: splitLines(e.target.value) } : x) })} />
              <button type="button" className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700" onClick={() => onResumeChange({ ...resume, projects: resume.projects.filter((_, i) => i !== idx) })}>Remove entry</button>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Education</h3>
            <button type="button" className="rounded border px-2 py-0.5 text-[10px]" onClick={() => onResumeChange({ ...resume, education: [...resume.education, { id: `edu-${resume.education.length + 1}`, school: "", degreeType: "Other", degree: "", major: "", concentrationOrMinor: "", gpa: "", graduationDate: "", details: [] }] })}>Add Education</button>
          </div>
          {resume.education.map((edu, idx) => (
            <div key={edu.id ?? `edu-${idx}`} className="space-y-2 rounded border border-slate-200 bg-white p-2">
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} placeholder="School" value={edu.school} onChange={(e) => onResumeChange({ ...resume, education: resume.education.map((x, i) => i === idx ? { ...x, school: e.target.value } : x) })} />
                <input className={inputCls} placeholder="Graduation date" value={edu.graduationDate} onChange={(e) => onResumeChange({ ...resume, education: resume.education.map((x, i) => i === idx ? { ...x, graduationDate: e.target.value } : x) })} />
                <select
                  className={inputCls}
                  value={edu.degreeType ?? "Other"}
                  onChange={(e) => onResumeChange({ ...resume, education: resume.education.map((x, i) => i === idx ? { ...x, degreeType: e.target.value as (typeof degreeTypeOptions)[number] } : x) })}
                >
                  {degreeTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
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

        <section className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Skills</h3>
            <button type="button" className="rounded border px-2 py-0.5 text-[10px]" onClick={() => onResumeChange({ ...resume, skills: [...resume.skills, { id: `skills-${resume.skills.length + 1}`, category: "", items: [] }] })}>Add Skill Category</button>
          </div>
          {resume.skills.map((sg, idx) => (
            <div key={sg.id ?? `skills-${idx}`} className="space-y-2 rounded border border-slate-200 bg-white p-2">
              <input className={inputCls} placeholder="Category (e.g. Programming)" value={sg.category} onChange={(e) => onResumeChange({ ...resume, skills: resume.skills.map((x, i) => i === idx ? { ...x, category: e.target.value } : x) })} />
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

      <div className="shrink-0 border-t border-slate-200/70 bg-white px-4 py-3">
        <button type="button" onClick={onExportDocx} className="w-full rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-[12px] font-semibold text-indigo-950">Export ATS Resume DOCX</button>
      </div>
    </div>
  );
}
