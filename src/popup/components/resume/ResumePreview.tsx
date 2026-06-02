import type { StructuredResume } from "../../../lib/types";
import {
  formatContactLine,
  formatEducationBlock,
  formatExperiencePrimary,
  formatExperienceSecondary,
  formatProjectPrimary,
  formatProjectSecondary,
  getVisibleResumeSections,
  normalizeResumeForRender,
} from "../../../lib/resumeRender";
import { cn } from "../../../lib/classNames";

type Props = {
  resume: StructuredResume;
  template?: "ats-classic";
  className?: string;
};

const shellClass = "rounded-xl border border-slate-300/80 bg-slate-200/50 p-3";
const pageClass =
  "mx-auto w-full max-w-[680px] min-h-[880px] rounded-[2px] border border-slate-300 bg-white px-[52px] py-[44px] shadow-[0_10px_30px_rgba(15,23,42,0.15)]";

function headerRule() {
  return <div className="mt-[2px] h-px w-full bg-slate-350" aria-hidden />;
}

export function ResumePreview({ resume, template = "ats-classic", className }: Props) {
  const r = normalizeResumeForRender(resume);
  const sections = getVisibleResumeSections(r);
  const contact = formatContactLine(r);

  return (
    <div className={cn(shellClass, className)}>
      <div className={cn(pageClass, template === "ats-classic" ? "font-[Inter,Source_Sans_Pro,Arial,sans-serif]" : "")}> 
        <header>
          <h2 className="text-center text-[26px] font-extrabold tracking-[-0.01em] text-slate-900">
            {r.contact.fullName || "Candidate Name"}
          </h2>
          {contact ? <p className="mt-1 text-center text-[10px] font-medium text-slate-700">{contact}</p> : null}
        </header>

        {sections.map((section) => (
          <section key={section.key} className="mt-[14px]">
            <h3 className="text-[10px] font-bold tracking-[0.22em] text-slate-700">{section.label}</h3>
            {headerRule()}

            {section.key === "summary" ? (
              <p className="mt-[6px] text-[11px] leading-[1.35] text-slate-800">{r.summary}</p>
            ) : null}

            {section.key === "experience" ? (
              <div className="mt-[6px] space-y-[8px]">
                {r.experience.map((e, i) => {
                  if (!e.company && !e.title && !e.bullets.length) return null;
                  const primary = formatExperiencePrimary(e.company, e.companySubtitle);
                  const secondary = formatExperienceSecondary(e.title, e.location, e.dates);
                  return (
                    <article key={e.id ?? `exp-${i}`}>
                      {primary ? <p className="text-[11px] font-semibold text-slate-900">{primary}</p> : null}
                      {secondary ? <p className="text-[10px] font-medium text-slate-700">{secondary}</p> : null}
                      <ul className="mt-[3px] list-disc space-y-[1px] pl-[18px] text-[10px] leading-[1.28] text-slate-800">
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
              <div className="mt-[6px] space-y-[8px]">
                {r.projects.map((p, i) => {
                  if (!p.name && !p.subtitle && !p.techStack.length && !p.bullets.length) return null;
                  const primary = formatProjectPrimary(p.name, p.subtitle);
                  const secondary = formatProjectSecondary(p.techStack);
                  return (
                    <article key={p.id ?? `proj-${i}`}>
                      {primary ? <p className="text-[11px] font-semibold text-slate-900">{primary}</p> : null}
                      {secondary ? <p className="text-[10px] font-medium text-slate-600">{secondary}</p> : null}
                      <ul className="mt-[3px] list-disc space-y-[1px] pl-[18px] text-[10px] leading-[1.28] text-slate-800">
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
              <div className="mt-[6px] space-y-[8px]">
                {r.education.map((e, i) => {
                  const lines = formatEducationBlock(e);
                  if (!lines.schoolLine && !lines.degreeLine && !lines.majorLine && !lines.gpaLine && !e.details.length) return null;
                  return (
                    <article key={e.id ?? `edu-${i}`}>
                      {lines.schoolLine ? <p className="text-[11px] font-semibold text-slate-900">{lines.schoolLine}</p> : null}
                      {lines.degreeLine ? <p className="text-[10px] text-slate-800">{lines.degreeLine}</p> : null}
                      {lines.majorLine ? <p className="text-[10px] text-slate-800">{lines.majorLine}</p> : null}
                      {lines.gpaLine ? <p className="text-[10px] text-slate-800">{lines.gpaLine}</p> : null}
                      {e.details.length ? (
                        <ul className="mt-[3px] list-disc space-y-[1px] pl-[18px] text-[10px] leading-[1.28] text-slate-800">
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
              <div className="mt-[6px] space-y-[3px]">
                {r.skills.map((s, i) => {
                  if (!s.category && !s.items.length) return null;
                  return (
                    <p key={s.id ?? `skills-${i}`} className="text-[10px] leading-[1.3] text-slate-800">
                      <span className="font-semibold text-slate-900">{s.category || "Skills"}:</span> {s.items.join(", ")}
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
