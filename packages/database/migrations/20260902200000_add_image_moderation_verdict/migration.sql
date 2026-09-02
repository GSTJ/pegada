-- Records what the moderation model said, alongside rather than inside
-- "status": in shadow mode "status" stays APPROVED while these columns hold the
-- verdict enforcement would have acted on. All nullable, so every existing row
-- keeps meaning "not moderated" without a backfill.
ALTER TABLE "Image"
ADD COLUMN "moderationVerdict" TEXT,
ADD COLUMN "moderationScore" DOUBLE PRECISION,
ADD COLUMN "moderationReason" TEXT,
ADD COLUMN "moderationModel" TEXT,
ADD COLUMN "moderatedAt" TIMESTAMP(3);
