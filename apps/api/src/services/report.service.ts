import { Prisma } from '@prisma/client';
import { createReportSchema, resolveReportsSchema } from '@lumo/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { writeAudit, type Actor } from '../lib/audit';
import { adminDeleteListing, suspendListing } from './moderation.service';

const AUTO_FLAG_THRESHOLD = 5;

export async function createReport(userId: string, input: unknown): Promise<void> {
  const { listingId, reason, details } = createReportSchema.parse(input);

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { ownerId: true, deletedAt: true },
  });
  if (!listing || listing.deletedAt) throw AppError.notFound('Listing not found');
  if (listing.ownerId === userId) throw AppError.badRequest('You cannot report your own listing');

  try {
    await prisma.report.create({ data: { listingId, reporterId: userId, reason, details: details ?? null } });
  } catch (e) {
    // Dedupe: unique(listingId, reporterId).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw AppError.conflict('You already reported this listing');
    }
    throw e;
  }

  // Auto-flag for priority review once unresolved reports hit the threshold.
  const count = await prisma.report.count({ where: { listingId, resolved: false } });
  if (count === AUTO_FLAG_THRESHOLD) {
    await writeAudit({
      actorId: 'system',
      action: 'listing.auto_flag',
      targetType: 'Listing',
      targetId: listingId,
      after: { unresolvedReports: count },
    });
  }
}

export interface ReportGroup {
  listing: { id: string; slug: string; title: string; status: string };
  reportCount: number;
  reports: { id: string; reason: string; details: string | null; reporterId: string; createdAt: string }[];
}

// Admin queue grouped by listing (TRD §18), unresolved first.
export async function listReportsForAdmin(): Promise<ReportGroup[]> {
  const groups = await prisma.report.groupBy({
    by: ['listingId'],
    where: { resolved: false },
    _count: { _all: true },
  });
  const listingIds = groups.map((g) => g.listingId);
  if (listingIds.length === 0) return [];

  const [listings, reports] = await Promise.all([
    prisma.listing.findMany({
      where: { id: { in: listingIds } },
      select: { id: true, slug: true, title: true, status: true },
    }),
    prisma.report.findMany({
      where: { listingId: { in: listingIds }, resolved: false },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  const listingById = new Map(listings.map((l) => [l.id, l]));

  return groups
    .map((g) => ({
      listing: listingById.get(g.listingId)!,
      reportCount: g._count._all,
      reports: reports
        .filter((r) => r.listingId === g.listingId)
        .map((r) => ({
          id: r.id,
          reason: r.reason,
          details: r.details,
          reporterId: r.reporterId,
          createdAt: r.createdAt.toISOString(),
        })),
    }))
    .sort((a, b) => b.reportCount - a.reportCount);
}

export async function resolveReports(
  actor: Actor,
  input: unknown,
): Promise<{ resolvedCount: number; action: string }> {
  const { listingId, action, reason } = resolveReportsSchema.parse(input);
  if ((action === 'suspend' || action === 'delete') && !reason) {
    throw AppError.badRequest('A reason is required to suspend or delete');
  }

  const { count } = await prisma.report.updateMany({
    where: { listingId, resolved: false },
    data: { resolved: true },
  });

  if (action === 'suspend') await suspendListing(listingId, { reason }, actor);
  else if (action === 'delete') await adminDeleteListing(listingId, actor);

  await writeAudit({
    actorId: actor.id,
    action: 'report.resolve',
    targetType: 'Listing',
    targetId: listingId,
    after: { action, resolvedCount: count },
  });
  return { resolvedCount: count, action };
}
