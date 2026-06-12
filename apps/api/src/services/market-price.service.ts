import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const MIN_COMPS = 5;

export async function computeMarketPrices(): Promise<void> {
  const buckets = await prisma.listing.groupBy({
    by: ['categoryId', 'condition'],
    where: { status: 'APPROVED', deletedAt: null, expiresAt: { gt: new Date() } },
    _count: { id: true },
  });

  let updated = 0;
  for (const bucket of buckets) {
    const { categoryId, condition, _count } = bucket;

    if (_count.id < MIN_COMPS) {
      await prisma.listing.updateMany({
        where: { categoryId, condition, status: 'APPROVED', deletedAt: null },
        data: { marketLowKobo: null, marketHighKobo: null },
      });
      continue;
    }

    const listings = await prisma.listing.findMany({
      where: { categoryId, condition, status: 'APPROVED', deletedAt: null, expiresAt: { gt: new Date() } },
      select: { priceKobo: true },
      orderBy: { priceKobo: 'asc' },
    });

    const prices = listings.map((l) => l.priceKobo);
    const p25 = percentile(prices, 0.25);
    const p75 = percentile(prices, 0.75);

    await prisma.listing.updateMany({
      where: { categoryId, condition },
      data: { marketLowKobo: Math.round(p25), marketHighKobo: Math.round(p75) },
    });
    updated += listings.length;
  }

  logger.info({ buckets: buckets.length, listings: updated }, 'Market prices computed');
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
