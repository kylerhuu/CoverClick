import { useEffect, useRef, useState } from "react";
import type {
  DefaultTone,
  Emphasis,
  JobContext,
  LetterLength,
  ResponseShapePreference,
  StructuredCoverLetter,
  UserProfile,
} from "../../lib/types";
import { cn } from "../../lib/classNames";
import { ccBtnPrimary, ccBtnSecondary, ccFocusRing, ccSegmentTab, ccSegmentTrack } from "../../ui/ccUi";
import {
  canonicalPlainFromStructured,
  structuredFromCanonicalPlain,
} from "../../lib/letterModel";
import { CognitiveLoader } from "./CognitiveLoader";
import { GenerationControls } from "./GenerationControls";
import { LetterContinuousEditor } from "./LetterContinuousEditor";
import { LetterDocument } from "./LetterDocument";

const GEN_LINES = [
  "Reading your profile and this posting together…",
  "Tuning tone, length, and emphasis for the role…",
  "Grounding claims in your bullets and resume text…",
  "Composing a structured draft you can refine here…",
];

export type LetterPaneMode = "preview" | "edit";

type Props = {
  letter: StructuredCoverLetter;
  onLetterChange: (next: StructuredCoverLetter) => void;
  tone: DefaultTone;
  emphasis: Emphasis;
  length: LetterLength;
  responseShape: ResponseShapePreference;
  onPrefsChange: (next: {
    tone: DefaultTone;
    emphasis: Emphasis;
    length: LetterLength;
    responseShape: ResponseShapePreference;
  }) => void;
  genBusy: boolean;
  pdfBusy: boolean;
  status: string | null;
  onGenerate: () => void;
  onRegenerate: () => void;
  onCopy: () => void;
  onDocx: () => void;
  onPdf: () => void;
  profile: UserProfile;
  job: JobContext | null;
  /** Bump when the letter should reload from structured (new job scrape or new generation). */
  docEditEpoch: number;
};

const FALLBACK_JOB: JobContext = {
  jobTitle: "",
  companyName: "",
  descriptionText: "",
  pageUrl: "",
  scrapedAt: 0,
};

