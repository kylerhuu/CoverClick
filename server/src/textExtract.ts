import mammoth from "mammoth";

const MAX_CHARS = 28_000;

function clip(s: string): string {
  const t = s.replace(/\r\n/g, "\n").trim();
  if (t.length <= MAX_CHARS) return t;
  return `${t.slice(0, MAX_CHARS)}\n\n[…truncated…]`;
}

export async function extractTextFromResumeBuffer(
  buffer: Buffer,
  originalName: string,
): Promise<{ text: string; mimeGuess: string }> {
  const lower = originalName.toLowerCase();

  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return { text: clip(buffer.toString("utf8")), mimeGuess: "text/plain" };
  }

  if (lower.endsWith(".docx")) {
    const res = await mammoth.extractRawText({ buffer });
    return { text: clip(res.value), mimeGuess: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  }

  if (lower.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return { text: clip(String(data.text || "")), mimeGuess: "application/pdf" };
  }

  throw new Error("Unsupported file type. Use PDF, DOCX, or TXT.");
}
