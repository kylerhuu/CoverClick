import type { DefaultTone, Emphasis, LetterLength } from "../../lib/types";
import { cn } from "../../lib/classNames";

type Props = {
  tone: DefaultTone;
  emphasis: Emphasis;
  length: LetterLength;
  onChange: (next: { tone: DefaultTone; emphasis: Emphasis; length: LetterLength }) => void;
};

const tones: { value: DefaultTone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "warm", label: "Warm" },
  { value: "concise", label: "Concise" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "formal", label: "Formal" },
];

const emphases: { value: Emphasis; label: string }[] = [
  { value: "general", label: "General" },
  { value: "technical", label: "Technical" },
  { value: "product", label: "Product" },
  { value: "consulting", label: "Consulting" },
  { value: "finance", label: "Finance" },
  { value: "startup", label: "Startup" },
];

const lengths: { value: LetterLength; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

const selectClass = cn(
  "max-w-full min-w-0 flex-1 rounded border border-slate-200/90 bg-white py-1 pl-1.5 pr-6",
  "text-[11px] font-medium text-slate-800",
  "focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900/10",
);

export function GenerationControls({ tone, emphasis, length, onChange }: Props) {
  return (
    <section className="px-3.5 py-2">
      <div className="cc-label mb-1.5">Draft</div>
      <div className="flex flex-wrap gap-2">
        <label className="flex min-w-[108px] flex-1 items-center gap-1.5">
          <span className="sr-only">Tone</span>
          <select
            className={selectClass}
            value={tone}
            aria-label="Tone"
            onChange={(e) => onChange({ tone: e.target.value as DefaultTone, emphasis, length })}
          >
            {tones.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[108px] flex-1 items-center gap-1.5">
          <span className="sr-only">Emphasis</span>
          <select
            className={selectClass}
            value={emphasis}
            aria-label="Emphasis"
            onChange={(e) => onChange({ tone, emphasis: e.target.value as Emphasis, length })}
          >
            {emphases.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-[88px] shrink-0 items-center gap-1.5">
          <span className="sr-only">Length</span>
          <select
            className={selectClass}
            value={length}
            aria-label="Length"
            onChange={(e) => onChange({ tone, emphasis, length: e.target.value as LetterLength })}
          >
            {lengths.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
