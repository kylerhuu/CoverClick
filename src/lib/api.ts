import type { GenerationRequest, GenerationResponse } from "./types";
import { buildCoverLetterPromptBrief } from "./prompts";

function mockCoverLetter(req: GenerationRequest): string {
  const name = req.profile.fullName.trim() || "Your Name";
  const role = req.job.jobTitle.trim() || "this role";
  const company = req.job.companyName.trim() || "your team";
  const bullets = [
    ...req.profile.experienceBullets.slice(0, 2),
    ...req.profile.projectBullets.slice(0, 1),
  ]
    .map((b) => b.trim())
    .filter(Boolean);

  const proof =
    bullets.length > 0
      ? `In recent work, I’ve focused on outcomes like: ${bullets.join(" ")}`
      : req.profile.summary.trim()
        ? `My background aligns with what you’re hiring for—${req.profile.summary.trim().slice(0, 220)}${req.profile.summary.length > 220 ? "…" : ""}`
        : "I’m excited to bring a careful, collaborative approach to how I scope problems, ship iteratively, and communicate clearly with stakeholders.";

  const sig =
    req.profile.signatureBlock.trim() ||
    `Sincerely,\n${name}`;

  return [
    `Dear ${company} hiring team,`,
    "",
    `I’m writing to express my strong interest in the ${role} opportunity. I’ve been following ${company} and appreciate the clarity of the problems you’re solving—and the bar you set for craft and ownership.`,
    "",
    proof,
    "",
    `What draws me to this posting is the combination of depth and pace: ${req.emphasis} work at a ${req.tone} tone, with room to contribute end-to-end. I’m especially motivated by teams that value pragmatic tradeoffs, crisp writing, and respectful debate.`,
    "",
    "If there’s a fit, I’d love a conversation to learn more about the team’s roadmap and how I can help you ship confidently in the next chapter.",
    "",
    sig,
  ].join("\n");
}

export async function generateCoverLetter(
  settings: { apiBaseUrl: string; useMock: boolean },
  body: GenerationRequest,
): Promise<GenerationResponse> {
  if (settings.useMock) {
    await new Promise((r) => setTimeout(r, 450));
    return { coverLetter: mockCoverLetter(body) };
  }

  const url = `${settings.apiBaseUrl}/api/generate-cover-letter`;
  const promptBrief = buildCoverLetterPromptBrief(body);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      promptBrief,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Generation failed (${res.status})`);
  }

  const json = (await res.json()) as Partial<GenerationResponse>;
  if (typeof json.coverLetter !== "string" || !json.coverLetter.trim()) {
    throw new Error("Invalid response from server.");
  }
  return { coverLetter: json.coverLetter.trim() };
}
