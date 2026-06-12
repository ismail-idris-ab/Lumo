-- CreateEnum
CREATE TYPE "PromotionTier" AS ENUM ('NONE', 'BOOST', 'TOP', 'DIAMOND', 'ENTERPRISE');

-- AlterTable: Listing — add promotionTier, attributes, market price columns
ALTER TABLE "Listing"
  ADD COLUMN "promotionTier" "PromotionTier" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "attributes" JSONB,
  ADD COLUMN "marketLowKobo" INTEGER,
  ADD COLUMN "marketHighKobo" INTEGER;

-- AlterTable: Category — add attributeSchema column
ALTER TABLE "Category"
  ADD COLUMN "attributeSchema" JSONB;

-- AlterTable: Review — add listingId column
ALTER TABLE "Review"
  ADD COLUMN "listingId" TEXT;

-- AddForeignKey: Review.listingId → Listing.id
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
