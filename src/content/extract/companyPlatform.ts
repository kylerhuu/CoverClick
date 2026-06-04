import type { JobBoardId } from "./types";

/** Normalized platform names — never valid hiring companies on job-board pages. */
export const JOB_PLATFORM_NAMES = new Set(
  [
    "handshake",
    "linkedin",
    "indeed",
    "glassdoor",
    "ziprecruiter",
    "workday",
    "greenhouse",
    "lever",
    "monster",
    "careerbuilder",
    "simplyhired",
    "dice",
    "wellfound",
    "angellist",
    "builtin",
    "myworkdayjobs",
  ].map((s) => s.toLowerCase()),
);

const PLATFORM_SUFFIX_RE =
  /\s*(?:[|–—-]\s*|\s+at\s+)(Handshake|LinkedIn|Indeed|Glassdoor|ZipRecruiter|Workday|Greenhouse|Lever)\s*$/i;

export type CompanyNormalizeContext = {
  hostname?: string;
  board?: JobBoardId;
};

export type CompanyNormalizeResult =
  | { ok: true; value: string }
  | { ok: false; reason: "empty" | "platform" | "generic_junk" | "too_short" | "too_long" | "url" };

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isJobPlatformName(name: string, hostname?: string): boolean {
  const key = normalizeKey(name);
  if (!key) return false;
  if (JOB_PLATFORM_NAMES.has(key)) return true;

  const h = (hostname ?? "").toLowerCase();
  if (h.includes("handshake") && key === "handshake") return true;
  if (h.includes("linkedin") && key === "linkedin") return true;
  if (h.includes("indeed") && key === "indeed") return true;
  if (h.includes("glassdoor") && key === "glassdoor") return true;
  if (h.includes("ziprecruiter") && key === "ziprecruiter") return true;
  if (h.includes("workday") && key === "workday") return true;
  if (h.includes("greenhouse.io") && key === "greenhouse") return true;
  if (h.includes("lever.co") && key === "lever") return true;

  return false;
}

export function stripPlatformSuffix(name: string): string {
  let s = name.trim();
  for (let i = 0; i < 3; i++) {
    const next = s.replace(PLATFORM_SUFFIX_RE, "").trim();
    if (next === s) break;
    s = next;
  }
  return s;
}

/** Nav / section labels that sometimes match employer DOM selectors on job boards. */
const GENERIC_JUNK =
  /^(careers|jobs|home|about|apply|company|sign in|log in|job posting|view job|search jobs|employers?|students?|faculty|alumni|campus|explore|discover|resources|help|support|blog|news)$/i;

export function normalizeCompanyCandidate(
  raw: string | undefined,
  ctx: CompanyNormalizeContext = {},
): CompanyNormalizeResult {
  if (!raw?.trim()) return { ok: false, reason: "empty" };

  let value = stripPlatformSuffix(raw);
  if (!value) return { ok: false, reason: "empty" };

  if (value.length < 2) return { ok: false, reason: "too_short" };
  if (value.length > 120) return { ok: false, reason: "too_long" };
  if (/^https?:\/\//i.test(value)) return { ok: false, reason: "url" };
  if (GENERIC_JUNK.test(value)) return { ok: false, reason: "generic_junk" };
  if (isJobPlatformName(value, ctx.hostname)) return { ok: false, reason: "platform" };

  return { ok: true, value };
}
