import { PRO_UPGRADE_BULLETS, PRO_UPGRADE_HEADLINE } from "../lib/planMessaging";
import { cn } from "../lib/classNames";
import { ccBtnPrimary } from "./ccUi";

type Props = {
  title: string;
  subtitle: string;
  bullets?: readonly string[];
  onUpgrade: () => void;
  className?: string;
};

export function ProLockedPanel({
  title,
  subtitle,
  bullets = PRO_UPGRADE_BULLETS,
  onUpgrade,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white px-6 py-10 text-center shadow-sm",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl" aria-hidden>
        🔒
      </div>
      <h2 className="mt-4 text-[17px] font-bold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-slate-600">{subtitle}</p>
      <ul className="mt-5 space-y-2 text-left">
        {bullets.map((item) => (
          <li key={item} className="flex items-center gap-2 text-[13px] text-slate-700">
            <span className="text-[#22C55E]" aria-hidden>
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>
      <button type="button" className={cn(ccBtnPrimary, "mt-6 px-5 py-2.5")} onClick={onUpgrade}>
        {PRO_UPGRADE_HEADLINE}
      </button>
    </div>
  );
}
