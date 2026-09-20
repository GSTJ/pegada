-- The OTP check had no cap on wrong guesses, so a code was brute-forceable
-- inside its 1-hour window with a proxy pool wide enough to outrun the
-- per-IP limiter. This column lets AuthenticationService.checkVerification
-- lock a code out after a few misses instead of leaving it open to guessing.
ALTER TABLE "User" ADD COLUMN "codeAttempts" INTEGER NOT NULL DEFAULT 0;
