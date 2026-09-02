-- Attribution for the install and signup that came out of a shared dog card.
--
-- Two nullable columns and one index. Every existing row keeps NULL, which is
-- what "we never knew" has to look like: the baseline this measures is
-- attributed signups over all signups, and backfilling a default would put a
-- number on weeks the link never carried a ref.
ALTER TABLE "User" ADD COLUMN "referredByUserId" TEXT;
ALTER TABLE "User" ADD COLUMN "referredDogId" TEXT;

-- `ref` also carries channel tokens (`ig` for the Instagram bio link), which
-- resolve to no user at all. Kept as its own column rather than stuffed into
-- "referredByUserId", so a join against User stays a join and the readout can
-- split "a friend shared this" from "they came from our own bio link".
ALTER TABLE "User" ADD COLUMN "referralSource" TEXT;

-- The readout is "how many accounts did this user bring in", so the query is
-- always a lookup by referrer. Without this it is a sequential scan of User.
CREATE INDEX "User_referredByUserId_idx" ON "User"("referredByUserId");
