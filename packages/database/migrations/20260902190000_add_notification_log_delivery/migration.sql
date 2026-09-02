ALTER TABLE "NotificationLog"
ADD COLUMN "ticketStatus" TEXT,
ADD COLUMN "ticketError" TEXT,
ADD COLUMN "receiptStatus" TEXT,
ADD COLUMN "receiptError" TEXT;

-- Serves the per-kind cooldown lookup in the re-engagement run, which asks for
-- one user's sends of one kind inside a window.
CREATE INDEX "NotificationLog_userId_kind_sentAt_idx"
ON "NotificationLog"("userId", "kind", "sentAt");
