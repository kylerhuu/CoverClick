import { useEffect } from "react";
import { createPortal } from "react-dom";
import { PRO_UPGRADE_BULLETS, PRO_UPGRADE_HEADLINE } from "../lib/planMessaging";
import { cn } from "../lib/classNames";
import { ccBtnPrimary, ccFocusRing } from "./ccUi";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onUpgrade: () => void;
};

export function UpgradeModal({
  open,
  title = PRO_UPGRADE_HEADLINE,
  description = "Unlock the full application workflow and unlimited AI drafting.",
  onClose,
  onUpgrade,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5B4CF0]">Pro feature</p>
        <h2 className="mt-2 text-[18px] font-bold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{description}</p>
        <ul className="mt-4 space-y-2">
          {PRO_UPGRADE_BULLETS.map((item) => (
            <li key={item} className="flex items-start gap-2 text-[13px] text-slate-700">
              <span className="mt-0.5 text-[#22C55E]" aria-hidden>
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={cn(
              "rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100",
              ccFocusRing,
            )}
            onClick={onClose}
          >
            Not now
          </button>
          <button
            type="button"
            className={cn(ccBtnPrimary, "px-4 py-2")}
            onClick={() => {
              onUpgrade();
              onClose();
            }}
          >
            {PRO_UPGRADE_HEADLINE}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
