import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import type { StructuredCoverLetter } from "./types";
import { sanitizeExportBasename, sanitizeFilenamePart } from "./utils";

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const RUN = { font: "Calibri" as const, size: 22 as const };

function lineBreakRun(): TextRun {
  return new TextRun({ break: 1 });
}

function paragraphFromMultiline(text: string, spacingAfter: number): Paragraph {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const children: TextRun[] = [];
  lines.forEach((line, i) => {
    children.push(new TextRun({ text: line.length ? line : " ", ...RUN }));
    if (i < lines.length - 1) children.push(lineBreakRun());
  });
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: spacingAfter, line: 276 },
    children,
  });
}

function paragraphSingle(text: string, spacingAfter: number): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: spacingAfter, line: 276 },
    children: [new TextRun({ text: text.trim() || " ", ...RUN })],
  });
}

export async function downloadStructuredCoverLetterDocx(params: {
  fullName: string;
  companyName: string;
  jobTitle: string;
  letter: StructuredCoverLetter;
  /** Optional basename without extension; overrides auto naming when non-empty after sanitize. */
  fileBaseName?: string;
}): Promise<void> {
  const namePart = sanitizeFilenamePart(params.fullName, "Applicant");
  const companyPart = sanitizeFilenamePart(params.companyName, "Company");
  const rolePart = sanitizeFilenamePart(params.jobTitle, "Role");
  const legacyBase = `${namePart}_CoverLetter_${companyPart}_${rolePart}`;
  const base = params.fileBaseName?.trim()
    ? sanitizeExportBasename(params.fileBaseName, legacyBase)
    : legacyBase;
  const filename = `${base}.docx`;

  const L = params.letter;
  const children: Paragraph[] = [
    paragraphFromMultiline(L.senderBlock, 240),
    paragraphSingle(L.dateLine, 360),
    paragraphFromMultiline(L.recipientBlock, 480),
    paragraphSingle(L.greeting, 360),
    paragraphFromMultiline(L.bodyParagraphs[0], 360),
    paragraphFromMultiline(L.bodyParagraphs[1], 360),
    paragraphFromMultiline(L.bodyParagraphs[2], 480),
    paragraphSingle(L.closing, 120),
    paragraphFromMultiline(L.signature, 0),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, filename);
}
