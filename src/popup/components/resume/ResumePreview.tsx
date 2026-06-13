import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MutableRefObject } from "react";

const PAGE_MEASURE_EPSILON_PX = 2;
import type { StructuredResume } from "../../../lib/types";
import { experienceEntryKey, projectEntryKey } from "../../../lib/resumeLayoutEngine";
import {
  exportDisplayText,
  formatContactLine,
  formatEducationBlock,
  formatExperiencePrimary,
  formatExperienceSecondary,
  formatProjectPrimary,
  formatProjectSecondary,
  formatSkillRenderLines,
  getResumeRenderModel,
  RESUME_EXPORT_CONTAINER_ID,
  type FinalExportOverrides,
  type ResumeRenderOptions,
} from "../../../lib/resumeRender";
import {
  LETTER_PAGE_HEIGHT_PX,
  pagesUsedFromHeight,
  targetContentMaxPx,
} from "../../../lib/resumePageMetrics";
import { cn } from "../../../lib/classNames";

export type ResumePreviewEditableFlushHandle = {
  flushEditableOverrides: () => void;
};

function readEditableText(el: HTMLElement): string {
  const text = el.textContent ?? "";
  if (!text || text === "\u00a0") return "";
  return text;
}

function editableDisplayText(text: string): string {
  return text || "\u00a0";
}

type Props = {
  resume: StructuredResume;
  template?: "ats-classic";
  variant?: "preview" | "export";
  className?: string;
  renderOptions?: ResumeRenderOptions;
  showPageBoundary?: boolean;
  onExportPageMeasure?: (result: { contentHeight: number; pagesUsed: number; overflows: boolean }) => void;
  /** Final-review inline edits (print-preview step). */
  editable?: boolean;
  onFinalOverrideChange?: (key: string, value: string) => void;
  /** Applies all in-progress contentEditable values in one update. */
  onFinalOverridesFlush?: (updates: FinalExportOverrides) => void;
  /** Bumps when export layout plan changes (force-fit DOM passes). */
  layoutEpoch?: number;
  /** Flushes in-progress contentEditable text before save/export. */
  editableFlushRef?: MutableRefObject<ResumePreviewEditableFlushHandle | null>;
};

const shellClass = "rounded-xl border border-slate-300/80 bg-slate-200/50 p-3";
const exportPageClass = "w-[8.5in] bg-white px-[52px] py-[44px]";

function headerRule() {
  return <div className="mt-[2px] h-px w-full bg-slate-400/70" aria-hidden />;
}

