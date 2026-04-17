export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Shared field chrome for popup + options. */
export const fieldInputClass = cn(
  "w-full rounded-md border border-slate-200/90 bg-white px-2.5 py-1.5",
  "text-[13px] text-slate-900 leading-snug",
  "shadow-none transition-colors",
  "placeholder:text-slate-400",
  "focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900/10",
);

export const fieldSelectClass = cn(fieldInputClass, "cursor-pointer bg-white");

export const fieldTextareaClass = cn(fieldInputClass, "resize-y min-h-[88px] leading-relaxed");
