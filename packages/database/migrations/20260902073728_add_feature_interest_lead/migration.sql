CREATE TABLE "FeatureInterestLead" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "ref" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FeatureInterestLead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeatureInterestLead_email_feature_key"
ON "FeatureInterestLead"("email", "feature");

CREATE INDEX "FeatureInterestLead_feature_createdAt_idx"
ON "FeatureInterestLead"("feature", "createdAt");
