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
};

export const LetterPaper = forwardRef<HTMLDivElement, Props>(function LetterPaper({ letter, onChange }, ref) {
  const set = (patch: Partial<StructuredCoverLetter>) => onChange({ ...letter, ...patch });

  return (
    <div
      ref={ref}
      className={cn(
        "rounded border border-slate-200/90 bg-white p-8 shadow-sm",
        "font-letter text-slate-900",
        "min-h-[520px] min-w-0",
      )}
    >
      <textarea
        className={cn(field, "mb-5 min-h-[4.5rem] resize-y")}
        value={letter.senderBlock}
        onChange={(e) => set({ senderBlock: e.target.value })}
        placeholder="Your address block"
        spellCheck={false}
      />
      <input
        className={cn(field, "mb-6 block")}
        value={letter.dateLine}
        onChange={(e) => set({ dateLine: e.target.value })}
        placeholder="Date"
      />
      <textarea
        className={cn(field, "mb-6 min-h-[2.5rem] resize-y")}
        value={letter.recipientBlock}
        onChange={(e) => set({ recipientBlock: e.target.value })}
        placeholder="Recipient"
        spellCheck={false}
      />
      <input
        className={cn(field, "mb-5")}
        value={letter.greeting}
        onChange={(e) => set({ greeting: e.target.value })}
        placeholder="Dear …"
      />
      <textarea
        className={cn(field, "mb-4 min-h-[5.5rem] resize-y")}
        value={letter.bodyParagraphs[0]}
        onChange={(e) => onChange(updateBodyParagraph(letter, 0, e.target.value))}
        placeholder="Opening paragraph"
      />
      <textarea
        className={cn(field, "mb-4 min-h-[5.5rem] resize-y")}
        value={letter.bodyParagraphs[1]}
        onChange={(e) => onChange(updateBodyParagraph(letter, 1, e.target.value))}
        placeholder="Middle paragraph"
      />
      <textarea
        className={cn(field, "mb-6 min-h-[5.5rem] resize-y")}
        value={letter.bodyParagraphs[2]}
        onChange={(e) => onChange(updateBodyParagraph(letter, 2, e.target.value))}
        placeholder="Closing paragraph"
      />
      <input className={cn(field, "mb-3")} value={letter.closing} onChange={(e) => set({ closing: e.target.value })} />
      <textarea
        className={cn(field, "min-h-[3rem] resize-y")}
        value={letter.signature}
        onChange={(e) => set({ signature: e.target.value })}
        placeholder="Signature"
        spellCheck={false}
      />
    </div>
  );
});
