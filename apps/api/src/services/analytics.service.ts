import type { ListingStatus } from '@lumo/shared';
import { prisma } from '../lib/prisma';

export interface SellerAnalytics {
  totals: {
    activeListings: number;
    totalListings: number;
    totalViews: number;
    leads: number; // chats started on this seller's listings
    favorites: number;
  };
  byStatus: Record<string, number>;
  // Per-listing breakdown for the seller's currently-approved listings.
  listings: {
    id: string;
    slug: string;
    title: string;
    status: ListingStatus;
    views: number;
    leads: number;
    favorites: number;
  }[];
}

// Leads are counted as chat threads. Contact-reveals are not persisted (rate-limited, fire-and-forget),
// so they are intentionally excluded — chats are the durable lead signal.
export async function getSellerAnalytics(userId: string): Promise<SellerAnalytics> {
  const [grouped, viewsAgg, leads, favorites, listings] = await Promise.all([
    prisma.listing.groupBy({
      by: ['status'],
      where: { ownerId: userId, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.listing.aggregate({
      where: { ownerId: userId, deletedAt: null },
      _sum: { viewsCount: true },
    }),
    prisma.chat.count({ where: { sellerId: userId } }),
    prisma.favorite.count({ where: { listing: { ownerId: userId, deletedAt: null } } }),
    prisma.listing.findMany({
      where: { ownerId: userId, deletedAt: null, status: 'APPROVED' },
      orderBy: { viewsCount: 'desc' },
      take: 50,
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        viewsCount: true,
        _count: { select: { chats: true, favorites: true } },
      },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  let totalListings = 0;
  for (const g of grouped) {
    byStatus[g.status] = g._count._all;
    totalListings += g._count._all;
  }

  return {
    totals: {
      activeListings: byStatus.APPROVED ?? 0,
      totalListings,
      totalViews: viewsAgg._sum.viewsCount ?? 0,
      leads,
      favorites,
    },
    byStatus,
    listings: listings.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      status: l.status,
      views: l.viewsCount,
      leads: l._count.chats,
      favorites: l._count.favorites,
    })),
  };
}

export interface AdminAnalytics {
  users: number;
  listings: { total: number; byStatus: Record<string, number>; pendingModeration: number };
  reports: { unresolved: number };
  verifications: { pending: number };
  revenue: { totalKobo: number; last30dKobo: number; successfulPayments: number };
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [users, grouped, unresolvedReports, pendingVerifications, revAll, rev30d] =
    await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.listing.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      prisma.report.count({ where: { resolved: false } }),
      prisma.verificationRequest.count({ where: { status: 'PENDING', feePaid: true } }),
      prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amountKobo: true }, _count: { _all: true } }),
      prisma.payment.aggregate({
        where: { status: 'SUCCESS', createdAt: { gte: since30d } },
        _sum: { amountKobo: true },
      }),
    ]);

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const g of grouped) {
    byStatus[g.status] = g._count._all;
    total += g._count._all;
  }

  return {
    users,
    listings: { total, byStatus, pendingModeration: byStatus.PENDING ?? 0 },
    reports: { unresolved: unresolvedReports },
    verifications: { pending: pendingVerifications },
    revenue: {
      totalKobo: revAll._sum.amountKobo ?? 0,
      last30dKobo: rev30d._sum.amountKobo ?? 0,
      successfulPayments: revAll._count._all,
    },
  };
}
