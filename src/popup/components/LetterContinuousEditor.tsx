import { useLayoutEffect, useRef } from "react";
import { cn } from "../../lib/classNames";

type Props = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

/**
 * One scroll surface: a single textarea that grows with content (no inner scrollbars).
 * Parent column should own `overflow-y-auto`.
 */
export function LetterContinuousEditor({ value, onChange, disabled }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      spellCheck
      rows={1}
      className={cn(
        "box-border w-full resize-none overflow-hidden border-0 bg-white",
        "px-6 py-10 font-serif text-[15px] leading-[1.78] tracking-tight text-slate-900",
        "outline-none ring-0 focus-visible:bg-white",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "sm:px-12 sm:py-12 sm:text-[15px]",
      )}
    />
  );
}
