import { cn } from "../../lib/classNames";

type Props = {
  letter: string;
  onLetterChange: (next: string) => void;
  busy: boolean;
  status: string | null;
  onGenerate: () => void;
  onRegenerate: () => void;
  onCopy: () => void;
  onDownload: () => void;
};

const btnPrimary =
  "inline-flex flex-1 items-center justify-center rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40";
const btnGhost =
  "inline-flex flex-1 items-center justify-center rounded-md border border-slate-200/90 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40";

export function OutputSection({
  letter,
  onLetterChange,
  busy,
  status,
  onGenerate,
  onRegenerate,
  onCopy,
  onDownload,
}: Props) {
  return (
    <section className="px-3.5 pb-3 pt-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="cc-label">Letter</span>
        {status ? (
          <span className="text-[10px] font-medium tabular-nums text-slate-400">{status}</span>
        ) : null}
      </div>

      <textarea
        className={cn(
          "mt-1.5 w-full min-h-[192px] resize-y rounded-md border border-slate-200/90 bg-white",
          "px-3 py-2.5 font-letter text-[13px] leading-[1.65] text-slate-900",
          "shadow-inner shadow-slate-900/[0.02]",
          "placeholder:text-slate-400",
          "focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900/10",
        )}
        value={letter}
        onChange={(e) => onLetterChange(e.target.value)}
        placeholder="Generate, then edit here. Blank line = new paragraph in DOCX."
        spellCheck
      />

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" className={btnPrimary} onClick={onGenerate} disabled={busy}>
          Generate
        </button>
        <button type="button" className={btnGhost} onClick={onRegenerate} disabled={busy}>
          Again
        </button>
        <button type="button" className={btnGhost} onClick={onCopy} disabled={!letter.trim()}>
          Copy
        </button>
        <button type="button" className={btnGhost} onClick={onDownload} disabled={!letter.trim() || busy}>
          DOCX
        </button>
      </div>
    </section>
  );
}
