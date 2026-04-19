import type { ProfileImportConflict } from "../../lib/profileImportReview";
import { cn } from "../../lib/classNames";
import { ccSurfaceQuiet } from "../../ui/ccUi";

type Props = {
  conflicts: ProfileImportConflict[];
};

export function ResumeImportComparePanel({ conflicts }: Props) {
  if (!conflicts.length) return null;

  return (
    <div className="space-y-3">
      <p className="text-[12px] font-semibold text-slate-900">Where your profile and the import disagree</p>
      <p className="text-[11px] leading-snug text-slate-600">
        <strong>Merge</strong> uses the resume value whenever the model returned text for a field (empty fields on the resume keep what you already had).{" "}
        <strong>Replace all</strong> swaps to this import only — anything the model left blank becomes blank in your profile.
      </p>
      <ul className="space-y-3">
        {conflicts.map((c) => (
          <li key={c.id} className={cn(ccSurfaceQuiet, "overflow-hidden")}>
            <div className="border-b border-slate-200/60 bg-slate-50/80 px-3 py-1.5 text-[11px] font-semibold text-slate-800">{c.label}</div>
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:divide-x sm:divide-slate-200/70">
              <div className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">In your profile</p>
                <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-800">{c.before}</pre>
              </div>
              <div className="border-t border-slate-200/60 p-3 sm:border-t-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700/90">From resume import</p>
                <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-800">{c.after}</pre>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
