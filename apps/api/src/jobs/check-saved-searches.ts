import { prisma } from '../lib/prisma';
import { notify } from '../lib/notify';
import { sendEmail } from '../lib/email';
import { logger } from '../lib/logger';
import { formatKobo } from '../lib/format';

export async function checkSavedSearches(listingId: string): Promise<void> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      slug: true,
      title: true,
      priceKobo: true,
      condition: true,
      categoryId: true,
      state: true,
      ownerId: true,
    },
  });

  if (!listing) return;

  const matches = await prisma.savedSearch.findMany({
    where: {
      userId: { not: listing.ownerId },
      ...(listing.categoryId ? { OR: [{ categoryId: null }, { categoryId: listing.categoryId }] } : { categoryId: null }),
      OR: [{ state: null }, { state: listing.state }],
      AND: [
        { OR: [{ minPriceKobo: null }, { minPriceKobo: { lte: listing.priceKobo } }] },
        { OR: [{ maxPriceKobo: null }, { maxPriceKobo: { gte: listing.priceKobo } }] },
        { OR: [{ condition: null }, { condition: listing.condition }] },
      ],
    },
    include: { user: { select: { email: true } } },
  });

  type SavedSearchWithUser = (typeof matches)[0];

  // Filter keyword matches in-process (case-insensitive)
  const titleLower = listing.title.toLowerCase();
  const qualifying = matches.filter(
    (ss: SavedSearchWithUser) => !ss.query || titleLower.includes(ss.query.toLowerCase()),
  );

  logger.info({ listingId, matches: qualifying.length }, 'Saved search matches found');

  await Promise.allSettled(
    qualifying.map(async (ss: SavedSearchWithUser) => {
      const name = ss.name ?? 'your search';
      await notify(ss.userId, 'SAVED_SEARCH_MATCH', {
        listingId: listing.id,
        listingSlug: listing.slug,
        listingTitle: listing.title,
        savedSearchName: name,
      });
      void sendEmail(
        ss.user.email,
        `New listing matches: ${name}`,
        `<p>A new listing matches your saved search <strong>${name}</strong>:</p>
         <p><a href="${process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'}/listing/${listing.slug}">
           ${listing.title} — ${formatKobo(listing.priceKobo)}
         </a></p>`,
      );
    }),
  );
}
