import type { StructuredResume } from "../../../lib/types";
import { formatContactLine, formatEducationLine, getVisibleResumeSections, normalizeResumeForRender } from "../../../lib/resumeRender";
import { cn } from "../../../lib/classNames";

type Props = {
  resume: StructuredResume;
  template?: "ats-classic";
  className?: string;
};

const pageClass =
  "mx-auto w-full max-w-[680px] rounded-sm border border-slate-300 bg-white p-[40px] text-slate-900 shadow-[0_6px_16px_rgba(15,23,42,0.12)]";

function headerRule() {
  return <div className="mt-0.5 h-px w-full bg-slate-300" aria-hidden />;
}

export function ResumePreview({ resume, template = "ats-classic", className }: Props) {
  const r = normalizeResumeForRender(resume);
  const sections = getVisibleResumeSections(r);
  const contact = formatContactLine(r);

  return (
    <div className={cn("rounded-xl border border-slate-200/80 bg-slate-100/60 p-3", className)}>
      <div className={cn(pageClass, template === "ats-classic" ? "font-[Calibri,Arial,sans-serif]" : "")}> 
        <header>
          <h2 className="text-center text-[22px] font-bold tracking-tight">{r.contact.fullName || "Candidate Name"}</h2>
          {contact ? <p className="mt-1 text-center text-[11px] text-slate-700">{contact}</p> : null}
        </header>

        {sections.map((section) => (
          <section key={section.key} className="mt-4">
            <h3 className="text-[10px] font-bold tracking-[0.18em] text-slate-700">{section.label}</h3>
            {headerRule()}

            {section.key === "summary" ? (
              <p className="mt-1.5 text-[11px] leading-[1.35]">{r.summary}</p>
            ) : null}

            {section.key === "experience" ? (
              <div className="mt-1.5 space-y-2">
                {r.experience.map((e, i) => {
                  if (!e.company && !e.title && !e.bullets.length) return null;
                  return (
                    <article key={e.id ?? `exp-${i}`}>
                      <p className="text-[11px] font-semibold">{[e.company, e.companySubtitle ?? ""].filter(Boolean).join(" — ")}</p>
                      <p className="text-[10px] italic text-slate-700">{[e.title, [e.location, e.dates].filter(Boolean).join(" | ")].filter(Boolean).join(" | ")}</p>
                      <ul className="mt-1 list-disc space-y-[2px] pl-4 text-[10px] leading-[1.3]">
                        {e.bullets.map((b, bi) => (
                          <li key={`exp-b-${bi}`}>{b}</li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {section.key === "projects" ? (
              <div className="mt-1.5 space-y-2">
                {r.projects.map((p, i) => {
                  if (!p.name && !p.subtitle && !p.techStack.length && !p.bullets.length) return null;
                  return (
                    <article key={p.id ?? `proj-${i}`}>
                      <p className="text-[11px] font-semibold">{[p.name, p.subtitle].filter(Boolean).join(" — ")}</p>
                      {p.techStack.length ? <p className="text-[10px] italic text-slate-700">{p.techStack.join(" • ")}</p> : null}
                      <ul className="mt-1 list-disc space-y-[2px] pl-4 text-[10px] leading-[1.3]">
                        {p.bullets.map((b, bi) => (
                          <li key={`proj-b-${bi}`}>{b}</li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {section.key === "education" ? (
              <div className="mt-1.5 space-y-2">
                {r.education.map((e, i) => {
                  const lines = formatEducationLine(e);
                  if (!lines.schoolLine && !lines.degreeLine && !lines.gpaLine && !e.details.length) return null;
                  return (
                    <article key={e.id ?? `edu-${i}`}>
                      {lines.schoolLine ? <p className="text-[11px] font-semibold">{lines.schoolLine}</p> : null}
                      {lines.degreeLine ? <p className="text-[10px] text-slate-800">{lines.degreeLine}</p> : null}
                      {lines.gpaLine ? <p className="text-[10px] text-slate-800">{lines.gpaLine}</p> : null}
                      {e.details.length ? (
                        <ul className="mt-1 list-disc space-y-[2px] pl-4 text-[10px] leading-[1.3]">
                          {e.details.map((d, di) => (
                            <li key={`edu-d-${di}`}>{d}</li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : null}

            {section.key === "skills" ? (
              <div className="mt-1.5 space-y-1">
                {r.skills.map((s, i) => {
                  if (!s.category && !s.items.length) return null;
                  return (
                    <p key={s.id ?? `skills-${i}`} className="text-[10px] leading-[1.35]">
                      <span className="font-semibold">{s.category || "Skills"}:</span> {s.items.join(", ")}
                    </p>
                  );
                })}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
