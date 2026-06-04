import type { JobBoardId } from "./types";

export function detectJobBoard(hostname: string): JobBoardId {
  const h = hostname.toLowerCase();
  if (h.includes("linkedin.com")) return "linkedin";
  if (h.includes("joinhandshake.com") || h.includes("handshake.com")) return "handshake";
  if (h.includes("greenhouse.io")) return "greenhouse";
  if (h.includes("lever.co")) return "lever";
  if (h.includes("indeed.com")) return "indeed";
  if (h.includes("glassdoor.com")) return "glassdoor";
  if (h.includes("ziprecruiter.com")) return "ziprecruiter";
  if (h.includes("myworkdayjobs.com") || h.includes("workday.com")) return "workday";
  return "generic";
}

export function isKnownJobBoard(board: JobBoardId): boolean {
  return board !== "generic";
}
