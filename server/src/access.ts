import type { SubscriptionStatus } from "@prisma/client";

export function hasPaidSubscription(status: SubscriptionStatus): boolean {
  return status === "ACTIVE" || status === "TRIALING";
}

export function subscriptionStatusFromStripe(stripeStatus: string | null | undefined): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
    case "paused":
      return "CANCELED";
    case "incomplete":
      return "NONE";
    default:
      return "NONE";
  }
}
