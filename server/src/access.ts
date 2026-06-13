import type { SubscriptionStatus } from "@prisma/client";

export const FREE_COVER_LETTER_LIMIT = 3;

export function hasPaidSubscription(status: SubscriptionStatus): boolean {
  return status === "ACTIVE" || status === "TRIALING";
}

export type UserEntitlementFields = {
  subscriptionStatus: SubscriptionStatus;
  freeCoverLetterGenerationsUsed: number;
};

export function freeCoverLetterGenerationsRemaining(user: UserEntitlementFields): number | null {
  if (hasPaidSubscription(user.subscriptionStatus)) return null;
  return Math.max(0, FREE_COVER_LETTER_LIMIT - user.freeCoverLetterGenerationsUsed);
}

export function canGenerateCoverLetter(user: UserEntitlementFields): boolean {
  if (hasPaidSubscription(user.subscriptionStatus)) return true;
  return user.freeCoverLetterGenerationsUsed < FREE_COVER_LETTER_LIMIT;
}

export function serializeEntitlements(user: UserEntitlementFields) {
  return {
    hasPaidAccess: hasPaidSubscription(user.subscriptionStatus),
    freeCoverLetterGenerationsUsed: user.freeCoverLetterGenerationsUsed,
    freeCoverLetterGenerationsRemaining: freeCoverLetterGenerationsRemaining(user),
    freeCoverLetterLimit: FREE_COVER_LETTER_LIMIT,
  };
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
