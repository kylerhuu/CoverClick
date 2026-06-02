import type { StructuredResume } from "../../../lib/types";
import {
  formatContactLine,
  formatEducationBlock,
  formatExperiencePrimary,
  formatExperienceSecondary,
  formatProjectPrimary,
  formatProjectSecondary,
  getResumeRenderModel,
  RESUME_EXPORT_CONTAINER_ID,
} from "../../../lib/resumeRender";
import { cn } from "../../../lib/classNames";

type Props = {
  resume: StructuredResume;
  template?: "ats-classic";
  variant?: "preview" | "export";
  className?: string;
};


const shellClass = "rounded-xl border border-slate-300/80 bg-slate-200/50 p-3";
const pageClass =
  "mx-auto w-full max-w-[680px] min-h-[880px] rounded-[2px] border border-slate-300 bg-white px-[52px] py-[44px] shadow-[0_10px_30px_rgba(15,23,42,0.15)]";
const exportPageClass = "w-[8.5in] min-h-[11in] bg-white px-[52px] py-[44px]";

function headerRule() {
  return <div className="mt-[2px] h-px w-full bg-slate-400/70" aria-hidden />;
}

export function ResumePreview({ resume, template = "ats-classic", variant = "preview", className }: Props) {
  const model = getResumeRenderModel(resume);
  const r = model.resume;
  const sections = model.sections;
  const contact = formatContactLine(r);
  const spacing = model.spacing;
  const typography = model.typography;

  const page = (
    <div
      id={variant === "export" ? RESUME_EXPORT_CONTAINER_ID : undefined}
      className={cn(
        variant === "export" ? exportPageClass : pageClass,
        template === "ats-classic" ? "font-[Inter,system-ui,Segoe_UI,Arial,sans-serif]" : "",
      )}
    >
      <header>
        <h2 className="text-center font-extrabold tracking-[-0.01em] text-slate-900" style={{ fontSize: `${typography.namePt * (96 / 72)}px` }}>
          {r.contact.fullName || "Candidate Name"}
        </h2>
        {contact ? <p className="mt-1 text-center font-medium text-slate-700" style={{ fontSize: `${typography.contactPt * (96 / 72)}px` }}>{contact}</p> : null}
      </header>

      {sections.map((section) => (
        <section key={section.key} style={{ marginTop: `${spacing.sectionGap}px` }}>
          <h3 className="font-bold tracking-[0.18em] text-slate-700" style={{ fontSize: `${typography.sectionHeaderPt * (96 / 72)}px` }}>{section.label}</h3>
          {headerRule()}

          {section.key === "summary" ? (
            <p className="text-slate-800" style={{ marginTop: `${spacing.sectionHeaderAfter}px`, lineHeight: spacing.bulletLineHeight, fontSize: `${typography.primaryLinePt * (96 / 72)}px` }}>
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
                    {primary ? <p className="font-semibold text-slate-900" style={{ fontSize: `${typography.primaryLinePt * (96 / 72)}px` }}>{primary}</p> : null}
                    {secondary ? <p className="font-medium text-slate-700" style={{ marginTop: `${spacing.subLineGap}px`, fontSize: `${typography.secondaryLinePt * (96 / 72)}px` }}>{secondary}</p> : null}
                    <ul className="list-disc pl-[18px] text-slate-800" style={{ marginTop: `${spacing.subLineGap + 1}px`, lineHeight: spacing.bulletLineHeight, fontSize: `${typography.bulletPt * (96 / 72)}px` }}>
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
                    {primary ? <p className="font-semibold text-slate-900" style={{ fontSize: `${typography.primaryLinePt * (96 / 72)}px` }}>{primary}</p> : null}
                    {secondary ? <p className="font-medium text-slate-600" style={{ marginTop: `${Math.max(1, spacing.subLineGap - 1)}px`, fontSize: `${typography.secondaryLinePt * (96 / 72)}px` }}>{secondary}</p> : null}
                    <ul className="list-disc pl-[18px] text-slate-800" style={{ marginTop: `${spacing.subLineGap + 1}px`, lineHeight: spacing.bulletLineHeight, fontSize: `${typography.bulletPt * (96 / 72)}px` }}>
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
                    {lines.schoolLine ? <p className="font-semibold text-slate-900" style={{ fontSize: `${typography.primaryLinePt * (96 / 72)}px` }}>{lines.schoolLine}</p> : null}
                    {lines.degreeLine ? <p className="text-slate-800" style={{ marginTop: `${spacing.subLineGap}px`, fontSize: `${typography.secondaryLinePt * (96 / 72)}px` }}>{lines.degreeLine}</p> : null}
                    {lines.majorLine ? <p className="text-slate-800" style={{ marginTop: `${Math.max(1, spacing.subLineGap - 1)}px`, fontSize: `${typography.secondaryLinePt * (96 / 72)}px` }}>{lines.majorLine}</p> : null}
                    {lines.gpaLine ? <p className="text-slate-800" style={{ marginTop: `${Math.max(1, spacing.subLineGap - 1)}px`, fontSize: `${typography.secondaryLinePt * (96 / 72)}px` }}>{lines.gpaLine}</p> : null}
                    {e.details.length ? (
                      <ul className="list-disc pl-[18px] text-slate-800" style={{ marginTop: `${spacing.subLineGap + 1}px`, lineHeight: spacing.bulletLineHeight, fontSize: `${typography.bulletPt * (96 / 72)}px` }}>
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
                  <p key={s.id ?? `skills-${i}`} className="text-slate-800" style={{ lineHeight: spacing.bulletLineHeight, marginBottom: `${spacing.bulletGap + 1}px`, fontSize: `${typography.bulletPt * (96 / 72)}px` }}>
                    <span className="font-semibold text-slate-900">{s.category || "Skills"}:</span> {s.items.join(", ")}
                  </p>
                );
              })}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );

  if (variant === "export") return page;
  return <div className={cn(shellClass, className)}>{page}</div>;
}
