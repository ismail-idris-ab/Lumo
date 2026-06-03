import { z } from 'zod';

export const createChatSchema = z.object({
  listingId: z.string().cuid(),
});
export type CreateChatInput = z.infer<typeof createChatSchema>;

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty').max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
