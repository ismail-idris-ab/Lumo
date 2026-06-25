import type { ListingStatus, ModeratorActivity, RevenuePoint, RevenueSeries } from '@lumo/shared';
import { STAFF_AUDIT_ACTIONS } from '@lumo/shared';
import { prisma } from '../lib/prisma';

export interface SellerAnalytics {
  totals: {
    activeListings: number;
    totalListings: number;
    totalViews: number;
    leads: number; // chats started on this seller's listings
    contacts: number; // unique buyers who revealed contact
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
    contacts: number;
    favorites: number;
  }[];
}

// Leads are counted as chat threads. Contact-reveals are not persisted (rate-limited, fire-and-forget),
// so they are intentionally excluded — chats are the durable lead signal.
export async function getSellerAnalytics(userId: string): Promise<SellerAnalytics> {
  const [grouped, viewsAgg, leads, contacts, favorites, listings] = await Promise.all([
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
    prisma.contactReveal.count({ where: { listing: { ownerId: userId, deletedAt: null } } }),
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
        _count: { select: { chats: true, contactReveals: true, favorites: true } },
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
      contacts,
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
      contacts: l._count.contactReveals,
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

// Africa/Lagos is UTC+1 year-round (no DST). Shift then read the UTC calendar date to get
// the WAT day. Pure + deterministic — `now` is injected so it is unit-testable.
const WAT_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 86_400_000;

function watDayKey(d: Date): string {
  return new Date(d.getTime() + WAT_OFFSET_MS).toISOString().slice(0, 10);
}

export interface RevenueInput {
  createdAt: Date;
  amountKobo: number;
}

// Bucket SUCCESS payments into a zero-filled, ascending series of `days` WAT days ending today.
export function bucketRevenueByDay(
  payments: RevenueInput[],
  days: number,
  now: Date,
): RevenuePoint[] {
  const series: RevenuePoint[] = [];
  const index = new Map<string, RevenuePoint>();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() + WAT_OFFSET_MS - i * DAY_MS).toISOString().slice(0, 10);
    const point: RevenuePoint = { date, totalKobo: 0, count: 0 };
    series.push(point);
    index.set(date, point);
  }
  for (const p of payments) {
    const point = index.get(watDayKey(p.createdAt));
    if (point) {
      point.totalKobo += p.amountKobo;
      point.count += 1;
    }
  }
  return series;
}

// Fetch SUCCESS payments in range and bucket them. The 2h slack guards the WAT day boundary
// so payments early on the first WAT day (still "yesterday" in UTC) are not missed.
export async function getRevenueSeries(days: number): Promise<RevenueSeries> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - days * DAY_MS - 2 * 60 * 60 * 1000);
  const payments = await prisma.payment.findMany({
    where: { status: 'SUCCESS', createdAt: { gte: windowStart } },
    select: { createdAt: true, amountKobo: true },
  });
  return { days, series: bucketRevenueByDay(payments, days, now) };
}

export interface AuditActionCount {
  actorId: string;
  action: string;
  count: number;
}

// Pure aggregation — groups raw (actorId, action) rows into per-actor totals + breakdowns,
// joined against the actor's name/email. Unit-testable without touching the database.
export function aggregateModeratorActivity(
  rows: AuditActionCount[],
  users: { id: string; name: string; email: string }[],
): ModeratorActivity[] {
  const byActor = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const byAction = byActor.get(row.actorId) ?? {};
    byAction[row.action] = row.count;
    byActor.set(row.actorId, byAction);
  }

  const userMap = new Map(users.map((u) => [u.id, u]));

  return [...byActor.entries()]
    .map(([actorId, byAction]) => {
      const user = userMap.get(actorId);
      return {
        actorId,
        name: user?.name ?? 'Unknown',
        email: user?.email ?? '',
        totalActions: Object.values(byAction).reduce((a, b) => a + b, 0),
        byAction,
      };
    })
    .sort((a, b) => b.totalActions - a.totalActions);
}

// Per-moderator action counts in [from, to] — the basis for paying staff by work done.
// Only counts STAFF_AUDIT_ACTIONS (excludes system-generated audit rows like auto-approve).
export async function getModeratorActivity(from: Date, to: Date): Promise<ModeratorActivity[]> {
  const grouped = await prisma.auditLog.groupBy({
    by: ['actorId', 'action'],
    where: { action: { in: [...STAFF_AUDIT_ACTIONS] }, createdAt: { gte: from, lte: to } },
    _count: { _all: true },
  });
  const rows: AuditActionCount[] = grouped.map((g) => ({
    actorId: g.actorId,
    action: g.action,
    count: g._count._all,
  }));

  const actorIds = [...new Set(rows.map((r) => r.actorId))];
  const users = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true, email: true },
  });

  return aggregateModeratorActivity(rows, users);
}
