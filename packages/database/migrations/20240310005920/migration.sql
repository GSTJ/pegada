-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Color" AS ENUM ('BLACK', 'WHITE', 'BROWN', 'TRICOLOR', 'ALBINO', 'GOLDEN');

-- CreateEnum
CREATE TYPE "Size" AS ENUM ('EXTRASMALL', 'SMALL', 'MEDIUM', 'LARGE', 'GIANT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "SwipeType" AS ENUM ('INTERESTED', 'NOT_INTERESTED', 'MAYBE');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'PREMIUM');

-- CreateTable
CREATE TABLE "Temperament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Temperament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "code" TEXT,
    "codeExpiresAt" TIMESTAMP(3),
    "pushToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "plan" "PlanType" NOT NULL DEFAULT 'FREE',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dog" (
    "id" TEXT NOT NULL,
    "bio" TEXT,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "color" "Color",
    "size" "Size",
    "weight" INTEGER,
    "breedId" TEXT,
    "birthDate" TIMESTAMP(3),
    "hasPedigree" BOOLEAN NOT NULL DEFAULT false,
    "pedigreeProof" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "preferredMinAge" INTEGER,
    "preferredMaxAge" INTEGER,
    "preferredColor" "Color",
    "preferredSize" "Size",
    "preferredMaxDistance" INTEGER,
    "preferredBreedId" TEXT,

    CONSTRAINT "Dog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "dogId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Breed" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Breed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "swipeType" "SwipeType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "matchId" TEXT,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DogTemperaments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Temperament_name_key" ON "Temperament"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_id_idx" ON "User"("id");

-- CreateIndex
CREATE INDEX "User_latitude_idx" ON "User"("latitude");

-- CreateIndex
CREATE INDEX "User_longitude_idx" ON "User"("longitude");

-- CreateIndex
CREATE INDEX "Dog_userId_idx" ON "Dog"("userId");

-- CreateIndex
CREATE INDEX "Dog_deletedAt_idx" ON "Dog"("deletedAt");

-- CreateIndex
CREATE INDEX "Dog_breedId_idx" ON "Dog"("breedId");

-- CreateIndex
CREATE INDEX "Dog_preferredBreedId_idx" ON "Dog"("preferredBreedId");

-- CreateIndex
CREATE INDEX "Dog_gender_idx" ON "Dog"("gender");

-- CreateIndex
CREATE INDEX "Dog_id_idx" ON "Dog"("id");

-- CreateIndex
CREATE INDEX "Image_dogId_idx" ON "Image"("dogId");

-- CreateIndex
CREATE UNIQUE INDEX "Breed_name_key" ON "Breed"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Breed_slug_key" ON "Breed"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_matchId_key" ON "Interest"("matchId");

-- CreateIndex
CREATE INDEX "Interest_responderId_idx" ON "Interest"("responderId");

-- CreateIndex
CREATE INDEX "Interest_requesterId_idx" ON "Interest"("requesterId");

-- CreateIndex
CREATE INDEX "Interest_updatedAt_idx" ON "Interest"("updatedAt");

-- CreateIndex
CREATE INDEX "Interest_deletedAt_idx" ON "Interest"("deletedAt");

-- CreateIndex
CREATE INDEX "Interest_swipeType_idx" ON "Interest"("swipeType");

-- CreateIndex
CREATE INDEX "Match_responderId_idx" ON "Match"("responderId");

-- CreateIndex
CREATE INDEX "Match_requesterId_idx" ON "Match"("requesterId");

-- CreateIndex
CREATE INDEX "Message_receiverId_idx" ON "Message"("receiverId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_matchId_idx" ON "Message"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "_DogTemperaments_AB_unique" ON "_DogTemperaments"("A", "B");

-- CreateIndex
CREATE INDEX "_DogTemperaments_B_index" ON "_DogTemperaments"("B");
