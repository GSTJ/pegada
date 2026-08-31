CREATE TABLE "UploadGrant" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "temporaryUrl" TEXT NOT NULL,
  "permanentUrl" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "cleanedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UploadGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UploadGrant_temporaryUrl_key"
ON "UploadGrant"("temporaryUrl");

CREATE INDEX "UploadGrant_userId_createdAt_idx"
ON "UploadGrant"("userId", "createdAt");

CREATE INDEX "UploadGrant_expiresAt_consumedAt_idx"
ON "UploadGrant"("expiresAt", "consumedAt");
