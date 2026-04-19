export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Shared field chrome for popup + options. */
export const fieldInputClass = cn(
  "w-full rounded-lg border border-slate-200/90 bg-white px-3 py-2",
  "text-[13px] text-slate-900 leading-snug",
  "shadow-[0_1px_0_rgba(15,23,42,0.02)] transition-colors",
  "placeholder:text-slate-400",
  "hover:border-slate-300/90",
  "focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/15",
);

export const fieldSelectClass = cn(fieldInputClass, "cursor-pointer bg-white");

export const fieldTextareaClass = cn(fieldInputClass, "resize-y min-h-[80px] leading-relaxed");
