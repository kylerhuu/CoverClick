import type { DefaultTone, Emphasis, LetterLength, ResponseShapePreference } from "../../lib/types";
import { cn } from "../../lib/classNames";

type Props = {
  tone: DefaultTone;
  emphasis: Emphasis;
  length: LetterLength;
  responseShape: ResponseShapePreference;
  onChange: (next: {
    tone: DefaultTone;
    emphasis: Emphasis;
    length: LetterLength;
    responseShape: ResponseShapePreference;
  }) => void;
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

const shapes: { value: ResponseShapePreference; label: string }[] = [
  { value: "structured", label: "Structured" },
  { value: "plain", label: "Plain" },
  { value: "auto", label: "Auto" },
];

const selectClass = cn(
  "max-w-full min-w-0 flex-1 rounded-lg border border-slate-200/90 bg-white py-1.5 pl-2 pr-7",
  "text-[11px] font-medium text-slate-800 shadow-sm",
  "focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
);

export function GenerationControls({ tone, emphasis, length, responseShape, onChange }: Props) {
  return (
    <section className="border-b border-slate-200/70 bg-gradient-to-b from-white to-slate-50/80 px-3 py-2.5 sm:px-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="cc-label text-indigo-600/90">Draft settings</span>
        <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">Model</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="flex min-w-[104px] flex-1">
          <span className="sr-only">Tone</span>
          <select
            className={selectClass}
            value={tone}
            aria-label="Tone"
            onChange={(e) => onChange({ tone: e.target.value as DefaultTone, emphasis, length, responseShape })}
          >
            {tones.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[104px] flex-1">
          <span className="sr-only">Emphasis</span>
          <select
            className={selectClass}
            value={emphasis}
            aria-label="Emphasis"
            onChange={(e) => onChange({ tone, emphasis: e.target.value as Emphasis, length, responseShape })}
          >
            {emphases.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-[92px] shrink-0">
          <span className="sr-only">Length</span>
          <select
            className={selectClass}
            value={length}
            aria-label="Length"
            onChange={(e) => onChange({ tone, emphasis, length: e.target.value as LetterLength, responseShape })}
          >
            {lengths.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[92px] shrink-0">
          <span className="sr-only">API shape</span>
          <select
            className={selectClass}
            value={responseShape}
            aria-label="Response shape for API"
            onChange={(e) =>
              onChange({
                tone,
                emphasis,
                length,
                responseShape: e.target.value as ResponseShapePreference,
              })
            }
          >
            {shapes.map((t) => (
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
