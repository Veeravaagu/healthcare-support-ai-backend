import { Router } from 'express';

import {
  createConversation,
  getConversationWithMessages,
  listUserConversations,
  sendChatMessage,
} from '../services/chatService';
import { parseWithSchema } from '../utils/http';
import {
  createConversationSchema,
  sendMessageSchema,
} from '../validators/conversationValidators';

export const conversationRouter = Router();

conversationRouter.post('/', async (request, response, next) => {
  try {
    const input = parseWithSchema(createConversationSchema, request.body);
    const conversation = await createConversation(input);

    response.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
});

conversationRouter.get('/user/:userId', async (request, response, next) => {
  try {
    const conversations = await listUserConversations(request.params.userId);
    response.json(conversations);
  } catch (error) {
    next(error);
  }
});

conversationRouter.get('/:conversationId', async (request, response, next) => {
  try {
    const conversation = await getConversationWithMessages(request.params.conversationId);

    if (!conversation) {
      response.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    response.json(conversation);
  } catch (error) {
    next(error);
  }
});

conversationRouter.post('/:conversationId/messages', async (request, response, next) => {
  try {
    const input = parseWithSchema(sendMessageSchema, request.body);
    const result = await sendChatMessage({
      conversationId: request.params.conversationId,
      userId: input.userId,
      content: input.content,
    });

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

conversationRouter.post('/:conversationId?/chat', async (request, response, next) => {
  try {
    const input = parseWithSchema(sendMessageSchema, request.body);
    const conversationId = request.params.conversationId;
    const result = await sendChatMessage({
      conversationId,
      userId: input.userId,
      content: input.content,
    });

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
