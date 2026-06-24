import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { z } from 'zod';
import type { SellerReviewDTO } from '@lumo/shared';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().max(1000).optional(),
});

export async function createReview(
  listingId: string,
  authorId: string,
  data: z.infer<typeof createReviewSchema>,
): Promise<SellerReviewDTO> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { ownerId: true, status: true },
  });
  if (!listing) throw AppError.notFound('Listing not found');
  if (listing.ownerId === authorId) throw AppError.forbidden('Cannot review your own listing');

  // Chat-gate (decided policy): reviewing requires proof of contact — a chat where this
  // user is the buyer and the listing owner is the seller, for THIS listing. No sold-to-buyer
  // flow here; that's a separate future feature.
  const contacted = await prisma.chat.findFirst({
    where: { listingId, buyerId: authorId, sellerId: listing.ownerId },
    select: { id: true },
  });
  if (!contacted) throw AppError.forbidden('You can only review sellers you have contacted');

  // Friendlier pre-check; the @@unique([listingId, authorId]) constraint below is the real
  // guard against concurrent/duplicate submits racing this check.
  const existing = await prisma.review.findFirst({ where: { listingId, authorId } });
  if (existing) throw AppError.conflict('You already reviewed this listing');

  let review;
  try {
    review = await prisma.review.create({
      data: {
        listingId,
        sellerId: listing.ownerId,
        authorId,
        rating: data.rating,
        body: data.body ?? null,
      },
      include: { author: { select: { name: true, avatarUrl: true } } },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw AppError.conflict('You already reviewed this listing');
    }
    throw err;
  }

  const agg = await prisma.review.aggregate({
    where: { sellerId: listing.ownerId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.sellerProfile.upsert({
    where: { userId: listing.ownerId },
    create: {
      userId: listing.ownerId,
      ratingAvg: agg._avg.rating ?? 0,
      ratingCount: agg._count.rating,
    },
    update: {
      ratingAvg: agg._avg.rating ?? 0,
      ratingCount: agg._count.rating,
    },
  });

  return toDTO(review);
}

export async function getSellerReviews(
  sellerId: string,
  page = 1,
  limit = 20,
): Promise<{ reviews: SellerReviewDTO[]; total: number }> {
  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where: { sellerId },
      include: { author: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where: { sellerId } }),
  ]);
  return { reviews: reviews.map(toDTO), total };
}

type ReviewWithAuthor = {
  id: string;
  authorId: string;
  rating: number;
  body: string | null;
  createdAt: Date;
  author: { name: string; avatarUrl: string | null };
};

function toDTO(r: ReviewWithAuthor): SellerReviewDTO {
  return {
    id: r.id,
    authorId: r.authorId,
    authorName: r.author.name,
    authorAvatar: r.author.avatarUrl,
    rating: r.rating,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
  };
}
