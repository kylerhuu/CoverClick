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
import { ccBtnPrimary, ccBtnTextSecondary, ccFocusRing, ccTextLink } from "../../ui/ccUi";
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
  exportBasename: string;
  onExportBasenameChange: (value: string) => void;
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
  exportBasename,
  onExportBasenameChange,
  docEditEpoch,
}: Props) {
  const jobCtx = job ?? FALLBACK_JOB;
  const hasLetter = letter.bodyParagraphs.some((p) => p.trim()) || letter.greeting.trim();
  const letterEditable = !genBusy && !pdfBusy;

  const [mode, setMode] = useState<LetterPaneMode>("preview");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [editPlain, setEditPlain] = useState(() => canonicalPlainFromStructured(letter));
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const debRef = useRef<number>();
  const prevGenBusy = useRef(genBusy);

  useEffect(() => {
    setEditPlain(canonicalPlainFromStructured(letter));
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#f0f2f6]">
      <div
        className="pointer-events-none fixed left-[-14000px] top-0 z-0 overflow-visible"
        aria-hidden
      >
        <LetterDocument variant="export" letter={letter} />
      </div>

      <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            type="button"
            className={cn(ccBtnPrimary, "px-4 py-2")}
            onClick={onGenerate}
            disabled={genBusy || pdfBusy || !job}
          >
            {genBusy ? "Drafting…" : "Generate"}
          </button>

          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <button
              type="button"
              className={ccTextLink}
              onClick={onCopy}
              disabled={!hasLetter || genBusy || pdfBusy}
            >
              Copy
            </button>
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                className={ccTextLink}
                aria-expanded={exportMenuOpen}
                aria-haspopup="menu"
                disabled={!hasLetter || genBusy || pdfBusy}
                onClick={() => setExportMenuOpen((o) => !o)}
              >
                Export
              </button>
              {exportMenuOpen ? (
                <div
                  className="absolute left-0 top-[calc(100%+4px)] z-20 min-w-[8rem] overflow-hidden rounded-lg border border-slate-200/90 bg-white py-1 shadow-md"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center px-3 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-slate-50"
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
                    className="flex w-full items-center px-3 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-slate-50"
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
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
            <button
              type="button"
              className={ccTextLink}
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((o) => !o)}
            >
              Advanced{advancedOpen ? "" : "…"}
            </button>
          </div>

          {status && !pdfBusy ? (
            <span className="ml-auto text-[11px] font-medium text-emerald-600">{status}</span>
          ) : null}
        </div>

        {advancedOpen ? (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <GenerationControls
              tone={tone}
              emphasis={emphasis}
              length={length}
              responseShape={responseShape}
              onChange={onPrefsChange}
              exportBasename={exportBasename}
              onExportBasenameChange={onExportBasenameChange}
            />
            <button
              type="button"
              className={cn(ccBtnTextSecondary, "mt-3 text-[12px]")}
              onClick={onRegenerate}
              disabled={genBusy || pdfBusy || !job}
            >
              Regenerate letter
            </button>
          </div>
        ) : null}

        {pdfBusy ? (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
            <span className="cc-spinner h-3.5 w-3.5 border-2" aria-hidden />
            Rendering PDF…
          </div>
        ) : null}
      </div>

      <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto">
        <div className="sticky top-0 z-10 flex items-center justify-end gap-2 border-b border-slate-100/80 bg-[#f0f2f6]/95 px-4 py-1.5 backdrop-blur-sm">
          <button
            type="button"
            className={cn(
              "text-[11px] font-medium",
              mode === "preview" ? "text-slate-900" : "text-slate-400 hover:text-slate-600",
              ccFocusRing,
            )}
            onClick={() => setLetterMode("preview")}
          >
            Preview
          </button>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <button
            type="button"
            className={cn(
              "text-[11px] font-medium",
              mode === "edit" ? "text-slate-900" : "text-slate-400 hover:text-slate-600",
              ccFocusRing,
            )}
            onClick={() => setLetterMode("edit")}
          >
            Edit
          </button>
        </div>

        <CognitiveLoader open={genBusy} headline="Drafting your cover letter" lines={GEN_LINES} />
        {mode === "preview" ? (
          <div className="flex justify-start px-4 py-8 sm:px-6">
            <div className="letter-doc-preview-mount shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80">
              <LetterDocument variant="preview" letter={letter} />
            </div>
          </div>
        ) : (
          <LetterContinuousEditor value={editPlain} onChange={onEditPlainChange} disabled={!letterEditable} />
        )}
      </div>
    </div>
  );
}
