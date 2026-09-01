ALTER TABLE "User" ADD COLUMN "premiumUntil" TIMESTAMP(3);

CREATE TABLE "SubscriptionEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "userId" TEXT,
  "productId" TEXT,
  "periodType" TEXT,
  "store" TEXT,
  "price" DOUBLE PRECISION,
  "currency" TEXT,
  "purchasedAt" TIMESTAMP(3),
  "expirationAt" TIMESTAMP(3),
  "cancelReason" TEXT,
  "environment" TEXT,
  "raw" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionEvent_eventId_key"
ON "SubscriptionEvent"("eventId");

CREATE INDEX "SubscriptionEvent_userId_idx"
ON "SubscriptionEvent"("userId");

CREATE INDEX "SubscriptionEvent_type_purchasedAt_idx"
ON "SubscriptionEvent"("type", "purchasedAt");

CREATE INDEX "SubscriptionEvent_purchasedAt_idx"
ON "SubscriptionEvent"("purchasedAt");
