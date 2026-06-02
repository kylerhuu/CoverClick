import { useMemo } from "react";
import type { StructuredResume } from "../../lib/types";
import { cn } from "../../lib/classNames";

type Props = {
  resume: StructuredResume;
  targetRole: string;
  summaryBusy: boolean;
  summaryError: string | null;
  onTargetRoleChange: (value: string) => void;
  onResumeChange: (next: StructuredResume) => void;
  onGenerateSummary: () => void;
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

export function ResumeStudioPane({
  resume,
  targetRole,
  summaryBusy,
  summaryError,
  onTargetRoleChange,
  onResumeChange,
  onGenerateSummary,
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
        company: "",
        title: "",
        dates: "",
        location: "",
        bullets: [],
      },
    [resume.experience],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-gradient-to-b from-white via-slate-50/40 to-slate-50/90">
      <div className="shrink-0 border-b border-slate-200/70 bg-white/90 px-4 py-3">
        <h2 className="text-[13px] font-semibold text-slate-900">Resume Studio (Auto Mode)</h2>
        <p className="mt-0.5 text-[11px] text-slate-500">Create a clean ATS-friendly resume. Formatting is handled automatically.</p>
      </div>

      <div className="shrink-0 space-y-2 border-b border-slate-200/60 bg-white/70 px-4 py-3">
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

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            className={inputCls}
            placeholder="Target role (optional)"
            value={targetRole}
            onChange={(e) => onTargetRoleChange(e.target.value)}
          />
          <button
            type="button"
            onClick={onGenerateSummary}
            disabled={summaryBusy}
            className="rounded-lg border border-indigo-200/90 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-950 disabled:opacity-50"
          >
            {summaryBusy ? "Generating…" : "Generate Summary"}
          </button>
        </div>
        {summaryError ? <p className="text-[11px] text-red-700">{summaryError}</p> : null}

        <textarea
          className={textCls}
          placeholder="Professional summary"
          value={resume.summary}
          onChange={(e) => onResumeChange({ ...resume, summary: e.target.value })}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <section className="space-y-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Experience</h3>
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
          </div>
          <textarea
            className={textCls}
            placeholder={"Experience bullets (one per line)"}
            value={joinLines(firstExperience.bullets)}
            onChange={(e) =>
              onResumeChange({
                ...resume,
                experience: [{ ...firstExperience, bullets: splitLines(e.target.value) }, ...resume.experience.slice(1)],
              })
            }
          />
        </section>

        <section className="space-y-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Projects</h3>
          <textarea
            className={textCls}
            placeholder="Project bullets (one per line)"
            value={joinLines(resume.projects[0]?.bullets ?? [])}
            onChange={(e) =>
              onResumeChange({
                ...resume,
                projects: [
                  {
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

        <section className="space-y-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Education</h3>
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
                  { school: parts[0] ?? "", degree: parts[1] ?? "", dates: parts[2] ?? "", details: resume.education[0]?.details ?? [] },
                  ...resume.education.slice(1),
                ],
              });
            }}
          />
        </section>

        <section className="space-y-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Skills</h3>
          <textarea
            className={textCls}
            placeholder="Comma-separated skills"
            value={(resume.skills[0]?.items ?? []).join(", ")}
            onChange={(e) =>
              onResumeChange({
                ...resume,
                skills: [{ category: resume.skills[0]?.category || "Core Skills", items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }],
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
