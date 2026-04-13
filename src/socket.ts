import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { z } from 'zod';

import { sendChatMessage } from './services/chatService';

const socketMessageSchema = z.object({
  userId: z.string().trim().min(1),
  conversationId: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).max(4000),
});

export const registerSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    socket.on('chat:send', async (payload) => {
      try {
        const input = socketMessageSchema.parse(payload);
        const result = await sendChatMessage(input);

        socket.emit('chat:response', {
          conversationId: result.conversation.id,
          userMessage: result.userMessage,
          assistantMessage: result.assistantMessage,
          memorySummary: result.memorySummary,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected socket error.';

        socket.emit('chat:error', { error: message });
      }
    });
  });

  return io;
};
