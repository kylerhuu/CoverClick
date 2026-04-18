import { getOpenAI, getOpenAIModel } from "./openaiClient.js";

const CLEAN_MODEL = process.env.OPENAI_CLEAN_MODEL?.trim() || "gpt-4o-mini";

/**
 * Cheap extraction-only pass: remove navigation, similar jobs, and boilerplate from noisy page text.
 * Does not rewrite job facts or invent requirements.
 */
export async function cleanJobDescriptionWithOpenAI(rawText: string): Promise<string> {
  const openai = getOpenAI();
  const model = CLEAN_MODEL || getOpenAIModel();
  const input = rawText.trim();
  if (!input) return "";

  const user = [
    "Below is noisy plain text copied from a job board page (may include sidebars, chips, similar jobs, footers).",
    "Return ONLY the main job posting: role summary, responsibilities, qualifications, benefits if present in the posting.",
    "Rules:",
    "- Plain text only, same language as input.",
    "- Do NOT invent company facts, salary, or requirements not present.",
    "- Do NOT summarize into bullets unless the source already uses bullets; keep structure close to the source.",
    "- Remove navigation, search UI, login prompts, cookie banners, related jobs, recommendations, and duplicate headings.",
    "- If multiple jobs appear, keep only the primary posting that matches the bulk of the text.",
    "\n---\n",
    input.length > 26_000 ? `${input.slice(0, 26_000)}\n\n[truncated]` : input,
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.1,
    max_tokens: 3600,
    messages: [
      {
        role: "system",
        content:
          "You extract job posting body text for a recruiting tool. Output only the cleaned posting text, no preamble.",
      },
      { role: "user", content: user },
    ],
  });

  const out = completion.choices[0]?.message?.content?.trim() ?? "";
  return out;
}
