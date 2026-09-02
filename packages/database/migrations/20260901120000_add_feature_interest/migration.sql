CREATE TABLE "FeatureInterest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FeatureInterest_pkey" PRIMARY KEY ("id")
);

-- Also covers the lookups `list` and `set` do by `userId` alone, since it
-- leads with that column.
CREATE UNIQUE INDEX "FeatureInterest_userId_feature_key"
ON "FeatureInterest"("userId", "feature");
