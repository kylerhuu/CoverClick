import type { DefaultTone, Emphasis, LetterLength, ResponseShapePreference } from "../../lib/types";
import { cn } from "../../lib/classNames";
import { ccMetadataLabel } from "../../ui/ccUi";

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
  exportBasename?: string;
  onExportBasenameChange?: (value: string) => void;
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
  "w-full min-w-0 rounded-md border border-slate-200/80 bg-white py-1.5 pl-2 pr-7",
  "text-[11px] font-medium text-slate-700",
  "focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/20",
);

export function GenerationControls({
  tone,
  emphasis,
  length,
  responseShape,
  onChange,
  exportBasename,
  onExportBasenameChange,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block min-w-0">
        <span className={ccMetadataLabel}>Tone</span>
        <select
          className={cn(selectClass, "mt-1")}
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
      <label className="block min-w-0">
        <span className={ccMetadataLabel}>Emphasis</span>
        <select
          className={cn(selectClass, "mt-1")}
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
      <label className="block min-w-0">
        <span className={ccMetadataLabel}>Length</span>
        <select
          className={cn(selectClass, "mt-1")}
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
      <label className="block min-w-0">
        <span className={ccMetadataLabel}>Format</span>
        <select
          className={cn(selectClass, "mt-1")}
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
      {exportBasename != null && onExportBasenameChange ? (
        <label className="block min-w-0 sm:col-span-2">
          <span className={ccMetadataLabel}>Export file name</span>
          <input
            type="text"
            value={exportBasename}
            onChange={(e) => onExportBasenameChange(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            className={cn(selectClass, "mt-1")}
            placeholder="Name_Role_Company_CoverLetter"
          />
        </label>
      ) : null}
    </div>
  );
}
