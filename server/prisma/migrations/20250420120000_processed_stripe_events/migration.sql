-- Idempotent Stripe webhook handling (Stripe may deliver the same event more than once).
CREATE TABLE "processed_stripe_event" (
    "event_id" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_stripe_event_pkey" PRIMARY KEY ("event_id")
);
