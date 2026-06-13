import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { buildListingDoc, getListingsIndex, isSearchConfigured } from '../lib/search';
import { listingInclude } from './listing.service';

// Upsert or remove a single listing's search doc based on its current state.
// Index holds ONLY APPROVED + non-expired + non-deleted listings (domain rule 7).
export async function syncListingDoc(listingId: string): Promise<void> {
  if (!isSearchConfigured) return;
  const index = getListingsIndex();
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, include: listingInclude });

  const visible =
    !!listing && !listing.deletedAt && listing.status === 'APPROVED' && listing.expiresAt > new Date();

  if (visible) {
    await index.addDocuments([buildListingDoc(listing)]);
  } else {
    await index.deleteDocument(listingId);
  }
}

// Full reconcile: rebuild the index from Postgres (source of truth).
// Upserts all approved docs first, then deletes any stale ones — avoids empty-index window.
export async function reindexAllApproved(): Promise<number> {
  if (!isSearchConfigured) return 0;
  const index = getListingsIndex();
  const listings = await prisma.listing.findMany({
    where: { status: 'APPROVED', deletedAt: null, expiresAt: { gt: new Date() } },
    include: listingInclude,
  });

  if (listings.length > 0) {
    const task = await index.addDocuments(listings.map(buildListingDoc));
    await index.waitForTask(task.taskUid);
  }

  // Remove any stale docs (non-approved, expired, deleted) not in the current set.
  const approvedIds = new Set(listings.map((l) => l.id));
  const { results: allDocs } = await index.getDocuments({ limit: 10000, fields: ['id'] });
  const staleIds = allDocs.map((d) => d.id as string).filter((id) => !approvedIds.has(id));
  if (staleIds.length > 0) await index.deleteDocuments(staleIds);

  logger.info({ count: listings.length, removed: staleIds.length }, 'Search reindex complete');
  return listings.length;
}
