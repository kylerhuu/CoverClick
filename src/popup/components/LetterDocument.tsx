import type { StructuredCoverLetter } from "../../lib/types";
import { cn } from "../../lib/classNames";
import { updateBodyParagraph } from "../../lib/letterModel";

type EditorProps = {
  variant: "editor";
  letter: StructuredCoverLetter;
  onChange: (next: StructuredCoverLetter) => void;
  editable: boolean;
};

type ExportProps = {
  variant: "export";
  letter: StructuredCoverLetter;
};

/** Read-only US Letter page for in-panel preview (no `#letter-container`; PDF uses `export`). */
type PreviewProps = {
  variant: "preview";
  letter: StructuredCoverLetter;
};

type Props = EditorProps | ExportProps | PreviewProps;

function StaticSection({ className, children }: { className?: string; children: string }) {
  const t = children.trim();
  if (!t) return null;
  return <div className={className}>{t}</div>;
}

function StaticBody({ paragraphs }: { paragraphs: [string, string, string] }) {
  let lead = true;
  return (
    <>
      {paragraphs.map((p, i) => {
        const t = p.trim();
        if (!t) return null;
        const isLead = lead;
        lead = false;
        return (
          <p key={i} className={cn("letter-doc-body", isLead && "letter-doc-body--lead")}>
            {t}
          </p>
        );
      })}
    </>
  );
}

/** Read-only US Letter layout. Use `printId` for PDF export (`#letter-container`). */
function LetterPageStaticReadOnly({ letter, printId }: { letter: StructuredCoverLetter; printId: boolean }) {
  const [a, b, c] = letter.bodyParagraphs;
  const has =
    letter.senderBlock.trim() ||
    letter.dateLine.trim() ||
    letter.recipientBlock.trim() ||
    letter.greeting.trim() ||
    a.trim() ||
    b.trim() ||
    c.trim() ||
    letter.closing.trim() ||
    letter.signature.trim();

  return (
    <div id={printId ? "letter-container" : undefined} data-variant={printId ? undefined : "preview"} className="letter-doc-page">
      {has ? (
        <>
          <StaticSection className="letter-doc-sender">{letter.senderBlock}</StaticSection>
          <StaticSection className="letter-doc-date">{letter.dateLine}</StaticSection>
          <StaticSection className="letter-doc-recipient">{letter.recipientBlock}</StaticSection>
          <StaticSection className="letter-doc-greeting">{letter.greeting}</StaticSection>
          <StaticBody paragraphs={[a, b, c]} />
          <div className="letter-doc-closing-wrap">
            {letter.closing.trim() ? <div className="letter-doc-closing-line">{letter.closing.trim()}</div> : null}
            {letter.signature.trim() ? <div className="letter-doc-signature">{letter.signature.trim()}</div> : null}
          </div>
        </>
      ) : (
        <p className="letter-doc-body letter-doc-body--lead">&nbsp;</p>
      )}
    </div>
  );
}

/** Editable page: same classes and rhythm as export; data-variant enables subtle focus only. */
function LetterPageEditor({
  letter,
  onChange,
  editable,
}: {
  letter: StructuredCoverLetter;
  onChange: (next: StructuredCoverLetter) => void;
  editable: boolean;
}) {
  const set = (patch: Partial<StructuredCoverLetter>) => onChange({ ...letter, ...patch });
  const field = cn("letter-doc-field", !editable && "pointer-events-none opacity-[0.45]");

  return (
    <div className="letter-doc-page" data-variant="editor">
      <div className="letter-doc-block-sender">
        <textarea
          className={cn(field, "letter-doc-sender")}
          value={letter.senderBlock}
          onChange={(e) => set({ senderBlock: e.target.value })}
          placeholder="Your address block"
          spellCheck={false}
          disabled={!editable}
          rows={4}
        />
      </div>
      <div className="letter-doc-block-date">
        <input
          className={field}
          value={letter.dateLine}
          onChange={(e) => set({ dateLine: e.target.value })}
          placeholder="Date"
          disabled={!editable}
        />
      </div>
      <div className="letter-doc-block-recipient">
        <textarea
          className={cn(field, "letter-doc-recipient")}
          value={letter.recipientBlock}
          onChange={(e) => set({ recipientBlock: e.target.value })}
          placeholder="Recipient"
          spellCheck={false}
          disabled={!editable}
          rows={3}
        />
      </div>
      <div className="letter-doc-block-greeting">
        <input
          className={cn(field, "letter-doc-greeting-field")}
          value={letter.greeting}
          onChange={(e) => set({ greeting: e.target.value })}
          placeholder="Dear …"
          disabled={!editable}
        />
      </div>
      <div className="letter-doc-block-body letter-doc-block-body--lead">
        <textarea
          className={cn(field, "letter-doc-body-field")}
          value={letter.bodyParagraphs[0]}
          onChange={(e) => onChange(updateBodyParagraph(letter, 0, e.target.value))}
          placeholder="Opening paragraph"
          disabled={!editable}
          rows={6}
        />
      </div>
      <div className="letter-doc-block-body">
        <textarea
          className={cn(field, "letter-doc-body-field")}
          value={letter.bodyParagraphs[1]}
          onChange={(e) => onChange(updateBodyParagraph(letter, 1, e.target.value))}
          placeholder="Middle paragraph"
          disabled={!editable}
          rows={6}
        />
      </div>
      <div className="letter-doc-block-body">
        <textarea
          className={cn(field, "letter-doc-body-field")}
          value={letter.bodyParagraphs[2]}
          onChange={(e) => onChange(updateBodyParagraph(letter, 2, e.target.value))}
          placeholder="Closing paragraph"
          disabled={!editable}
          rows={6}
        />
      </div>
      <div className="letter-doc-block-close">
        <input
          className={cn(field, "letter-doc-closing-line letter-doc-closing-field")}
          value={letter.closing}
          onChange={(e) => set({ closing: e.target.value })}
          placeholder="Closing (e.g. Sincerely,)"
          disabled={!editable}
        />
      </div>
      <div className="letter-doc-block-signature">
        <textarea
          className={field}
          value={letter.signature}
          onChange={(e) => set({ signature: e.target.value })}
          placeholder="Signature"
          spellCheck={false}
          disabled={!editable}
          rows={3}
        />
      </div>
    </div>
  );
}

/**
 * `export`: off-screen clone with id="letter-container" for html2canvas PDF only.
 * `editor`: live preview + editing — same `.letter-doc-page` as export (no border/shadow on page).
 */
export function LetterDocument(props: Props) {
  if (props.variant === "export") {
    return <LetterPageStaticReadOnly letter={props.letter} printId />;
  }
  if (props.variant === "preview") {
    return <LetterPageStaticReadOnly letter={props.letter} printId={false} />;
  }
  return <LetterPageEditor letter={props.letter} onChange={props.onChange} editable={props.editable} />;
}
