import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

// Reviews are chat-gated (decided policy, not a sold-to-buyer flow): a user may review a
// listing only if a Chat proves they contacted the seller for THIS listing. The duplicate
// guard is now a real unique constraint (race-proof), not just the findFirst pre-check.

const { listingFindUnique, chatFindFirst, reviewFindFirst, reviewCreate, reviewAggregate, sellerProfileUpsert } =
  vi.hoisted(() => ({
    listingFindUnique: vi.fn(),
    chatFindFirst: vi.fn(),
    reviewFindFirst: vi.fn(),
    reviewCreate: vi.fn(),
    reviewAggregate: vi.fn(),
    sellerProfileUpsert: vi.fn(),
  }));

vi.mock('../lib/prisma', () => ({
  prisma: {
    listing: { findUnique: listingFindUnique },
    chat: { findFirst: chatFindFirst },
    review: { findFirst: reviewFindFirst, create: reviewCreate, aggregate: reviewAggregate },
    sellerProfile: { upsert: sellerProfileUpsert },
  },
}));

import { createReview } from './review.service';

const LISTING = { ownerId: 'seller_1', status: 'APPROVED' };

beforeEach(() => {
  vi.clearAllMocks();
  listingFindUnique.mockResolvedValue(LISTING);
  reviewFindFirst.mockResolvedValue(null);
  reviewAggregate.mockResolvedValue({ _avg: { rating: 5 }, _count: { rating: 1 } });
  sellerProfileUpsert.mockResolvedValue({});
  reviewCreate.mockResolvedValue({
    id: 'r1',
    authorId: 'buyer_1',
    rating: 5,
    body: null,
    createdAt: new Date(),
    author: { name: 'Buyer', avatarUrl: null },
  });
});

describe('createReview — chat-gate + race-proof duplicate guard', () => {
  it('throws 403 when the author has no chat with the seller for this listing', async () => {
    chatFindFirst.mockResolvedValue(null);

    await expect(createReview('l1', 'buyer_1', { rating: 5 })).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  it('succeeds when a matching chat exists', async () => {
    chatFindFirst.mockResolvedValue({ id: 'chat_1' });

    await createReview('l1', 'buyer_1', { rating: 5 });

    expect(chatFindFirst).toHaveBeenCalledWith({
      where: { listingId: 'l1', buyerId: 'buyer_1', sellerId: 'seller_1' },
      select: { id: true },
    });
    expect(reviewCreate).toHaveBeenCalledTimes(1);
  });

  it('throws 403 before checking for an existing review (chat-gate runs first)', async () => {
    chatFindFirst.mockResolvedValue(null);
    reviewFindFirst.mockResolvedValue({ id: 'existing' });

    await expect(createReview('l1', 'buyer_1', { rating: 5 })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('throws 409 via the pre-check when a review already exists', async () => {
    chatFindFirst.mockResolvedValue({ id: 'chat_1' });
    reviewFindFirst.mockResolvedValue({ id: 'existing' });

    await expect(createReview('l1', 'buyer_1', { rating: 5 })).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  it('throws 409 (not 500) when a concurrent submit wins the race past the pre-check', async () => {
    chatFindFirst.mockResolvedValue({ id: 'chat_1' });
    reviewFindFirst.mockResolvedValue(null); // pre-check sees nothing yet
    reviewCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.22.0',
      }),
    );

    await expect(createReview('l1', 'buyer_1', { rating: 5 })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('still blocks self-review regardless of any chat', async () => {
    listingFindUnique.mockResolvedValue({ ownerId: 'buyer_1', status: 'APPROVED' });

    await expect(createReview('l1', 'buyer_1', { rating: 5 })).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(chatFindFirst).not.toHaveBeenCalled();
  });
});
