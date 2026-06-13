import type { ResumeVariant } from "../../lib/resumeLibrary";
import { requestOptionsTab } from "../../lib/openOptionsTab";
import { cn } from "../../lib/classNames";
import { ccEyebrow, ccFocusRing } from "../../ui/ccUi";

type Props = {
  variants: ResumeVariant[];
  activeId: string;
  onSelect: (id: string) => void;
  variant?: "default" | "compact";
};

export function ResumeVariantSelector({ variants, activeId, onSelect, variant = "default" }: Props) {
  const active = variants.find((v) => v.id === activeId) ?? variants[0];

  if (variant === "compact") {
    if (variants.length === 0) {
      return (
        <p className="text-[12px] font-medium text-slate-500">No saved resume — add one in Profile.</p>
      );
    }

    if (variants.length === 1) {
      return (
        <p className="text-[12px] text-slate-600">
          Resume: <span className="font-semibold text-slate-900">{active?.name ?? "General"}</span>
        </p>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-600">
        <span>Resume:</span>
        <select
          className={cn(
            "min-w-0 max-w-full cursor-pointer border-0 bg-transparent p-0 text-[12px] font-semibold text-slate-900",
            "underline decoration-indigo-300/80 underline-offset-2",
            "focus:outline-none focus:ring-0",
            ccFocusRing,
          )}
          value={active?.id ?? ""}
          onChange={(e) => onSelect(e.target.value)}
          aria-label="Resume version"
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const showDropdown = variants.length > 1;

  return (
    <div className="space-y-2">
      <p className={ccEyebrow}>Resume Version</p>

      {showDropdown ? (
        <select
          className={cn(
            "w-full rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-[13px] font-semibold text-slate-900 shadow-sm",
            "focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/15",
          )}
          value={active?.id ?? ""}
          onChange={(e) => onSelect(e.target.value)}
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      ) : (
        <p className="rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-[13px] font-semibold text-slate-900 shadow-sm">
          {active?.name ?? "General"}
        </p>
      )}

      <p className="text-[10px] leading-snug text-slate-500">
        Select which saved resume to use for this job. Edit content in Saved Resumes (Profile).
      </p>

      <button
        type="button"
        className={cn(
          "text-[11px] font-semibold text-indigo-700 hover:text-indigo-900",
          ccFocusRing,
        )}
        onClick={() => void requestOptionsTab("resumes")}
      >
        Manage saved resumes →
      </button>
    </div>
  );
}
