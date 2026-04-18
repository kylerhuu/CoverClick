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
import { GenerationControls } from "./GenerationControls";
import { LetterPaper } from "./LetterPaper";

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

const btnPrimary =
  "inline-flex items-center justify-center rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40";
const btnGhost =
  "inline-flex items-center justify-center rounded-md border border-slate-200/90 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40";

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

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50/80">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-4 py-2.5">
        <div>
          <div className="text-[13px] font-semibold tracking-tight text-slate-900">Letter</div>
          <p className="text-[10px] text-slate-500">Edit below — exports match this preview</p>
        </div>
        <button
          type="button"
          onClick={onEditProfile}
          className="text-[11px] font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
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

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-slate-200/60 px-4 py-2">
        <button type="button" className={btnPrimary} onClick={onGenerate} disabled={genBusy || !job}>
          Generate
        </button>
        <button type="button" className={btnGhost} onClick={onRegenerate} disabled={genBusy || !job}>
          Again
        </button>
        <button type="button" className={btnGhost} onClick={onCopy} disabled={!hasLetter}>
          Copy
        </button>
        <button type="button" className={btnGhost} onClick={onDocx} disabled={!hasLetter || genBusy}>
          DOCX
        </button>
        <button type="button" className={btnGhost} onClick={onPdf} disabled={!hasLetter || genBusy}>
          PDF
        </button>
        {status ? (
          <span className="ml-auto text-[10px] font-medium tabular-nums text-slate-400">{status}</span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <LetterPaper ref={previewRef} letter={letter} onChange={onLetterChange} />
        <p className="mt-2 text-[10px] text-slate-400">
          {profile.fullName.trim() ? profile.fullName : "Set your name in Profile"} ·{" "}
          {job?.companyName?.trim() || "Company"}
        </p>
      </div>
    </div>
  );
}
