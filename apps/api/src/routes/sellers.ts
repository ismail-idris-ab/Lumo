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
        createdAt: true,
        sellerProfile: {
          select: { verification: true, ratingAvg: true, ratingCount: true },
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
      createdAt: user.createdAt.toISOString(),
      verification: user.sellerProfile?.verification ?? null,
      ratingAvg: user.sellerProfile?.ratingAvg ?? null,
      ratingCount: user.sellerProfile?.ratingCount ?? 0,
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
