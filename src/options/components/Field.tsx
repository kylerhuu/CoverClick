import type { ReactNode } from "react";
import { cn } from "../../lib/classNames";

export type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function Field({ label, hint, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5 text-left", className)}>
      <div>
        <div className="text-[12px] font-medium text-slate-800">{label}</div>
        {hint ? <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}
