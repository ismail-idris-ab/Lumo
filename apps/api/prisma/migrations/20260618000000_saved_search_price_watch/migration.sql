-- CreateTable SavedSearch
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "query" TEXT,
    "categoryId" TEXT,
    "state" TEXT,
    "minPriceKobo" INTEGER,
    "maxPriceKobo" INTEGER,
    "condition" "Condition",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable PriceWatch
CREATE TABLE "PriceWatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "priceKobo" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceWatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceWatch_userId_listingId_key" ON "PriceWatch"("userId", "listingId");

-- CreateIndex
CREATE INDEX "PriceWatch_listingId_idx" ON "PriceWatch"("listingId");

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceWatch" ADD CONSTRAINT "PriceWatch_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceWatch" ADD CONSTRAINT "PriceWatch_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
