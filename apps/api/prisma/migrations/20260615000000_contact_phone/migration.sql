-- AddColumn contactPhone to Listing
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
