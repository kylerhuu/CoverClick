import { normalizeApiOrigin } from "./backendApi";

export async function requestCleanJobDescription(apiBaseUrl: string, rawText: string): Promise<string> {
  const origin = normalizeApiOrigin(apiBaseUrl);
  const max = 28_000;
  const body = rawText.length > max ? `${rawText.slice(0, max)}\n\n[…truncated]` : rawText;
  const res = await fetch(`${origin}/api/clean-job-description`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    mode: "cors",
    cache: "no-store",
    body: JSON.stringify({ rawText: body }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `Clean failed (${res.status})`);
  }
  const j = (await res.json()) as { description?: string };
  if (typeof j.description !== "string") throw new Error("Invalid clean response.");
  return j.description.trim();
}
