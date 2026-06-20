import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { param } from '../lib/request';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { toPublicListing, listingInclude } from '../services/listing.service';
import type { SellerPublicProfile } from '@lumo/shared';

export const sellersRouter: Router = Router();

// GET /api/v1/sellers/:id — public seller profile + their active listings.
sellersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id');

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        state: true,
        city: true,
        lastActiveAt: true,
        createdAt: true,
        sellerProfile: {
          select: { bio: true, verification: true, ratingAvg: true, ratingCount: true, avgReplyHours: true },
        },
        _count: {
          select: {
            listings: {
              where: { status: 'APPROVED', deletedAt: null, expiresAt: { gt: new Date() } },
            },
          },
        },
      },
    });

    if (!user) throw AppError.notFound('Seller not found');

    const seller: SellerPublicProfile = {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.sellerProfile?.bio ?? null,
      state: user.state,
      city: user.city,
      lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      verification: user.sellerProfile?.verification ?? null,
      ratingAvg: user.sellerProfile?.ratingAvg ?? null,
      ratingCount: user.sellerProfile?.ratingCount ?? 0,
      avgReplyHours: user.sellerProfile?.avgReplyHours ?? null,
      listingCount: user._count.listings,
    };

    const listings = await prisma.listing.findMany({
      where: { ownerId: id, status: 'APPROVED', deletedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: listingInclude,
    });

    res.json({ seller, listings: listings.map(toPublicListing) });
  }),
);

// GET /api/v1/sellers/:id/reviews — public review list for a seller.
sellersRouter.get(
  '/:id/reviews',
  asyncHandler(async (req, res) => {
    const sellerId = param(req, 'id');
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
    const limit = 10;
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { author: { select: { name: true, avatarUrl: true } } },
      }),
      prisma.review.count({ where: { sellerId } }),
    ]);
    res.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        authorId: r.authorId,
        authorName: r.author.name,
        authorAvatar: r.author.avatarUrl,
        rating: r.rating,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
    });
  }),
);
