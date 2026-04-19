/**
 * Production API origin is baked at extension build time.
 * Set in repo root `.env` / `.env.production`:
 *
 *   VITE_COVERCLICK_API_ORIGIN=https://api.yourdomain.com
 *
 * (no trailing slash). For local dev without a baked URL, use mock mode or
 * optional override in Options (advanced).
 */
export const VITE_COVERCLICK_API_ORIGIN = (import.meta.env.VITE_COVERCLICK_API_ORIGIN as string | undefined)?.trim() ?? "";

const LEGACY_OR_EMPTY = new Set(["", "https://api.example.com"]);

/** True when the extension was built with a default API origin. */
export function hasBuiltInApiOrigin(): boolean {
  return VITE_COVERCLICK_API_ORIGIN.length > 0;
}

/**
 * Effective API origin: explicit override in storage wins when non-placeholder;
 * otherwise the baked `VITE_COVERCLICK_API_ORIGIN`.
 */
export function resolveApiBaseUrl(storedRaw: string | undefined): string {
  const s = (storedRaw ?? "").trim().replace(/\/+$/, "");
  if (s.length > 0 && !LEGACY_OR_EMPTY.has(s)) return s;
  return VITE_COVERCLICK_API_ORIGIN.replace(/\/+$/, "");
}
