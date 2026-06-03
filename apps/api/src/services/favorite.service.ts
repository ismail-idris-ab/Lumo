import type { PublicListing } from '@lumo/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { listingInclude, toPublicListing } from './listing.service';

export async function addFavorite(userId: string, listingId: string): Promise<void> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { status: true, deletedAt: true, expiresAt: true },
  });
  // Can only favorite a publicly-visible listing.
  if (!listing || listing.deletedAt || listing.status !== 'APPROVED' || listing.expiresAt < new Date()) {
    throw AppError.notFound('Listing not available');
  }

  await prisma.favorite.upsert({
    where: { userId_listingId: { userId, listingId } },
    create: { userId, listingId },
    update: {},
  });
}

export async function removeFavorite(userId: string, listingId: string): Promise<void> {
  await prisma.favorite.deleteMany({ where: { userId, listingId } });
}

export async function listFavorites(userId: string): Promise<PublicListing[]> {
  const favorites = await prisma.favorite.findMany({
    where: { userId, listing: { deletedAt: null } },
    orderBy: { createdAt: 'desc' },
    include: { listing: { include: listingInclude } },
  });
  // Includes listings that later expired/suspended — web shows them as unavailable (APP_FLOW §14).
  return favorites.map((f) => ({ ...toPublicListing(f.listing), favorited: true }));
}
