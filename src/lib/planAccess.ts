import type { AccessPhase } from "../auth/useAccessGate";

export function isProPlan(phase: AccessPhase): boolean {
  return phase === "paid" || phase === "mock";
}
