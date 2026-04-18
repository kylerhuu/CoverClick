import { forwardRef } from "react";
import type { StructuredCoverLetter } from "../../lib/types";
import { cn } from "../../lib/classNames";
import { updateBodyParagraph } from "../../lib/letterModel";

const field = cn(
  "w-full border-0 bg-transparent p-0 text-[13px] leading-[1.65] text-slate-900",
  "placeholder:text-slate-300 focus:outline-none focus:ring-0",
);

type Props = {
  letter: StructuredCoverLetter;
  onChange: (next: StructuredCoverLetter) => void;
  /** When false, fields are disabled (e.g. while generating). */
  editable?: boolean;
};

export const LetterPaper = forwardRef<HTMLDivElement, Props>(function LetterPaper(
  { letter, onChange, editable = true },
  ref,
) {
  const set = (patch: Partial<StructuredCoverLetter>) => onChange({ ...letter, ...patch });

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white p-8 shadow-soft ring-1 ring-slate-900/[0.04]",
        "font-letter text-slate-900 transition-opacity duration-300",
        "min-h-[520px] min-w-0",
        !editable && "pointer-events-none opacity-[0.42]",
      )}
    >
      <textarea
        className={cn(field, "mb-5 min-h-[4.5rem] resize-y")}
        value={letter.senderBlock}
        onChange={(e) => set({ senderBlock: e.target.value })}
        placeholder="Your address block"
        spellCheck={false}
        disabled={!editable}
      />
      <input
        className={cn(field, "mb-6 block")}
        value={letter.dateLine}
        onChange={(e) => set({ dateLine: e.target.value })}
        placeholder="Date"
        disabled={!editable}
      />
      <textarea
        className={cn(field, "mb-6 min-h-[2.5rem] resize-y")}
        value={letter.recipientBlock}
        onChange={(e) => set({ recipientBlock: e.target.value })}
        placeholder="Recipient"
        spellCheck={false}
        disabled={!editable}
      />
      <input
        className={cn(field, "mb-5")}
        value={letter.greeting}
        onChange={(e) => set({ greeting: e.target.value })}
        placeholder="Dear …"
        disabled={!editable}
      />
      <textarea
        className={cn(field, "mb-4 min-h-[5.5rem] resize-y")}
        value={letter.bodyParagraphs[0]}
        onChange={(e) => onChange(updateBodyParagraph(letter, 0, e.target.value))}
        placeholder="Opening paragraph"
        disabled={!editable}
      />
      <textarea
        className={cn(field, "mb-4 min-h-[5.5rem] resize-y")}
        value={letter.bodyParagraphs[1]}
        onChange={(e) => onChange(updateBodyParagraph(letter, 1, e.target.value))}
        placeholder="Middle paragraph"
        disabled={!editable}
      />
      <textarea
        className={cn(field, "mb-6 min-h-[5.5rem] resize-y")}
        value={letter.bodyParagraphs[2]}
        onChange={(e) => onChange(updateBodyParagraph(letter, 2, e.target.value))}
        placeholder="Closing paragraph"
        disabled={!editable}
      />
      <input
        className={cn(field, "mb-3")}
        value={letter.closing}
        onChange={(e) => set({ closing: e.target.value })}
        disabled={!editable}
      />
      <textarea
        className={cn(field, "min-h-[3rem] resize-y")}
        value={letter.signature}
        onChange={(e) => set({ signature: e.target.value })}
        placeholder="Signature"
        spellCheck={false}
        disabled={!editable}
      />
    </div>
  );
});