export function LetterPane({
  letter,
  onLetterChange,
  tone,
  emphasis,
  length,
  responseShape,
  onPrefsChange,
  genBusy,
  pdfBusy,
  status,
  onGenerate,
  onRegenerate,
  onCopy,
  onDocx,
  onPdf,
  profile,
  job,
  docEditEpoch,
}: Props) {
  const jobCtx = job ?? FALLBACK_JOB;
  const hasLetter = letter.bodyParagraphs.some((p) => p.trim()) || letter.greeting.trim();
  const letterEditable = !genBusy && !pdfBusy;

  const [mode, setMode] = useState<LetterPaneMode>("preview");
  const [editPlain, setEditPlain] = useState(() => canonicalPlainFromStructured(letter));
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const debRef = useRef<number>();
  const prevGenBusy = useRef(genBusy);

  useEffect(() => {
    setEditPlain(canonicalPlainFromStructured(letter));
    // Intentionally only `docEditEpoch`: job scrape / generation bumps this; do not tie to `letter` or debounced saves reset the textarea mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docEditEpoch]);

  const flushRef = useRef(() => {});
  flushRef.current = () => {
    onLetterChange(structuredFromCanonicalPlain(editPlain, profile, jobCtx));
  };

  useEffect(() => {
    if (mode !== "edit") return;
    window.clearTimeout(debRef.current);
    debRef.current = window.setTimeout(() => flushRef.current(), 400);
    return () => window.clearTimeout(debRef.current);
  }, [editPlain, mode, profile, jobCtx, onLetterChange]);

  useEffect(() => {
    if (prevGenBusy.current && !genBusy) {
      setMode("preview");
    }
    prevGenBusy.current = genBusy;
  }, [genBusy]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = exportMenuRef.current;
      if (el && !el.contains(e.target as Node)) setExportMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [exportMenuOpen]);

  const setLetterMode = (next: LetterPaneMode) => {
    if (next === "preview" && mode === "edit") {
      window.clearTimeout(debRef.current);
      onLetterChange(structuredFromCanonicalPlain(editPlain, profile, jobCtx));
    }
    if (next === "edit") {
      setEditPlain(canonicalPlainFromStructured(letter));
    }
    setMode(next);
  };

  const onEditPlainChange = (s: string) => {
    setEditPlain(s);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-gradient-to-br from-slate-100/90 via-white to-slate-50/80">
      <div
        className="pointer-events-none fixed left-[-14000px] top-0 z-0 overflow-visible"
        aria-hidden
      >
        <LetterDocument variant="export" letter={letter} />
      </div>

      <GenerationControls
        tone={tone}
        emphasis={emphasis}
        length={length}
        responseShape={responseShape}
        onChange={onPrefsChange}
      />

      <div className="shrink-0 border-b border-slate-200/70 bg-white/80">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            className={cn(ccBtnPrimary, "px-3 py-1.5 text-[11px]")}
            onClick={onGenerate}
            disabled={genBusy || pdfBusy || !job}
          >
            {genBusy ? "Drafting…" : "Generate"}
          </button>
          <button
            type="button"
            className={cn(ccBtnSecondary, "px-3 py-1.5 text-[11px]")}
            onClick={onRegenerate}
            disabled={genBusy || pdfBusy || !job}
          >
            Regenerate
          </button>
          <button
            type="button"
            className={cn(ccBtnSecondary, "px-3 py-1.5 text-[11px]")}
            onClick={onCopy}
            disabled={!hasLetter || genBusy || pdfBusy}
          >
            Copy
          </button>
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              title="Export letter"
              aria-expanded={exportMenuOpen}
              aria-haspopup="menu"
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-700 shadow-sm",
                "hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-950",
                "disabled:pointer-events-none disabled:opacity-40",
                ccFocusRing,
              )}
              disabled={!hasLetter || genBusy || pdfBusy}
              onClick={() => setExportMenuOpen((o) => !o)}
            >
              <span className="sr-only">Export</span>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            {exportMenuOpen ? (
              <div
                className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[9.5rem] overflow-hidden rounded-lg border border-slate-200/90 bg-white py-1 shadow-lg ring-1 ring-black/5"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center px-3 py-2 text-left text-[11px] font-semibold text-slate-800 hover:bg-indigo-50/80"
                  onClick={() => {
                    setExportMenuOpen(false);
                    onPdf();
                  }}
                >
                  PDF
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center px-3 py-2 text-left text-[11px] font-semibold text-slate-800 hover:bg-indigo-50/80"
                  onClick={() => {
                    setExportMenuOpen(false);
                    onDocx();
                  }}
                >
                  DOCX
                </button>
              </div>
            ) : null}
          </div>
          {status && !pdfBusy ? (
            <span className="ml-auto text-[10px] font-semibold tabular-nums text-emerald-600">{status}</span>
          ) : null}
        </div>
        {pdfBusy ? (
          <div className="border-t border-indigo-100/90 bg-gradient-to-r from-indigo-50/90 to-sky-50/60 px-4 py-2.5">
            <div className="cc-pdf-bar mb-1.5">
              <span />
            </div>
            <p className="text-[10px] font-semibold text-indigo-950">Rendering #letter-container to PDF…</p>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/60 bg-white/90 px-3 py-1.5 sm:px-4">
        <div className={cn(ccSegmentTrack)} role="tablist" aria-label="Letter view">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "preview"}
            className={cn("px-2.5 py-1.5 text-[11px]", ccSegmentTab(mode === "preview"), ccFocusRing)}
            onClick={() => setLetterMode("preview")}
          >
            Preview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "edit"}
            className={cn("px-2.5 py-1.5 text-[11px]", ccSegmentTab(mode === "edit"), ccFocusRing)}
            onClick={() => setLetterMode("edit")}
          >
            Edit
          </button>
        </div>
        <p className="hidden max-w-[200px] text-right text-[10px] leading-snug text-slate-400 sm:block">
          {mode === "edit" ? "Plain text · syncs to exports" : "Print-style layout"}
        </p>
      </div>

      <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto bg-gradient-to-b from-slate-200/30 via-slate-50/80 to-slate-200/25">
        <CognitiveLoader open={genBusy} headline="Drafting your cover letter" lines={GEN_LINES} />
        {mode === "preview" ? (
          /*
           * US Letter is 8.5in wide — wider than a split side panel. Horizontal scroll + start alignment keeps
           * the sender block (top-left of the page) in view; centering would clip the left margin and address.
           */
          <div className="flex justify-start px-3 py-10 sm:px-6">
            <div className="letter-doc-preview-mount shadow-[0_12px_40px_rgba(15,23,42,0.1)] ring-1 ring-slate-300/50">
              <LetterDocument variant="preview" letter={letter} />
            </div>
          </div>
        ) : (
          <LetterContinuousEditor value={editPlain} onChange={onEditPlainChange} disabled={!letterEditable} />
        )}
        <p className="pointer-events-none px-4 pb-5 pt-2 text-center text-[10px] font-medium text-slate-400">
          {profile.fullName.trim() ? profile.fullName : "Add your name in Profile"} · {job?.companyName?.trim() || "Company"}
        </p>
      </div>
    </div>
  );
}
