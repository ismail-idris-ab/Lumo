-- Gate reviews behind proof of contact + make the duplicate check race-proof.
-- listingId is nullable (SetNull on listing delete) — Postgres treats NULLs as distinct, so
-- deleted-listing reviews stay unconstrained, which is intended.
CREATE UNIQUE INDEX "Review_listingId_authorId_key" ON "Review"("listingId", "authorId");
