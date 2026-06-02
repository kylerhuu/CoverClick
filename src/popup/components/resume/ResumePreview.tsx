import type { StructuredResume } from "../../../lib/types";
import {
  chooseResumeSpacingProfile,
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
  return <div className="mt-[2px] h-px w-full bg-slate-400/70" aria-hidden />;
}

export function ResumePreview({ resume, template = "ats-classic", className }: Props) {
  const r = normalizeResumeForRender(resume);
  const sections = getVisibleResumeSections(r);
  const contact = formatContactLine(r);
  const spacing = chooseResumeSpacingProfile(r);

  return (
    <div className={cn(shellClass, className)}>
      <div className={cn(pageClass, template === "ats-classic" ? "font-[Inter,system-ui,Segoe_UI,Arial,sans-serif]" : "")}> 
        <header>
          <h2 className="text-center text-[26px] font-extrabold tracking-[-0.01em] text-slate-900">
            {r.contact.fullName || "Candidate Name"}
          </h2>
          {contact ? <p className="mt-1 text-center text-[10px] font-medium text-slate-700">{contact}</p> : null}
        </header>

        {sections.map((section) => (
          <section key={section.key} style={{ marginTop: `${spacing.sectionGap}px` }}>
            <h3 className="text-[10px] font-bold tracking-[0.18em] text-slate-700">{section.label}</h3>
            {headerRule()}

            {section.key === "summary" ? (
              <p className="text-[11px] text-slate-800" style={{ marginTop: `${spacing.sectionHeaderAfter}px`, lineHeight: spacing.bulletLineHeight }}>
                {r.summary}
              </p>
            ) : null}

            {section.key === "experience" ? (
              <div style={{ marginTop: `${spacing.sectionHeaderAfter}px` }}>
                {r.experience.map((e, i) => {
                  if (!e.company && !e.title && !e.bullets.length) return null;
                  const primary = formatExperiencePrimary(e.company, e.companySubtitle);
                  const secondary = formatExperienceSecondary(e.title, e.location, e.dates);
                  return (
                    <article key={e.id ?? `exp-${i}`} style={{ marginBottom: `${spacing.entryGap}px` }}>
                      {primary ? <p className="text-[11px] font-semibold text-slate-900">{primary}</p> : null}
                      {secondary ? <p className="text-[10px] font-medium text-slate-700" style={{ marginTop: `${spacing.subLineGap}px` }}>{secondary}</p> : null}
                      <ul className="list-disc pl-[18px] text-[10px] text-slate-800" style={{ marginTop: `${spacing.subLineGap + 1}px`, lineHeight: spacing.bulletLineHeight }}>
                        {e.bullets.map((b, bi) => (
                          <li key={`exp-b-${bi}`} style={{ marginBottom: `${spacing.bulletGap}px` }}>{b}</li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {section.key === "projects" ? (
              <div style={{ marginTop: `${spacing.sectionHeaderAfter}px` }}>
                {r.projects.map((p, i) => {
                  if (!p.name && !p.subtitle && !p.techStack.length && !p.bullets.length) return null;
                  const primary = formatProjectPrimary(p.name, p.subtitle);
                  const secondary = formatProjectSecondary(p.techStack);
                  return (
                    <article key={p.id ?? `proj-${i}`} style={{ marginBottom: `${spacing.entryGap}px` }}>
                      {primary ? <p className="text-[11px] font-semibold text-slate-900">{primary}</p> : null}
                      {secondary ? <p className="text-[10px] font-medium text-slate-600" style={{ marginTop: `${Math.max(1, spacing.subLineGap - 1)}px` }}>{secondary}</p> : null}
                      <ul className="list-disc pl-[18px] text-[10px] text-slate-800" style={{ marginTop: `${spacing.subLineGap + 1}px`, lineHeight: spacing.bulletLineHeight }}>
                        {p.bullets.map((b, bi) => (
                          <li key={`proj-b-${bi}`} style={{ marginBottom: `${spacing.bulletGap}px` }}>{b}</li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {section.key === "education" ? (
              <div style={{ marginTop: `${spacing.sectionHeaderAfter}px` }}>
                {r.education.map((e, i) => {
                  const lines = formatEducationBlock(e);
                  if (!lines.schoolLine && !lines.degreeLine && !lines.majorLine && !lines.gpaLine && !e.details.length) return null;
                  return (
                    <article key={e.id ?? `edu-${i}`} style={{ marginBottom: `${spacing.entryGap}px` }}>
                      {lines.schoolLine ? <p className="text-[11px] font-semibold text-slate-900">{lines.schoolLine}</p> : null}
                      {lines.degreeLine ? <p className="text-[10px] text-slate-800" style={{ marginTop: `${spacing.subLineGap}px` }}>{lines.degreeLine}</p> : null}
                      {lines.majorLine ? <p className="text-[10px] text-slate-800" style={{ marginTop: `${Math.max(1, spacing.subLineGap - 1)}px` }}>{lines.majorLine}</p> : null}
                      {lines.gpaLine ? <p className="text-[10px] text-slate-800" style={{ marginTop: `${Math.max(1, spacing.subLineGap - 1)}px` }}>{lines.gpaLine}</p> : null}
                      {e.details.length ? (
                        <ul className="list-disc pl-[18px] text-[10px] text-slate-800" style={{ marginTop: `${spacing.subLineGap + 1}px`, lineHeight: spacing.bulletLineHeight }}>
                          {e.details.map((d, di) => (
                            <li key={`edu-d-${di}`} style={{ marginBottom: `${spacing.bulletGap}px` }}>{d}</li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : null}

            {section.key === "skills" ? (
              <div style={{ marginTop: `${spacing.sectionHeaderAfter}px` }}>
                {r.skills.map((s, i) => {
                  if (!s.category && !s.items.length) return null;
                  return (
                    <p key={s.id ?? `skills-${i}`} className="text-[10px] text-slate-800" style={{ lineHeight: spacing.bulletLineHeight, marginBottom: `${spacing.bulletGap + 1}px` }}>
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
