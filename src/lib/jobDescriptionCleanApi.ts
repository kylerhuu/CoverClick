import { ApiHttpError, normalizeApiOrigin, readApiErrorBody } from "./backendApi";

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
  let res: Response;
  try {
    res = await fetch(`${origin}/api/clean-job-description`, {
      method: "POST",
      headers,
      mode: "cors",
      cache: "no-store",
      body: JSON.stringify({ rawText: body }),
    });
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(`Could not reach the server (${origin}). Check your network and that the API is running.`);
    }
    throw e;
  }
  if (!res.ok) {
    throw new ApiHttpError(res.status, await readApiErrorBody(res));
  }
  const j = (await res.json()) as { description?: string };
  if (typeof j.description !== "string") throw new Error("Invalid clean response.");
  return j.description.trim();
}
