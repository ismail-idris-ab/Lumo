-- CreateEnum
CREATE TYPE "ReviewReason" AS ENUM ('SPOT_CHECK', 'REPORTED', 'MANUAL_FLAG');

-- CreateEnum
CREATE TYPE "ReviewState" AS ENUM ('OPEN', 'CLEARED', 'ACTIONED');

-- CreateTable
CREATE TABLE "ModerationReview" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "reason" "ReviewReason" NOT NULL,
    "state" "ReviewState" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "outcome" TEXT,

    CONSTRAINT "ModerationReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModerationReview_state_createdAt_idx" ON "ModerationReview"("state", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationReview_sellerId_state_idx" ON "ModerationReview"("sellerId", "state");

-- AddForeignKey
ALTER TABLE "ModerationReview" ADD CONSTRAINT "ModerationReview_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