function ResumeTextBlock({
  blockKey,
  fallback,
  overrides,
  editable,
  onOverrideChange,
  className,
  style,
  as = "p",
}: {
  blockKey: string;
  fallback: string;
  overrides?: FinalExportOverrides;
  editable?: boolean;
  onOverrideChange?: (key: string, value: string) => void;
  className?: string;
  style?: CSSProperties;
  as?: "p" | "li";
}) {
  const text = exportDisplayText(overrides, blockKey, fallback);
  const elRef = useRef<HTMLElement | null>(null);
  const isFocusedRef = useRef(false);
  const lastSyncedTextRef = useRef(text);

  useLayoutEffect(() => {
    if (!editable || !elRef.current) return;
    if (isFocusedRef.current) return;
    const display = editableDisplayText(text);
    if (elRef.current.textContent !== display) {
      elRef.current.textContent = display;
    }
    lastSyncedTextRef.current = text;
  }, [editable, text, blockKey]);

  const commit = (el: HTMLElement) => {
    const value = readEditableText(el);
    if (value === lastSyncedTextRef.current) return;
    lastSyncedTextRef.current = value;
    onOverrideChange?.(blockKey, value);
  };

  if (!text && !editable) return null;
  const editCls = editable ? "rounded-sm outline-none focus:ring-2 focus:ring-indigo-300/80" : "";
  const Tag = as;
  if (!editable) {
    return (
      <Tag className={className} style={style}>
        {text}
      </Tag>
    );
  }
  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        elRef.current = node;
      }}
      className={cn(className, editCls)}
      style={style}
      contentEditable
      suppressContentEditableWarning
      data-resume-edit-key={blockKey}
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      onBlur={(e) => {
        isFocusedRef.current = false;
        commit(e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}

export function ResumePreview({
  resume,
  template = "ats-classic",
  variant = "preview",
  className,
  renderOptions,
  showPageBoundary = false,
  onExportPageMeasure,
  editable = false,
  onFinalOverrideChange,
  onFinalOverridesFlush,
  layoutEpoch = 0,
  editableFlushRef,
}: Props) {
  const pageRef = useRef<HTMLDivElement>(null);
  const lastReportedHeightRef = useRef(0);
  const onMeasureRef = useRef(onExportPageMeasure);
  onMeasureRef.current = onExportPageMeasure;
  const [scrollHeight, setScrollHeight] = useState(0);
  const model = getResumeRenderModel(resume, renderOptions);
  const r = model.resume;
  const sections = model.sections;
  const overrides = renderOptions?.finalExportOverrides;
  const contact = exportDisplayText(overrides, "contact:line", formatContactLine(r));
  const plan = model.layout.renderPlan;
  const spacing = model.spacing;
  const typography = model.typography;
  const skillLines = formatSkillRenderLines(r, model.layout.renderPlan);
  const targetPages = renderOptions?.targetPages ?? 1;

  useEffect(() => {
    if (!editableFlushRef) return;
    editableFlushRef.current = {
      flushEditableOverrides: () => {
        const root = pageRef.current;
        if (!root) return;
        const updates: FinalExportOverrides = {};
        root.querySelectorAll<HTMLElement>("[data-resume-edit-key]").forEach((el) => {
          const key = el.dataset.resumeEditKey;
          if (!key) return;
          updates[key] = readEditableText(el);
        });
        if (Object.keys(updates).length === 0) return;
        if (onFinalOverridesFlush) {
          onFinalOverridesFlush(updates);
          return;
        }
        for (const [key, value] of Object.entries(updates)) {
          onFinalOverrideChange?.(key, value);
        }
      },
    };
    return () => {
      editableFlushRef.current = null;
    };
  }, [editableFlushRef, onFinalOverrideChange, onFinalOverridesFlush]);

  useLayoutEffect(() => {
    const el = pageRef.current;
    if (!el) return;

    const report = () => {
      const h = el.scrollHeight;
      setScrollHeight((prev) => (prev === h ? prev : h));
      if (variant !== "export" || !onMeasureRef.current) return;
      if (Math.abs(h - lastReportedHeightRef.current) < PAGE_MEASURE_EPSILON_PX) return;
      lastReportedHeightRef.current = h;
      const pagesUsed = pagesUsedFromHeight(h);
      onMeasureRef.current({
        contentHeight: h,
        pagesUsed,
        overflows: h > targetContentMaxPx(targetPages) + 1,
      });
    };

    report();
    const ro = new ResizeObserver(() => report());
    ro.observe(el);
    return () => ro.disconnect();
  }, [variant, resume, targetPages, renderOptions?.fitMode, renderOptions?.targetPages, renderOptions?.fullContentPreview, layoutEpoch]);

  const pageBody = (
    <>
      <header>
        <h2 className="text-center font-extrabold tracking-[-0.01em] text-slate-900" style={{ fontSize: `${typography.namePt * (96 / 72)}px` }}>
          {r.contact.fullName || "Candidate Name"}
        </h2>
        {contact || editable ? (
          <ResumeTextBlock
            blockKey="contact:line"
            fallback={formatContactLine(r)}
            overrides={overrides}
            editable={editable}
            onOverrideChange={onFinalOverrideChange}
            className="mt-1 text-center font-medium text-slate-700"
            style={{ fontSize: `${typography.contactPt * (96 / 72)}px` }}
          />
        ) : null}
      </header>

      {sections.map((section) => (
        <section key={section.key} style={{ marginTop: `${spacing.sectionGap}px` }}>
          <h3 className="font-bold tracking-[0.18em] text-slate-700" style={{ fontSize: `${typography.sectionHeaderPt * (96 / 72)}px` }}>{section.label}</h3>
          {headerRule()}

          {section.key === "summary" ? (
            <ResumeTextBlock
              blockKey="summary"
              fallback={r.summary}
              overrides={overrides}
              editable={editable}
              onOverrideChange={onFinalOverrideChange}
              className="text-slate-800"
              style={{
                marginTop: `${spacing.sectionHeaderAfter}px`,
                lineHeight: spacing.bulletLineHeight,
                fontSize: `${typography.primaryLinePt * (96 / 72)}px`,
              }}
            />
          ) : null}

          {section.key === "experience" ? (
            <div style={{ marginTop: `${spacing.sectionHeaderAfter}px` }}>
              {r.experience.map((e, i) => {
                if (!e.company && !e.title && !e.bullets.length) return null;
                const ek = experienceEntryKey(e, i);
                const primary = formatExperiencePrimary(e.company, e.companySubtitle);
                const secondary = formatExperienceSecondary(e.title, e.location, e.dates);
                return (
                  <article key={e.id ?? `exp-${i}`} style={{ marginBottom: `${spacing.entryGap}px` }}>
                    {primary || editable ? (
                      <ResumeTextBlock
                        blockKey={`${ek}:primary`}
                        fallback={primary}
                        overrides={overrides}
                        editable={editable}
                        onOverrideChange={onFinalOverrideChange}
                        className="font-semibold text-slate-900"
                        style={{ fontSize: `${typography.primaryLinePt * (96 / 72)}px` }}
                      />
                    ) : null}
                    {secondary || editable ? (
                      <ResumeTextBlock
                        blockKey={`${ek}:secondary`}
                        fallback={secondary}
                        overrides={overrides}
                        editable={editable}
                        onOverrideChange={onFinalOverrideChange}
                        className="font-medium text-slate-700"
                        style={{ marginTop: `${spacing.subLineGap}px`, fontSize: `${typography.secondaryLinePt * (96 / 72)}px` }}
                      />
                    ) : null}
                    <ul className="list-disc pl-[18px] text-slate-800" style={{ marginTop: `${spacing.subLineGap + 1}px`, lineHeight: spacing.bulletLineHeight, fontSize: `${typography.bulletPt * (96 / 72)}px` }}>
                      {e.bullets.map((b, bi) => (
                        <ResumeTextBlock
                          key={`exp-b-${bi}`}
                          blockKey={`${ek}:bullet:${bi}`}
                          fallback={b}
                          overrides={overrides}
                          editable={editable}
                          onOverrideChange={onFinalOverrideChange}
                          className="text-slate-800"
                          style={{ marginBottom: `${spacing.bulletGap}px` }}
                          as="li"
                        />
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
                const pk = projectEntryKey(p, i);
                if (plan.hiddenSections.includes(pk)) return null;
                const primary = formatProjectPrimary(p.name, p.subtitle);
                const secondary = formatProjectSecondary(p.techStack);
                return (
                  <article key={p.id ?? `proj-${i}`} style={{ marginBottom: `${spacing.entryGap}px` }}>
                    {primary || editable ? (
                      <ResumeTextBlock
                        blockKey={`${pk}:primary`}
                        fallback={primary}
                        overrides={overrides}
                        editable={editable}
                        onOverrideChange={onFinalOverrideChange}
                        className="font-semibold text-slate-900"
                        style={{ fontSize: `${typography.primaryLinePt * (96 / 72)}px` }}
                      />
                    ) : null}
                    {secondary || editable ? (
                      <ResumeTextBlock
                        blockKey={`${pk}:secondary`}
                        fallback={secondary}
                        overrides={overrides}
                        editable={editable}
                        onOverrideChange={onFinalOverrideChange}
                        className="font-medium text-slate-600"
                        style={{ marginTop: `${Math.max(1, spacing.subLineGap - 1)}px`, fontSize: `${typography.secondaryLinePt * (96 / 72)}px` }}
                      />
                    ) : null}
                    <ul className="list-disc pl-[18px] text-slate-800" style={{ marginTop: `${spacing.subLineGap + 1}px`, lineHeight: spacing.bulletLineHeight, fontSize: `${typography.bulletPt * (96 / 72)}px` }}>
                      {p.bullets.map((b, bi) => (
                        <ResumeTextBlock
                          key={`proj-b-${bi}`}
                          blockKey={`${pk}:bullet:${bi}`}
                          fallback={b}
                          overrides={overrides}
                          editable={editable}
                          onOverrideChange={onFinalOverrideChange}
                          className="text-slate-800"
                          style={{ marginBottom: `${spacing.bulletGap}px` }}
                          as="li"
                        />
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
                const id = e.id ?? `edu-${i}`;
                const prefix = `education:${id}`;
                if (!lines.schoolLine && !lines.degreeLine && !lines.majorLine && !lines.gpaLine && !e.details.length) return null;
                return (
                  <article key={e.id ?? `edu-${i}`} style={{ marginBottom: `${spacing.entryGap}px` }}>
                    {lines.schoolLine || editable ? (
                      <ResumeTextBlock
                        blockKey={`${prefix}:school`}
                        fallback={lines.schoolLine}
                        overrides={overrides}
                        editable={editable}
                        onOverrideChange={onFinalOverrideChange}
                        className="font-semibold text-slate-900"
                        style={{ fontSize: `${typography.primaryLinePt * (96 / 72)}px` }}
                      />
                    ) : null}
                    {lines.degreeLine || editable ? (
                      <ResumeTextBlock
                        blockKey={`${prefix}:degree`}
                        fallback={lines.degreeLine}
                        overrides={overrides}
                        editable={editable}
                        onOverrideChange={onFinalOverrideChange}
                        className="text-slate-800"
                        style={{ marginTop: `${spacing.subLineGap}px`, fontSize: `${typography.secondaryLinePt * (96 / 72)}px` }}
                      />
                    ) : null}
                    {lines.majorLine || editable ? (
                      <ResumeTextBlock
                        blockKey={`${prefix}:major`}
                        fallback={lines.majorLine}
                        overrides={overrides}
                        editable={editable}
                        onOverrideChange={onFinalOverrideChange}
                        className="text-slate-800"
                        style={{ marginTop: `${Math.max(1, spacing.subLineGap - 1)}px`, fontSize: `${typography.secondaryLinePt * (96 / 72)}px` }}
                      />
                    ) : null}
                    {lines.gpaLine || editable ? (
                      <ResumeTextBlock
                        blockKey={`${prefix}:gpa`}
                        fallback={lines.gpaLine}
                        overrides={overrides}
                        editable={editable}
                        onOverrideChange={onFinalOverrideChange}
                        className="text-slate-800"
                        style={{ marginTop: `${Math.max(1, spacing.subLineGap - 1)}px`, fontSize: `${typography.secondaryLinePt * (96 / 72)}px` }}
                      />
                    ) : null}
                    {e.details.length ? (
                      <ul className="list-disc pl-[18px] text-slate-800" style={{ marginTop: `${spacing.subLineGap + 1}px`, lineHeight: spacing.bulletLineHeight, fontSize: `${typography.bulletPt * (96 / 72)}px` }}>
                        {e.details.map((d, di) => (
                          <ResumeTextBlock
                            key={`edu-d-${di}`}
                            blockKey={`${prefix}:detail:${di}`}
                            fallback={d}
                            overrides={overrides}
                            editable={editable}
                            onOverrideChange={onFinalOverrideChange}
                            className="text-slate-800"
                            style={{ marginBottom: `${spacing.bulletGap}px` }}
                            as="li"
                          />
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
              {skillLines.map((line) => (
                <ResumeTextBlock
                  key={line.key}
                  blockKey={`skills:${line.key}`}
                  fallback={line.text}
                  overrides={overrides}
                  editable={editable}
                  onOverrideChange={onFinalOverrideChange}
                  className="text-slate-800"
                  style={{
                    lineHeight: spacing.bulletLineHeight,
                    marginBottom: `${spacing.bulletGap + 1}px`,
                    fontSize: `${typography.bulletPt * (96 / 72)}px`,
                  }}
                />
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </>
  );

  const pageEl = (
    <div
      ref={pageRef}
      id={variant === "export" ? RESUME_EXPORT_CONTAINER_ID : undefined}
      className={cn(exportPageClass, template === "ats-classic" ? "font-[Inter,system-ui,Segoe_UI,Arial,sans-serif]" : "")}
    >
      {pageBody}
    </div>
  );

  if (variant === "export") return pageEl;

  const hasOverflow = scrollHeight > LETTER_PAGE_HEIGHT_PX + 2;

  return (
    <div className={cn(shellClass, className)}>
      <div className="relative mx-auto w-[8.5in]">
        {showPageBoundary ? (
          <div
            className="pointer-events-none absolute left-0 right-0 z-20 flex items-center border-t-2 border-amber-500 bg-amber-50/95 shadow-sm"
            style={{ top: LETTER_PAGE_HEIGHT_PX }}
          >
            <span className="w-full py-1 text-center text-[9px] font-bold uppercase tracking-widest text-amber-900">
              ──────── Page 1 Ends Here ────────
            </span>
          </div>
        ) : null}
        <div className="overflow-visible border border-slate-300 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
          {pageEl}
        </div>
      </div>
      {showPageBoundary && hasOverflow ? (
        <div className="mx-auto mt-2 w-[8.5in] rounded-lg border border-amber-300 bg-amber-50/90 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900">Page 2 Overflow</p>
          <p className="mt-0.5 text-[10px] text-amber-800">
            Content below the page 1 line spills onto a second page when exported.
          </p>
        </div>
      ) : null}
    </div>
  );
}
