import type { RefObject } from "react";
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
import { CognitiveLoader } from "./CognitiveLoader";
import { GenerationControls } from "./GenerationControls";
import { LetterPaper } from "./LetterPaper";

const GEN_LINES = [
  "Reading your profile and this posting together…",
  "Tuning tone, length, and emphasis for the role…",
  "Grounding claims in your bullets and resume text…",
  "Composing a structured draft you can refine here…",
];

type Props = {
  letter: StructuredCoverLetter;
  onLetterChange: (next: StructuredCoverLetter) => void;
  previewRef: RefObject<HTMLDivElement>;
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
  onEditProfile: () => void;
  profile: UserProfile;
  job: JobContext | null;
};

const btnPrimary = cn(
  "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white shadow-md",
  "bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500",
  "disabled:pointer-events-none disabled:opacity-40",
);

const btnSecondary = cn(
  "inline-flex items-center justify-center rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 shadow-sm",
  "hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-950",
  "disabled:pointer-events-none disabled:opacity-40",
);

export function LetterPane({
  letter,
  onLetterChange,
  previewRef,
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
  onEditProfile,
  profile,
  job,
}: Props) {
  const hasLetter = letter.bodyParagraphs.some((p) => p.trim()) || letter.greeting.trim();
  const letterEditable = !genBusy && !pdfBusy;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-gradient-to-br from-slate-100/90 via-white to-slate-50/80">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold tracking-tight text-slate-900">Your letter</div>
          <p className="text-[10px] font-medium text-slate-500">Edit in place · exports match this content</p>
        </div>
        <button
          type="button"
          onClick={onEditProfile}
          className="shrink-0 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50"
        >
          Profile
        </button>
      </div>

      <GenerationControls
        tone={tone}
        emphasis={emphasis}
        length={length}
        responseShape={responseShape}
        onChange={onPrefsChange}
      />

      <div className="shrink-0 border-b border-slate-200/70 bg-white/70">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
          <button type="button" className={btnPrimary} onClick={onGenerate} disabled={genBusy || pdfBusy || !job}>
            {genBusy ? "Drafting…" : "Generate"}
          </button>
          <button type="button" className={btnSecondary} onClick={onRegenerate} disabled={genBusy || pdfBusy || !job}>
            Regenerate
          </button>
          <button type="button" className={btnSecondary} onClick={onCopy} disabled={!hasLetter || genBusy || pdfBusy}>
            Copy
          </button>
          <button type="button" className={btnSecondary} onClick={onDocx} disabled={!hasLetter || genBusy || pdfBusy}>
            DOCX
          </button>
          <button type="button" className={btnSecondary} onClick={onPdf} disabled={!hasLetter || genBusy || pdfBusy}>
            PDF
          </button>
          {status && !pdfBusy ? (
            <span className="ml-auto text-[10px] font-semibold tabular-nums text-emerald-600">{status}</span>
          ) : null}
        </div>
        {pdfBusy ? (
          <div className="border-t border-indigo-100/90 bg-gradient-to-r from-indigo-50/90 to-sky-50/60 px-4 py-2.5">
            <div className="cc-pdf-bar mb-1.5">
              <span />
            </div>
            <p className="text-[10px] font-semibold text-indigo-950">Rendering print-ready PDF (multi-page when needed)…</p>
          </div>
        ) : null}
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <CognitiveLoader open={genBusy} headline="Drafting your cover letter" lines={GEN_LINES} />
        <LetterPaper ref={previewRef} letter={letter} onChange={onLetterChange} editable={letterEditable} />
        <p className="mt-3 text-center text-[10px] font-medium text-slate-400">
          {profile.fullName.trim() ? profile.fullName : "Add your name in Profile"} · {job?.companyName?.trim() || "Company"}
        </p>
      </div>
    </div>
  );
}
