import { normalizeApiOrigin } from "./backendApi";

export async function requestCleanJobDescription(
  apiBaseUrl: string,
  rawText: string,
  authToken: string | undefined,
): Promise<string> {
  const origin = normalizeApiOrigin(apiBaseUrl);
  const max = 28_000;
  const body = rawText.length > max ? `${rawText.slice(0, max)}\n\n[…truncated]` : rawText;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const t = authToken?.trim();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${origin}/api/clean-job-description`, {
    method: "POST",
    headers,
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
