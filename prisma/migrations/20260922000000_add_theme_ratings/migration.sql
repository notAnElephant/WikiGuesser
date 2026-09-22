-- CreateEnum
CREATE TYPE "ThemeRatingDevice" AS ENUM ('MOBILE', 'DESKTOP');

-- CreateTable
CREATE TABLE "ThemeRating" (
    "id" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "device" "ThemeRatingDevice" NOT NULL,
    "score" INTEGER NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThemeRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThemeRating_theme_device_createdAt_idx" ON "ThemeRating"("theme", "device", "createdAt");

-- CreateIndex
CREATE INDEX "ThemeRating_actorId_createdAt_idx" ON "ThemeRating"("actorId", "createdAt");
