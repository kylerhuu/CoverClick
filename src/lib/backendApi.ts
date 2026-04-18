import type { UserProfile } from "./types";

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const j = JSON.parse(text) as { error?: string };
    if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
  } catch {
    // ignore
  }
  return text.trim() || `Request failed (${res.status})`;
}

export async function apiRegister(
  apiBaseUrl: string,
  body: { email: string; password: string },
): Promise<{ token: string; user: { id: string; email: string } }> {
  const res = await fetch(`${apiBaseUrl}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<{ token: string; user: { id: string; email: string } }>;
}

export async function apiLogin(
  apiBaseUrl: string,
  body: { email: string; password: string },
): Promise<{ token: string; user: { id: string; email: string } }> {
  const res = await fetch(`${apiBaseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<{ token: string; user: { id: string; email: string } }>;
}

export async function apiGetServerProfile(
  apiBaseUrl: string,
  token: string,
): Promise<{ profile: UserProfile | null }> {
  const res = await fetch(`${apiBaseUrl}/api/me/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<{ profile: UserProfile | null }>;
}

export async function apiPutServerProfile(
  apiBaseUrl: string,
  token: string,
  profile: UserProfile,
): Promise<void> {
  const res = await fetch(`${apiBaseUrl}/api/me/profile`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ profile }),
  });
  if (!res.ok) throw new Error(await readError(res));
}

export async function apiParseResume(
  apiBaseUrl: string,
  token: string,
  file: File,
): Promise<{ profile: UserProfile; warnings?: string[] }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${apiBaseUrl}/api/me/parse-resume`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<{ profile: UserProfile; warnings?: string[] }>;
}
