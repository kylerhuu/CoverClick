import { cn } from "../lib/classNames";
import { fitScoreMatchLabel } from "../hub/applicationDisplay";

type Props = {
  score: number;
  size?: "sm" | "md";
  className?: string;
};

export function FitScoreRing({ score, size = "md", className }: Props) {
  const label = fitScoreMatchLabel(score);
  const dim = size === "sm" ? "h-14 w-14" : "h-[4.5rem] w-[4.5rem]";
  const text = size === "sm" ? "text-[13px]" : "text-[15px]";
  const sub = size === "sm" ? "text-[9px]" : "text-[10px]";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className={cn(
          dim,
          "flex flex-col items-center justify-center rounded-full border-[3px] border-[#22C55E]/35 bg-white shadow-sm",
        )}
      >
        <span className={cn(text, "font-bold leading-none text-slate-900")}>{score}%</span>
      </div>
      <span className={cn(sub, "mt-1 font-semibold text-[#22C55E]")}>{label}</span>
    </div>
  );
}
