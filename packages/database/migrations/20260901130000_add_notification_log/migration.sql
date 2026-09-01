CREATE TABLE "NotificationLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationLog_dedupeKey_key"
ON "NotificationLog"("dedupeKey");

CREATE INDEX "NotificationLog_userId_sentAt_idx"
ON "NotificationLog"("userId", "sentAt");
