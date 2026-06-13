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
import {
  ccBtnTextSecondary,
  ccLetterPreviewCanvas,
  ccLetterPreviewPaper,
  ccWorkspaceDownloadBtn,
  ccWorkspaceEditPanel,
  ccWorkspaceGenerateBtn,
  ccWorkspaceSecondaryBtn,
} from "../../ui/ccUi";
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
  saveBusy?: boolean;
  status: string | null;
  onGenerate: () => void;
  onRegenerate: () => void;
  onCopy: () => void;
  onSave: () => void;
  onDownload: () => void;
  onDocx: () => void;
  onSwitchToResume?: () => void;
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

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M7 2V9M7 9L4.5 6.5M7 9L9.5 6.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 10.5V11.5C3 12 3.5 12.5 4 12.5H10C10.5 12.5 11 12 11 11.5V10.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
  saveBusy,
  status,
  onGenerate,
  onRegenerate,
  onCopy,
  onSave,
  onDownload,
  onDocx,
  onSwitchToResume,
  profile,
  job,
  exportBasename,
  onExportBasenameChange,
  docEditEpoch,
}: Props) {
  const jobCtx = job ?? FALLBACK_JOB;
  const hasLetter = letter.bodyParagraphs.some((p) => p.trim()) || letter.greeting.trim();
  const letterEditable = !genBusy && !pdfBusy && !saveBusy;
  const actionsDisabled = !hasLetter || genBusy || pdfBusy || saveBusy;

  const [mode, setMode] = useState<LetterPaneMode>("preview");
  const [editPlain, setEditPlain] = useState(() => canonicalPlainFromStructured(letter));
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

  const exitEditMode = () => {
    window.clearTimeout(debRef.current);
    onLetterChange(structuredFromCanonicalPlain(editPlain, profile, jobCtx));
    setMode("preview");
  };

  const enterEditMode = () => {
    setEditPlain(canonicalPlainFromStructured(letter));
    setMode("edit");
  };

  const onEditPlainChange = (s: string) => {
    setEditPlain(s);
  };

  const handleSave = () => {
    if (mode === "edit") {
      window.clearTimeout(debRef.current);
      onLetterChange(structuredFromCanonicalPlain(editPlain, profile, jobCtx));
    }
    onSave();
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#F5F7FB]">
      <div
        className="pointer-events-none fixed left-[-14000px] top-0 z-0 overflow-visible"
        aria-hidden
      >
        <LetterDocument variant="export" letter={letter} />
      </div>

      <div className="shrink-0 border-b border-slate-100/50 bg-[#F5F7FB]/95 px-4 py-2 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <button
            type="button"
            className={ccWorkspaceGenerateBtn}
            onClick={onGenerate}
            disabled={genBusy || pdfBusy || saveBusy || !job}
          >
            {genBusy ? "Drafting…" : "Generate"}
          </button>

          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              className={ccWorkspaceSecondaryBtn}
              onClick={onCopy}
              disabled={actionsDisabled}
            >
              Copy
            </button>
            <button
              type="button"
              className={cn(
                ccWorkspaceSecondaryBtn,
                mode === "edit" && "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80",
              )}
              onClick={mode === "edit" ? exitEditMode : enterEditMode}
              disabled={genBusy || pdfBusy || saveBusy}
            >
              {mode === "edit" ? "Preview" : "Edit"}
            </button>
            <button
              type="button"
              className={ccWorkspaceSecondaryBtn}
              onClick={handleSave}
              disabled={actionsDisabled}
            >
              {saveBusy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className={ccWorkspaceDownloadBtn}
              onClick={onDownload}
              disabled={actionsDisabled}
            >
              <DownloadIcon />
              {pdfBusy ? "Rendering…" : "Download"}
            </button>
          </div>

          {status && !pdfBusy && !saveBusy ? (
            <span className="ml-auto text-[11px] font-medium text-[#22C55E]">{status}</span>
          ) : null}
        </div>

        {pdfBusy ? (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
            <span className="cc-spinner h-3.5 w-3.5 border-2" aria-hidden />
            Preparing your download…
          </div>
        ) : null}
      </div>

      {mode === "preview" ? (
        <div className={ccLetterPreviewCanvas}>
          <CognitiveLoader open={genBusy} headline="Drafting your cover letter" lines={GEN_LINES} />
          <div className="flex min-h-full justify-center px-6 py-12 sm:px-10 md:px-14 lg:px-20">
            <div className={ccLetterPreviewPaper}>
              <LetterDocument variant="preview" letter={letter} />
            </div>
          </div>
        </div>
      ) : (
        <div className={cn(ccLetterPreviewCanvas, "flex flex-col")}>
          <div className="shrink-0 border-b border-slate-100/60 bg-white/70 px-4 py-2.5 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-slate-800">Edit cover letter</p>
              <div className="flex flex-wrap items-center gap-2">
                {onSwitchToResume ? (
                  <button type="button" className={ccBtnTextSecondary} onClick={onSwitchToResume}>
                    Edit resume →
                  </button>
                ) : null}
                <button
                  type="button"
                  className={cn(ccBtnTextSecondary, "text-[11px]")}
                  onClick={onRegenerate}
                  disabled={genBusy || pdfBusy || saveBusy || !job}
                >
                  Regenerate
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <LetterContinuousEditor
              value={editPlain}
              onChange={onEditPlainChange}
              disabled={!letterEditable}
            />
          </div>

          <div className="shrink-0 border-t border-slate-100/60 bg-[#F5F7FB]/95 px-4 py-3">
            <div className={ccWorkspaceEditPanel}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Generation settings
              </p>
              <div className="mt-3">
                <GenerationControls
                  tone={tone}
                  emphasis={emphasis}
                  length={length}
                  responseShape={responseShape}
                  onChange={onPrefsChange}
                  exportBasename={exportBasename}
                  onExportBasenameChange={onExportBasenameChange}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  className={cn(ccBtnTextSecondary, "text-[11px]")}
                  onClick={onDocx}
                  disabled={actionsDisabled}
                >
                  Download DOCX
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
