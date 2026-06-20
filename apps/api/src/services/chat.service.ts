import type { Message, Prisma } from '@prisma/client';
import {
  createChatSchema,
  sendMessageSchema,
  type ChatSummary,
  type MessageDTO,
} from '@lumo/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

const chatInclude = {
  listing: {
    select: {
      id: true,
      slug: true,
      title: true,
      images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
    },
  },
  buyer: { select: { id: true, name: true, avatarUrl: true } },
  seller: { select: { id: true, name: true, avatarUrl: true } },
  messages: { orderBy: { createdAt: 'desc' } as const, take: 1 },
} satisfies Prisma.ChatInclude;

type HydratedChat = Prisma.ChatGetPayload<{ include: typeof chatInclude }>;

function toMessageDTO(m: Message): MessageDTO {
  return {
    id: m.id,
    chatId: m.chatId,
    senderId: m.senderId,
    body: m.body,
    readAt: m.readAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

function toChatSummary(chat: HydratedChat, userId: string, unreadCount: number): ChatSummary {
  const other = chat.buyerId === userId ? chat.seller : chat.buyer;
  const last = chat.messages[0];
  return {
    id: chat.id,
    listingId: chat.listing.id,
    listingSlug: chat.listing.slug,
    listingTitle: chat.listing.title,
    listingImage: chat.listing.images[0]?.url ?? null,
    otherUser: { id: other.id, name: other.name, avatarUrl: other.avatarUrl },
    lastMessage: last ? toMessageDTO(last) : null,
    unreadCount,
    createdAt: chat.createdAt.toISOString(),
  };
}

async function summaryOf(chatId: string, userId: string, unreadCount = 0): Promise<ChatSummary> {
  const chat = await prisma.chat.findUniqueOrThrow({ where: { id: chatId }, include: chatInclude });
  return toChatSummary(chat, userId, unreadCount);
}

// Load a chat and assert the user is a participant.
async function requireMembership(chatId: string, userId: string) {
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat) throw AppError.notFound('Chat not found');
  if (chat.buyerId !== userId && chat.sellerId !== userId) {
    throw AppError.forbidden('You are not a participant in this chat');
  }
  return chat;
}

export async function getOrCreateChat(userId: string, input: unknown): Promise<ChatSummary> {
  const { listingId } = createChatSchema.parse(input);
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { ownerId: true, status: true, deletedAt: true },
  });
  if (!listing || listing.deletedAt || listing.status !== 'APPROVED') {
    throw AppError.notFound('Listing not available');
  }
  if (listing.ownerId === userId) throw AppError.badRequest('You cannot chat on your own listing');

  const chat = await prisma.chat.upsert({
    where: {
      listingId_buyerId_sellerId: { listingId, buyerId: userId, sellerId: listing.ownerId },
    },
    create: { listingId, buyerId: userId, sellerId: listing.ownerId },
    update: {},
  });
  return summaryOf(chat.id, userId);
}

export async function listChats(userId: string): Promise<ChatSummary[]> {
  const chats = await prisma.chat.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    include: chatInclude,
    orderBy: { createdAt: 'desc' },
  });
  const unread = await prisma.message.groupBy({
    by: ['chatId'],
    where: { chatId: { in: chats.map((c) => c.id) }, senderId: { not: userId }, readAt: null },
    _count: { _all: true },
  });
  const counts = new Map(unread.map((u) => [u.chatId, u._count._all]));
  return chats.map((c) => toChatSummary(c, userId, counts.get(c.id) ?? 0));
}

export async function getMessages(userId: string, chatId: string): Promise<MessageDTO[]> {
  await requireMembership(chatId, userId);
  // Mark the other party's unread messages as read.
  await prisma.message.updateMany({
    where: { chatId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
  });
  return messages.map(toMessageDTO);
}

// Returns the new message + the recipient (for realtime broadcast + offline notify in item 4/5).
export async function sendMessage(
  userId: string,
  chatId: string,
  input: unknown,
): Promise<{ message: MessageDTO; recipientId: string }> {
  const chat = await requireMembership(chatId, userId);
  const { body } = sendMessageSchema.parse(input);
  const message = await prisma.message.create({ data: { chatId, senderId: userId, body } });
  const recipientId = chat.buyerId === userId ? chat.sellerId : chat.buyerId;

  // Fire-and-forget: track seller's first reply time for response rate metric.
  if (userId === chat.sellerId) {
    void updateSellerReplyRate(chat.sellerId, chat.buyerId, chatId, message.createdAt).catch(() => {});
  }

  return { message: toMessageDTO(message), recipientId };
}

async function updateSellerReplyRate(
  sellerId: string,
  buyerId: string,
  chatId: string,
  repliedAt: Date,
): Promise<void> {
  const [firstSellerMsg, firstBuyerMsg] = await Promise.all([
    prisma.message.findFirst({
      where: { chatId, senderId: sellerId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
    prisma.message.findFirst({
      where: { chatId, senderId: buyerId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ]);
  // Only count if this is the seller's first reply and buyer messaged first.
  if (!firstSellerMsg || !firstBuyerMsg) return;
  if (firstSellerMsg.createdAt.getTime() !== repliedAt.getTime()) return;
  if (firstBuyerMsg.createdAt >= repliedAt) return;

  const replyHours = (repliedAt.getTime() - firstBuyerMsg.createdAt.getTime()) / 3600000;
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: sellerId },
    select: { avgReplyHours: true },
  });
  const newAvg =
    profile?.avgReplyHours != null
      ? profile.avgReplyHours * 0.7 + replyHours * 0.3
      : replyHours;
  await prisma.sellerProfile.update({
    where: { userId: sellerId },
    data: { avgReplyHours: newAvg },
  });
}
