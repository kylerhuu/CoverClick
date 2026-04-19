import type { AccountMeResponse, AuthExchangeResponse, UserProfile } from "./types";

/** Thrown on non-2xx API responses so callers can distinguish 401 (clear session) from transient errors. */
export class ApiHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
  }
}

/** Normalize saved origin: trim and strip trailing slashes so paths join cleanly. */
export function normalizeApiOrigin(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

function apiUrl(base: string, path: string): string {
  const origin = normalizeApiOrigin(base);
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${p}`;
}

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      mode: "cors",
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof TypeError) {
      const origin = url.split("/api")[0] || url;
      throw new Error(
        `Could not reach the server (${origin}). Check your network and that the API is running.`,
      );
    }
    throw e;
  }
}

export async function readApiErrorBody(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const j = JSON.parse(text) as { error?: string };
    if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
  } catch {
    // ignore
  }
  return text.trim() || `Request failed (${res.status})`;
}

async function requireOk(res: Response): Promise<void> {
  if (res.ok) return;
  throw new ApiHttpError(res.status, await readApiErrorBody(res));
}

export async function apiGetMe(apiBaseUrl: string, token: string): Promise<AccountMeResponse> {
  const res = await apiFetch(apiUrl(apiBaseUrl, "/api/me"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  await requireOk(res);
  return res.json() as Promise<AccountMeResponse>;
}

export async function apiAuthExchangeWithCode(apiBaseUrl: string, code: string): Promise<AuthExchangeResponse> {
  const res = await apiFetch(apiUrl(apiBaseUrl, "/api/auth/exchange"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  await requireOk(res);
  return res.json() as Promise<AuthExchangeResponse>;
}

export async function apiCreateCheckoutSession(apiBaseUrl: string, token: string): Promise<{ url: string }> {
  const res = await apiFetch(apiUrl(apiBaseUrl, "/api/billing/checkout-session"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  await requireOk(res);
  return res.json() as Promise<{ url: string }>;
}

export async function apiCreatePortalSession(apiBaseUrl: string, token: string): Promise<{ url: string }> {
  const res = await apiFetch(apiUrl(apiBaseUrl, "/api/billing/portal-session"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  await requireOk(res);
  return res.json() as Promise<{ url: string }>;
}

export async function apiGetServerProfile(
  apiBaseUrl: string,
  token: string,
): Promise<{ profile: UserProfile | null }> {
  const res = await apiFetch(apiUrl(apiBaseUrl, "/api/me/profile"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  await requireOk(res);
  return res.json() as Promise<{ profile: UserProfile | null }>;
}

export async function apiPutServerProfile(
  apiBaseUrl: string,
  token: string,
  profile: UserProfile,
): Promise<void> {
  const res = await apiFetch(apiUrl(apiBaseUrl, "/api/me/profile"), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ profile }),
  });
  await requireOk(res);
}

export async function apiParseResume(
  apiBaseUrl: string,
  token: string,
  file: File,
): Promise<{ profile: UserProfile; warnings?: string[] }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiFetch(apiUrl(apiBaseUrl, "/api/me/parse-resume"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  await requireOk(res);
  return res.json() as Promise<{ profile: UserProfile; warnings?: string[] }>;
}
