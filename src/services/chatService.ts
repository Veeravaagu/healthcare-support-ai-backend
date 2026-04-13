import { MessageRole, type Conversation, type Message, type Prisma, type User } from '@prisma/client';

import { prisma } from '../lib/prisma';
import type { ChatMessageInput, ChatPromptContext } from '../types/chat';
import { generateAssistantReply, updateMemorySummary } from './aiService';
import { assessMessageSafety } from './safetyService';

const conversationWithMessagesInclude = {
  messages: {
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.ConversationInclude;

type ConversationWithMessages = Prisma.ConversationGetPayload<{
  include: typeof conversationWithMessagesInclude;
}>;

export type SendChatMessageInput = {
  userId: string;
  content: string;
  conversationId?: string;
};

export type SendChatMessageResult = {
  conversation: ConversationWithMessages;
  userMessage: Message;
  assistantMessage: Message;
  memorySummary: string;
};

const RECENT_MESSAGE_LIMIT = 12;

const toChatMessage = (message: Message): ChatMessageInput => {
  return {
    role: message.role === MessageRole.USER ? 'user' : 'assistant',
    content: message.content,
  };
};

const buildRecentMessages = (conversation: ConversationWithMessages): ChatMessageInput[] => {
  return conversation.messages.slice(-RECENT_MESSAGE_LIMIT).map(toChatMessage);
};

const buildPromptContext = (
  memorySummary: string,
  conversation: ConversationWithMessages,
  latestUserMessage: string,
): ChatPromptContext => {
  const recentMessages = buildRecentMessages(conversation);

  return {
    memorySummary,
    recentMessages: recentMessages.slice(0, -1),
    latestUserMessage,
    safetyAssessment: assessMessageSafety(latestUserMessage),
  };
};

const defaultConversationTitle = (content: string): string => {
  return content.trim().slice(0, 50) || 'New conversation';
};

const ensureConversationForUser = async (
  user: User,
  conversationId: string | undefined,
  firstMessage: string,
): Promise<ConversationWithMessages> => {
  if (!conversationId) {
    return prisma.conversation.create({
      data: {
        userId: user.id,
        title: defaultConversationTitle(firstMessage),
      },
      include: conversationWithMessagesInclude,
    });
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId: user.id,
    },
    include: conversationWithMessagesInclude,
  });

  if (!conversation) {
    throw new Error('Conversation not found for user.');
  }

  return conversation;
};

const getConversationOrThrow = async (conversationId: string): Promise<ConversationWithMessages> => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: conversationWithMessagesInclude,
  });

  if (!conversation) {
    throw new Error('Conversation not found.');
  }

  return conversation;
};

export const createUser = async (input: { name: string; email?: string }): Promise<User> => {
  return prisma.user.create({
    data: input,
  });
};

export const createConversation = async (input: {
  userId: string;
  title?: string;
}): Promise<Conversation> => {
  return prisma.conversation.create({
    data: {
      userId: input.userId,
      title: input.title?.trim() || 'New conversation',
    },
  });
};

export const listUserConversations = async (userId: string): Promise<Conversation[]> => {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
};

export const getConversationWithMessages = async (
  conversationId: string,
): Promise<ConversationWithMessages | null> => {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: conversationWithMessagesInclude,
  });
};

export const sendChatMessage = async (
  input: SendChatMessageInput,
): Promise<SendChatMessageResult> => {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
  });

  if (!user) {
    throw new Error('User not found.');
  }

  const conversation = await ensureConversationForUser(user, input.conversationId, input.content);

  const userMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: MessageRole.USER,
      content: input.content,
    },
  });

  const conversationAfterUserMessage = await getConversationOrThrow(conversation.id);
  const assistantReply = await generateAssistantReply(
    buildPromptContext(user.memorySummary, conversationAfterUserMessage, input.content),
  );

  const assistantMessage = await prisma.message.create({
    data: {
      conversationId: conversationAfterUserMessage.id,
      role: MessageRole.ASSISTANT,
      content: assistantReply,
    },
  });

  const conversationWithAssistant = await getConversationOrThrow(conversation.id);

  const memorySummary = await updateMemorySummary(
    user.memorySummary,
    buildRecentMessages(conversationWithAssistant),
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { memorySummary },
  });

  return {
    conversation: conversationWithAssistant,
    userMessage,
    assistantMessage,
    memorySummary,
  };
};
