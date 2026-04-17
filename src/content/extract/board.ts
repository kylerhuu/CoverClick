import type { JobBoardId } from "./types";

export function detectJobBoard(hostname: string): JobBoardId {
  const h = hostname.toLowerCase();
  if (h.includes("linkedin.com")) return "linkedin";
  if (h.includes("greenhouse.io")) return "greenhouse";
  if (h.includes("lever.co")) return "lever";
  return "generic";
}
