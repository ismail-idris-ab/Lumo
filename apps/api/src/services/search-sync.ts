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

const REINDEX_BATCH = 1000;

// Full reconcile: rebuild the index from Postgres (source of truth). Paginated in all three
// stages so this scales past 10k listings — a single findMany/addDocuments/getDocuments(limit)
// would silently miss anything beyond the first page.
// Upserts all approved docs first, then deletes any stale ones — avoids empty-index window.
export async function reindexAllApproved(): Promise<number> {
  if (!isSearchConfigured) return 0;
  const index = getListingsIndex();

  // Stage 1: paginate Postgres in keyset batches, upsert each batch, and wait for the index to
  // reflect it before reading the next batch — ALL adds must land before stage 2's stale scan
  // runs, or newly-added docs would look stale.
  const liveIds = new Set<string>();
  let total = 0;
  let cursor: string | undefined;
  for (;;) {
    const batch = await prisma.listing.findMany({
      where: { status: 'APPROVED', deletedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { id: 'asc' },
      take: REINDEX_BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: listingInclude,
    });
    if (batch.length === 0) break;

    const task = await index.addDocuments(batch.map(buildListingDoc));
    await index.waitForTask(task.taskUid);

    for (const l of batch) liveIds.add(l.id);
    total += batch.length;
    cursor = batch[batch.length - 1]!.id;
    if (batch.length < REINDEX_BATCH) break;
  }

  // Stage 2: page the FULL index (not just the first page) to find stale ids. The live-id Set
  // is fine to low millions of listings; well past that, swap this for per-page existence
  // checks against Postgres instead of an in-memory Set diff — out of scope here.
  const staleIds: string[] = [];
  let offset = 0;
  for (;;) {
    const { results } = await index.getDocuments({ limit: REINDEX_BATCH, offset, fields: ['id'] });
    for (const doc of results) {
      const id = doc.id as string;
      if (!liveIds.has(id)) staleIds.push(id);
    }
    if (results.length < REINDEX_BATCH) break;
    offset += REINDEX_BATCH;
  }

  // Stage 3: delete stale ids in chunks, not one giant array.
  for (let i = 0; i < staleIds.length; i += REINDEX_BATCH) {
    await index.deleteDocuments(staleIds.slice(i, i + REINDEX_BATCH));
  }

  logger.info({ count: total, removed: staleIds.length }, 'Search reindex complete');
  return total;
}
