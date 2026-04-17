import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { letterParagraphBlocks } from "./letterFormatting";
import { sanitizeFilenamePart } from "./utils";

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const RUN = { font: "Calibri" as const, size: 22 as const };

/** One visual line break inside a paragraph (Word line break). */
function lineBreakRun(): TextRun {
  return new TextRun({ break: 1 });
}

function paragraphFromBlock(block: string): Paragraph {
  const lines = block.split("\n");
  const children: TextRun[] = [];
  lines.forEach((line, i) => {
    children.push(new TextRun({ text: line.length ? line : " ", ...RUN }));
    if (i < lines.length - 1) children.push(lineBreakRun());
  });
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 200, line: 276 },
    children,
  });
}

export async function downloadCoverLetterDocx(params: {
  fullName: string;
  companyName: string;
  jobTitle: string;
  letterText: string;
}): Promise<void> {
  const namePart = sanitizeFilenamePart(params.fullName, "Applicant");
  const companyPart = sanitizeFilenamePart(params.companyName, "Company");
  const rolePart = sanitizeFilenamePart(params.jobTitle, "Role");
  const filename = `${namePart}_CoverLetter_${companyPart}_${rolePart}.docx`;

  const blocks = letterParagraphBlocks(params.letterText);
  const bodyChildren =
    blocks.length > 0
      ? blocks.map((block) => paragraphFromBlock(block))
      : [
          new Paragraph({
            spacing: { after: 200, line: 276 },
            children: [new TextRun({ text: " ", ...RUN })],
          }),
        ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: bodyChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, filename);
}
