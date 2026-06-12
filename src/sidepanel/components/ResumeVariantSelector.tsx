import { useState } from "react";
import type { ResumeVariant } from "../../lib/resumeLibrary";
import { RESUME_VARIANT_NAME_MAX, validateVariantName } from "../../lib/resumeLibrary";
import { cn } from "../../lib/classNames";
import { ccBtnSecondarySm, ccEyebrow, ccFocusRing } from "../../ui/ccUi";

type Props = {
  variants: ResumeVariant[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  createBusy?: boolean;
  createError?: string | null;
};

export function ResumeVariantSelector({
  variants,
  activeId,
  onSelect,
  onCreate,
  createBusy,
  createError,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const active = variants.find((v) => v.id === activeId) ?? variants[0];
  const showDropdown = variants.length > 1;

  const startCreate = () => {
    setCreating(true);
    setDraftName("");
    setLocalError(null);
  };

  const cancelCreate = () => {
    setCreating(false);
    setDraftName("");
    setLocalError(null);
  };

  const submitCreate = async () => {
    const err = validateVariantName(draftName, variants);
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    try {
      await onCreate(draftName.trim());
      setCreating(false);
      setDraftName("");
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not create resume.");
    }
  };

  const displayError = localError ?? createError;

  return (
    <div className="space-y-2">
      <p className={ccEyebrow}>Saved Resume</p>

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

      {creating ? (
        <div className="space-y-2 rounded-lg border border-indigo-200/70 bg-indigo-50/40 p-2.5">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            New resume version name
            <input
              className={cn(
                "mt-1.5 w-full rounded-md border border-slate-200/90 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-900 shadow-sm",
                "focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/15",
              )}
              value={draftName}
              maxLength={RESUME_VARIANT_NAME_MAX}
              placeholder="e.g. Consulting Resume"
              autoFocus
              onChange={(e) => {
                setDraftName(e.target.value);
                setLocalError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitCreate();
                if (e.key === "Escape") cancelCreate();
              }}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className={cn(ccBtnSecondarySm, "flex-1")}
              disabled={createBusy}
              onClick={() => void submitCreate()}
            >
              {createBusy ? "Creating…" : "Create"}
            </button>
            <button type="button" className={cn(ccBtnSecondarySm, "flex-1")} disabled={createBusy} onClick={cancelCreate}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={cn(
            "text-[11px] font-semibold text-indigo-700 hover:text-indigo-900",
            ccFocusRing,
          )}
          onClick={startCreate}
        >
          + Create new resume version
        </button>
      )}

      <p className="text-[10px] leading-snug text-slate-500">
        Changes are saved to this resume version and reused across jobs.
      </p>

      {displayError ? (
        <p className="text-[11px] font-medium text-red-700" role="alert">
          {displayError}
        </p>
      ) : null}
    </div>
  );
}
