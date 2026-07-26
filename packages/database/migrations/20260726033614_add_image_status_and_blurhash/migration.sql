-- Brings the migration history back in line with schema.prisma.
--
-- Image.status, Image.blurhash and the ImageStatus enum already exist in
-- production; they were added to schema.prisma without a matching migration,
-- so the folder has been behind ever since. Production is the source of truth
-- here, this migration just writes down what is already there.
--
-- Everything below is idempotent on purpose. Against a fresh database it
-- creates the enum and the two columns. Against a database that already has
-- them (production) it does nothing and does not error, so it is safe whether
-- it gets applied or resolved.

-- CreateEnum
-- Postgres has no CREATE TYPE IF NOT EXISTS, hence the guarded block.
DO $$ BEGIN
  CREATE TYPE "ImageStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "status" "ImageStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "blurhash" TEXT;
