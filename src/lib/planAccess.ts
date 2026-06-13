import type { AccessPhase } from "../auth/useAccessGate";

export type EntitlementStatus = "loading" | "free" | "pro";

export function isEntitlementLoading(phase: AccessPhase): boolean {
  return phase === "loading";
}

/** Resolved subscription tier — never treat `loading` as free. */
export function getEntitlementStatus(phase: AccessPhase): EntitlementStatus {
  if (phase === "loading") return "loading";
  if (phase === "paid" || phase === "mock") return "pro";
  return "free";
}

export function isProPlan(phase: AccessPhase): boolean {
  return getEntitlementStatus(phase) === "pro";
}
