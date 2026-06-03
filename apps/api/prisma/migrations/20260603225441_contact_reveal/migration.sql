-- CreateTable
CREATE TABLE "ContactReveal" (
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactReveal_pkey" PRIMARY KEY ("userId","listingId")
);

-- CreateIndex
CREATE INDEX "ContactReveal_listingId_idx" ON "ContactReveal"("listingId");

-- AddForeignKey
ALTER TABLE "ContactReveal" ADD CONSTRAINT "ContactReveal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactReveal" ADD CONSTRAINT "ContactReveal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
