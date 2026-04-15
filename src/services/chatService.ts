import type { ChatMessageInput, ChatPromptContext } from '../types/chat';
import {
  getStorageAdapter,
  type StoredConversation,
  type StoredMessage,
  type StoredUser,
} from '../storage';
import { generateAssistantReply, updateMemorySummary } from './aiService';
import { assessMessageSafety } from './safetyService';

export type ConversationWithMessages = StoredConversation & {
  messages: StoredMessage[];
};

export type SendChatMessageInput = {
  userId: string;
  content: string;
  conversationId?: string;
};

export type SendChatMessageResult = {
  conversation: ConversationWithMessages;
  userMessage: StoredMessage;
  assistantMessage: StoredMessage;
  memorySummary: string;
};

const RECENT_MESSAGE_LIMIT = 12;

const storage = (): ReturnType<typeof getStorageAdapter> => {
  return getStorageAdapter();
};

const toChatMessage = (message: StoredMessage): ChatMessageInput => {
  return {
    role: message.role,
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

const getConversationWithMessagesOrNull = async (
  conversationId: string,
): Promise<ConversationWithMessages | null> => {
  const conversation = await storage().getConversation(conversationId);

  if (!conversation) {
    return null;
  }

  const messages = await storage().getMessages(conversationId);

  return {
    ...conversation,
    messages,
  };
};

const ensureConversationForUser = async (
  user: StoredUser,
  conversationId: string | undefined,
  firstMessage: string,
): Promise<ConversationWithMessages> => {
  if (!conversationId) {
    const conversation = await storage().createConversation({
      userId: user.id,
      title: defaultConversationTitle(firstMessage),
    });

    return {
      ...conversation,
      messages: [],
    };
  }

  const conversation = await getConversationWithMessagesOrNull(conversationId);

  if (!conversation || conversation.userId !== user.id) {
    throw new Error('Conversation not found for user.');
  }

  return conversation;
};

const getConversationOrThrow = async (conversationId: string): Promise<ConversationWithMessages> => {
  const conversation = await getConversationWithMessagesOrNull(conversationId);

  if (!conversation) {
    throw new Error('Conversation not found.');
  }

  return conversation;
};

export const createUser = async (input: { name: string; email?: string }): Promise<StoredUser> => {
  return storage().createUser(input);
};

export const createConversation = async (input: {
  userId: string;
  title?: string;
}): Promise<StoredConversation> => {
  const user = await storage().getUser(input.userId);

  if (!user) {
    throw new Error('User not found.');
  }

  return storage().createConversation({
    userId: input.userId,
    title: input.title?.trim() || 'New conversation',
  });
};

export const getUser = async (userId: string): Promise<StoredUser | null> => {
  return storage().getUser(userId);
};

export const listUserConversations = async (userId: string): Promise<StoredConversation[]> => {
  return storage().listUserConversations(userId);
};

export const getConversationWithMessages = async (
  conversationId: string,
): Promise<ConversationWithMessages | null> => {
  return getConversationWithMessagesOrNull(conversationId);
};

export const sendChatMessage = async (
  input: SendChatMessageInput,
): Promise<SendChatMessageResult> => {
  const user = await storage().getUser(input.userId);

  if (!user) {
    throw new Error('User not found.');
  }

  const conversation = await ensureConversationForUser(user, input.conversationId, input.content);

  const userMessage = await storage().saveMessage({
    conversationId: conversation.id,
    role: 'user',
    content: input.content,
  });

  const conversationAfterUserMessage = await getConversationOrThrow(conversation.id);
  const assistantReply = await generateAssistantReply(
    buildPromptContext(user.memorySummary, conversationAfterUserMessage, input.content),
  );

  const assistantMessage = await storage().saveMessage({
    conversationId: conversationAfterUserMessage.id,
    role: 'assistant',
    content: assistantReply,
  });

  const conversationWithAssistant = await getConversationOrThrow(conversation.id);

  const memorySummary = await updateMemorySummary(
    user.memorySummary,
    buildRecentMessages(conversationWithAssistant),
  );

  await storage().updateMemorySummary(user.id, memorySummary);

  return {
    conversation: conversationWithAssistant,
    userMessage,
    assistantMessage,
    memorySummary,
  };
};
