import { z } from 'zod';

export const createConversationSchema = z.object({
  userId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(160).optional(),
});

export const sendMessageSchema = z.object({
  userId: z.string().trim().min(1),
  content: z.string().trim().min(1).max(4000),
});
