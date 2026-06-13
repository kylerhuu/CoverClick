import { cn } from "../lib/classNames";
import { ccBtnPrimarySm } from "./ccUi";

type Props = {
  isPro: boolean;
  className?: string;
  onUpgrade?: () => void;
  compact?: boolean;
};

export function PlanBadge({ isPro, className, onUpgrade, compact = false }: Props) {
  if (isPro) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/80",
          className,
        )}
      >
        Pro plan <span aria-hidden>✓</span>
      </span>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/80">
        Free plan
      </span>
      {onUpgrade && !compact ? (
        <button type="button" className={cn(ccBtnPrimarySm, "py-1 text-[11px]")} onClick={onUpgrade}>
          Upgrade
        </button>
      ) : null}
    </div>
  );
}
