import type { ReactNode } from "react";
import { cn } from "../lib/classNames";
import { ccFocusRing } from "./ccUi";

export const wsShell = "bg-[#F5F7FB]";

export const wsNavTrack = "flex flex-wrap items-center gap-0.5 border-b border-slate-200/80";

export function wsNavTab(active: boolean): string {
  return cn(
    "relative shrink-0 px-3 py-2 text-[13px] font-medium transition-colors duration-200",
    active ? "text-slate-900" : "text-slate-500 hover:text-slate-800",
    ccFocusRing,
  );
}

export const wsNavIndicator = "absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#5B4CF0]";

type WorkspaceHeroProps = {
  children: ReactNode;
  className?: string;
};

export function WorkspaceHero({ children, className }: WorkspaceHeroProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 bg-white px-5 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

type WorkspaceSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function WorkspaceSection({ title, description, children, className }: WorkspaceSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">{title}</h3>
        {description ? <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

type WorkspaceCardProps = {
  children: ReactNode;
  className?: string;
};

export function WorkspaceCard({ children, className }: WorkspaceCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

type WorkspaceStatProps = {
  label: string;
  value: string | number;
  highlight?: boolean;
};

export function WorkspaceStat({ label, value, highlight }: WorkspaceStatProps) {
  return (
    <div className="min-w-0">
      <p className={cn("text-[20px] font-bold tracking-tight", highlight ? "text-[#5B4CF0]" : "text-slate-900")}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-medium text-slate-500">{label}</p>
    </div>
  );
}

type WorkspaceActionCardProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  actionLabel: string;
  onAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};

export function WorkspaceActionCard({
  title,
  subtitle,
  meta,
  badge,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: WorkspaceActionCardProps) {
  return (
    <div className="group flex flex-col gap-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-[#5B4CF0]/25 hover:shadow-[0_8px_24px_rgba(91,76,240,0.08)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[15px] font-bold tracking-tight text-slate-900">{title}</p>
          {badge ? (
            <span className="rounded-full bg-[#5B4CF0]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#5B4CF0]">
              {badge}
            </span>
          ) : null}
        </div>
        {subtitle ? <p className="mt-1 text-[13px] font-medium text-[#5B4CF0]">{subtitle}</p> : null}
        {meta ? <p className="mt-1 text-[12px] text-slate-500">{meta}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {secondaryActionLabel && onSecondaryAction ? (
          <button
            type="button"
            className="text-[12px] font-semibold text-slate-600 hover:text-slate-900"
            onClick={onSecondaryAction}
          >
            {secondaryActionLabel}
          </button>
        ) : null}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#5B4CF0] hover:text-[#4f46e5]"
          onClick={onAction}
        >
          {actionLabel}
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}

export const wsPageIntro = "text-[12px] leading-relaxed text-slate-500";

export const wsHeroName = "text-[22px] font-bold tracking-tight text-slate-900";

export const wsHeroSubtitle = "text-[13px] font-medium text-[#5B4CF0]";

export const wsCompletenessBar = "h-1.5 overflow-hidden rounded-full bg-slate-100";

export function wsCompletenessFill(score: number): string {
  const color = score >= 80 ? "bg-[#22C55E]" : score >= 50 ? "bg-[#F59E0B]" : "bg-[#5B4CF0]";
  return cn("h-full rounded-full transition-all duration-300", color);
}
