/** Shared upgrade value props — use on every locked Pro surface. */
export const PRO_UPGRADE_BULLETS = [
  "Save jobs",
  "Track applications",
  "Resume later",
  "Unlimited AI generations",
  "Resume management",
] as const;

export const PRO_UPGRADE_HEADLINE = "Upgrade to Pro";

export function freeGenerationsLabel(remaining: number): string {
  const n = Math.max(0, remaining);
  return `${n} free generation${n === 1 ? "" : "s"} remaining`;
}
