import type { JobBoardId } from "../content/extract/types";

const BOARD_LABELS: Record<JobBoardId, string> = {
  linkedin: "LinkedIn",
  handshake: "Handshake",
  greenhouse: "Greenhouse",
  lever: "Lever",
  indeed: "Indeed",
  glassdoor: "Glassdoor",
  ziprecruiter: "ZipRecruiter",
  workday: "Workday",
  generic: "Web",
};

export function detectJobBoardFromUrl(url: string): JobBoardId {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.includes("linkedin.com")) return "linkedin";
    if (h.includes("joinhandshake.com") || h.includes("handshake.com")) return "handshake";
    if (h.includes("greenhouse.io")) return "greenhouse";
    if (h.includes("lever.co")) return "lever";
    if (h.includes("indeed.com")) return "indeed";
    if (h.includes("glassdoor.com")) return "glassdoor";
    if (h.includes("ziprecruiter.com")) return "ziprecruiter";
    if (h.includes("myworkdayjobs.com") || h.includes("workday.com")) return "workday";
    return "generic";
  } catch {
    return "generic";
  }
}

export function normalizeJobUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    u.hash = "";
    let out = u.toString();
    if (out.endsWith("/") && u.pathname.length > 1) out = out.slice(0, -1);
    return out;
  } catch {
    return trimmed;
  }
}

export function jobSourceFromUrl(url: string): string {
  const board = detectJobBoardFromUrl(url);
  if (board !== "generic") return BOARD_LABELS[board];
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || "Web";
  } catch {
    return "Web";
  }
}

export function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
