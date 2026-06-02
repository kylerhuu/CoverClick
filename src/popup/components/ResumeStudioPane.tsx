import { useMemo } from "react";
import type { ResumeOptimizeForJobResponse, StructuredResume } from "../../lib/types";
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

function splitLines(v: string): string[] {
  return v
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinLines(v: string[]): string {
  return v.join("\n");
}

function ResumePreview({ resume }: { resume: StructuredResume }) {
  const contactLine = useMemo(
    () =>
      [
        resume.contact.email.trim(),
        resume.contact.phone.trim(),
        resume.contact.location.trim(),
        ...resume.contact.links,
      ]
        .filter(Boolean)
        .join(" · "),
    [resume.contact],
  );

  const firstExp = resume.experience[0];
  const firstProj = resume.projects[0];
  const firstEdu = resume.education[0];

  return (
    <div
      className="rounded-lg border border-slate-200/90 bg-white px-4 py-3 shadow-sm"
      aria-label="Resume preview"
    >
      <p className="text-center text-[14px] font-bold tracking-tight text-slate-900">
        {resume.contact.fullName.trim() || "Your name"}
      </p>
      {contactLine ? (
        <p className="mt-1 text-center text-[10px] text-slate-600">{contactLine}</p>
      ) : (
        <p className="mt-1 text-center text-[10px] italic text-slate-400">Contact details</p>
      )}

      {resume.summary.trim() ? (
        <div className="mt-3">
          <p className="border-b border-slate-300 pb-0.5 text-[9px] font-bold tracking-widest text-slate-700">
            SUMMARY
          </p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-slate-700">{resume.summary}</p>
        </div>
      ) : null}

      {firstExp && (firstExp.title.trim() || firstExp.company.trim() || firstExp.bullets.length) ? (
        <div className="mt-3">
          <p className="border-b border-slate-300 pb-0.5 text-[9px] font-bold tracking-widest text-slate-700">
            EXPERIENCE
          </p>
          <p className="mt-1.5 text-[10px] font-semibold text-slate-800">
            {[firstExp.title, firstExp.company].filter(Boolean).join(" — ") || "Experience"}
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10px] text-slate-700">
            {firstExp.bullets.slice(0, 4).map((b, i) => (
              <li key={`exp-b-${i}`}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {firstProj && firstProj.bullets.length ? (
        <div className="mt-3">
          <p className="border-b border-slate-300 pb-0.5 text-[9px] font-bold tracking-widest text-slate-700">
            PROJECTS
          </p>
          <p className="mt-1.5 text-[10px] font-semibold text-slate-800">{firstProj.name || "Projects"}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10px] text-slate-700">
            {firstProj.bullets.slice(0, 3).map((b, i) => (
              <li key={`proj-b-${i}`}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {firstEdu && (firstEdu.school.trim() || firstEdu.degree.trim()) ? (
        <div className="mt-3">
          <p className="border-b border-slate-300 pb-0.5 text-[9px] font-bold tracking-widest text-slate-700">
            EDUCATION
          </p>
          <p className="mt-1.5 text-[10px] text-slate-800">
            {[firstEdu.school, firstEdu.degree, firstEdu.dates].filter(Boolean).join(" · ")}
          </p>
        </div>
      ) : null}

      {resume.skills[0]?.items.length ? (
        <div className="mt-3">
          <p className="border-b border-slate-300 pb-0.5 text-[9px] font-bold tracking-widest text-slate-700">
            SKILLS
          </p>
          <p className="mt-1.5 text-[10px] text-slate-700">{resume.skills[0].items.join(", ")}</p>
        </div>
      ) : null}

      <p className="mt-3 text-center text-[9px] text-slate-400">One-column ATS layout · export matches this style</p>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="border-b border-slate-200/90 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
      {children}
    </h3>
  );
}

const actionBtn = cn(
  "rounded-lg border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50",
  "outline-none transition focus:ring-2 focus:ring-indigo-500/20",
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
}: Props) {
  const inputCls = cn(
    "min-w-0 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-900 shadow-sm",
    "outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/15",
  );
  const textCls = cn(
    "min-h-[72px] w-full rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-[12px] text-slate-900 shadow-sm",
    "outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/15",
  );

  const firstExperience = useMemo(
    () =>
      resume.experience[0] ?? {
        id: "exp-1",
        company: "",
        title: "",
        dates: "",
        location: "",
        bullets: [],
      },
    [resume.experience],
  );

  const linkLine = resume.contact.links.join("\n");

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-gradient-to-b from-white via-slate-50/40 to-slate-50/90">
      <div className="shrink-0 border-b border-slate-200/70 bg-white/90 px-4 py-3">
        <h2 className="text-[13px] font-semibold text-slate-900">Resume Studio</h2>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Start from your CoverClick profile, refine sections, and export a clean ATS resume.
        </p>
      </div>

      <div className="shrink-0 space-y-2 border-b border-slate-200/60 bg-white/80 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onImportFromProfile}
            className={cn(actionBtn, "border-slate-200/90 bg-white text-slate-900 hover:border-indigo-200 hover:bg-indigo-50/60")}
          >
            Import from Profile
          </button>
          <button
            type="button"
            onClick={onGenerateSummary}
            disabled={summaryBusy}
            className={cn(actionBtn, "border-indigo-200/90 bg-indigo-50 text-indigo-950")}
          >
            {summaryBusy ? "Generating…" : "Generate Summary"}
          </button>
          <button
            type="button"
            onClick={onOptimizeForJob}
            disabled={!jobAvailable || optimizeBusy}
            className={cn(actionBtn, "border-sky-200/90 bg-sky-50 text-sky-950")}
            title={jobAvailable ? "Use currently scraped job" : "Scrape a job posting first"}
          >
            {optimizeBusy ? "Optimizing…" : "Optimize for This Job"}
          </button>
        </div>
        <input
          className={inputCls}
          placeholder="Target role (optional — used for summary & export naming)"
          value={targetRole}
          onChange={(e) => onTargetRoleChange(e.target.value)}
        />
        {!jobAvailable ? (
          <p className="text-[10px] text-slate-500">Scrape a job posting to enable optimization.</p>
        ) : null}
        {summaryError ? <p className="text-[11px] text-red-700">{summaryError}</p> : null}
        {optimizeError ? <p className="text-[11px] text-red-700">{optimizeError}</p> : null}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Preview</p>
          <ResumePreview resume={resume} />
        </div>

        {optimizeResult ? (
          <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Optimization</h3>
            <p className="text-[11px] text-slate-700">{optimizeResult.summary}</p>
            {optimizeResult.keywordsToAdd.length ? (
              <div>
                <p className="text-[10px] font-semibold text-slate-700">Keywords to add</p>
                <p className="text-[10px] text-slate-600">{optimizeResult.keywordsToAdd.join(" · ")}</p>
              </div>
            ) : null}
            {optimizeResult.warnings.length ? (
              <div>
                <p className="text-[10px] font-semibold text-amber-700">Warnings</p>
                <ul className="list-disc pl-4 text-[10px] text-amber-700">
                  {optimizeResult.warnings.map((w, i) => (
                    <li key={`warn-${i}`}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="space-y-2">
              {optimizeResult.suggestions.map((s) => {
                const decision = suggestionDecisions[s.id] ?? "pending";
                if (decision === "rejected") return null;
                return (
                  <div key={s.id} className="rounded-md border border-slate-200 bg-slate-50/80 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {s.section} · {s.changeType} · {s.priority}
                      </p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => onAcceptSuggestion(s.id)}
                          disabled={decision === "accepted"}
                          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 disabled:opacity-60"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => onRejectSuggestion(s.id)}
                          className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-800"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-600">
                      <span className="font-semibold text-slate-700">Current:</span> {s.currentText || "(none)"}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-600">
                      <span className="font-semibold text-slate-700">Suggested:</span> {s.suggestedText}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">{s.reason}</p>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="space-y-2">
          <SectionTitle>Contact</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputCls}
              placeholder="Full name"
              value={resume.contact.fullName}
              onChange={(e) => onResumeChange({ ...resume, contact: { ...resume.contact, fullName: e.target.value } })}
            />
            <input
              className={inputCls}
              placeholder="Email"
              value={resume.contact.email}
              onChange={(e) => onResumeChange({ ...resume, contact: { ...resume.contact, email: e.target.value } })}
            />
            <input
              className={inputCls}
              placeholder="Phone"
              value={resume.contact.phone}
              onChange={(e) => onResumeChange({ ...resume, contact: { ...resume.contact, phone: e.target.value } })}
            />
            <input
              className={inputCls}
              placeholder="Location"
              value={resume.contact.location}
              onChange={(e) => onResumeChange({ ...resume, contact: { ...resume.contact, location: e.target.value } })}
            />
          </div>
          <input
            className={inputCls}
            placeholder="LinkedIn / portfolio (one per line)"
            value={linkLine}
            onChange={(e) =>
              onResumeChange({
                ...resume,
                contact: {
                  ...resume.contact,
                  links: splitLines(e.target.value),
                },
              })
            }
          />
        </section>

        <section className="space-y-2">
          <SectionTitle>Summary</SectionTitle>
          <textarea
            className={textCls}
            placeholder="Professional summary"
            value={resume.summary}
            onChange={(e) => onResumeChange({ ...resume, summary: e.target.value })}
          />
        </section>

        <section className="space-y-2">
          <SectionTitle>Experience</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputCls}
              placeholder="Title"
              value={firstExperience.title}
              onChange={(e) =>
                onResumeChange({
                  ...resume,
                  experience: [{ ...firstExperience, title: e.target.value }, ...resume.experience.slice(1)],
                })
              }
            />
            <input
              className={inputCls}
              placeholder="Company"
              value={firstExperience.company}
              onChange={(e) =>
                onResumeChange({
                  ...resume,
                  experience: [{ ...firstExperience, company: e.target.value }, ...resume.experience.slice(1)],
                })
              }
            />
            <input
              className={inputCls}
              placeholder="Dates"
              value={firstExperience.dates}
              onChange={(e) =>
                onResumeChange({
                  ...resume,
                  experience: [{ ...firstExperience, dates: e.target.value }, ...resume.experience.slice(1)],
                })
              }
            />
            <input
              className={inputCls}
              placeholder="Location"
              value={firstExperience.location}
              onChange={(e) =>
                onResumeChange({
                  ...resume,
                  experience: [{ ...firstExperience, location: e.target.value }, ...resume.experience.slice(1)],
                })
              }
            />
          </div>
          <textarea
            className={textCls}
            placeholder="Experience bullets (one per line)"
            value={joinLines(firstExperience.bullets)}
            onChange={(e) =>
              onResumeChange({
                ...resume,
                experience: [{ ...firstExperience, bullets: splitLines(e.target.value) }, ...resume.experience.slice(1)],
              })
            }
          />
        </section>

        <section className="space-y-2">
          <SectionTitle>Projects</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputCls}
              placeholder="Project name"
              value={resume.projects[0]?.name ?? ""}
              onChange={(e) =>
                onResumeChange({
                  ...resume,
                  projects: [
                    {
                      id: resume.projects[0]?.id ?? "proj-1",
                      name: e.target.value,
                      role: resume.projects[0]?.role ?? "",
                      dates: resume.projects[0]?.dates ?? "",
                      bullets: resume.projects[0]?.bullets ?? [],
                    },
                    ...resume.projects.slice(1),
                  ],
                })
              }
            />
            <input
              className={inputCls}
              placeholder="Your role"
              value={resume.projects[0]?.role ?? ""}
              onChange={(e) =>
                onResumeChange({
                  ...resume,
                  projects: [
                    {
                      id: resume.projects[0]?.id ?? "proj-1",
                      name: resume.projects[0]?.name ?? "Project",
                      role: e.target.value,
                      dates: resume.projects[0]?.dates ?? "",
                      bullets: resume.projects[0]?.bullets ?? [],
                    },
                    ...resume.projects.slice(1),
                  ],
                })
              }
            />
          </div>
          <textarea
            className={textCls}
            placeholder="Project bullets (one per line)"
            value={joinLines(resume.projects[0]?.bullets ?? [])}
            onChange={(e) =>
              onResumeChange({
                ...resume,
                projects: [
                  {
                    id: resume.projects[0]?.id ?? "proj-1",
                    name: resume.projects[0]?.name ?? "Project",
                    role: resume.projects[0]?.role ?? "",
                    dates: resume.projects[0]?.dates ?? "",
                    bullets: splitLines(e.target.value),
                  },
                  ...resume.projects.slice(1),
                ],
              })
            }
          />
        </section>

        <section className="space-y-2">
          <SectionTitle>Education</SectionTitle>
          <input
            className={inputCls}
            placeholder="School | Degree | Dates"
            value={[resume.education[0]?.school ?? "", resume.education[0]?.degree ?? "", resume.education[0]?.dates ?? ""]
              .filter(Boolean)
              .join(" | ")}
            onChange={(e) => {
              const parts = e.target.value.split("|").map((p) => p.trim());
              onResumeChange({
                ...resume,
                education: [
                  {
                    id: resume.education[0]?.id ?? "edu-1",
                    school: parts[0] ?? "",
                    degree: parts[1] ?? "",
                    dates: parts[2] ?? "",
                    details: resume.education[0]?.details ?? [],
                  },
                  ...resume.education.slice(1),
                ],
              });
            }}
          />
        </section>

        <section className="space-y-2">
          <SectionTitle>Skills</SectionTitle>
          <textarea
            className={textCls}
            placeholder="Comma-separated skills"
            value={(resume.skills[0]?.items ?? []).join(", ")}
            onChange={(e) =>
              onResumeChange({
                ...resume,
                skills: [
                  {
                    id: resume.skills[0]?.id ?? "skills-1",
                    category: resume.skills[0]?.category || "Core Skills",
                    items: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                ],
              })
            }
          />
        </section>
      </div>

      <div className="shrink-0 border-t border-slate-200/70 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onExportDocx}
          className="w-full rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-[12px] font-semibold text-indigo-950"
        >
          Export ATS Resume (DOCX)
        </button>
      </div>
    </div>
  );
}
