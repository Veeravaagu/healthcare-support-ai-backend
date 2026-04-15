import { MessageRole, PrismaClient } from '@prisma/client';

import { prisma } from '../lib/prisma';
import type {
  CreateConversationInput,
  CreateUserInput,
  SaveMessageInput,
  StorageAdapter,
  StoredConversation,
  StoredMessage,
  StoredUser,
} from './storageAdapter';

const toStoredUser = (user: {
  id: string;
  name: string;
  email: string | null;
  memorySummary: string;
  createdAt: Date;
  updatedAt: Date;
}): StoredUser => {
  return user;
};

const toStoredConversation = (conversation: {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}): StoredConversation => {
  return conversation;
};

const toStoredMessage = (message: {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}): StoredMessage => {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role === MessageRole.USER ? 'user' : 'assistant',
    content: message.content,
    createdAt: message.createdAt,
  };
};

export class PrismaAdapter implements StorageAdapter {
  constructor(private readonly client: PrismaClient = prisma) {}

  async connect(): Promise<void> {
    await this.client.$connect();
  }

  async disconnect(): Promise<void> {
    await this.client.$disconnect();
  }

  async getUser(id: string): Promise<StoredUser | null> {
    const user = await this.client.user.findUnique({
      where: { id },
    });

    return user ? toStoredUser(user) : null;
  }

  async createUser(data: CreateUserInput): Promise<StoredUser> {
    const user = await this.client.user.create({
      data,
    });

    return toStoredUser(user);
  }

  async getConversation(id: string): Promise<StoredConversation | null> {
    const conversation = await this.client.conversation.findUnique({
      where: { id },
    });

    return conversation ? toStoredConversation(conversation) : null;
  }

  async createConversation(data: CreateConversationInput): Promise<StoredConversation> {
    const conversation = await this.client.conversation.create({
      data,
    });

    return toStoredConversation(conversation);
  }

  async listUserConversations(userId: string): Promise<StoredConversation[]> {
    const conversations = await this.client.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map(toStoredConversation);
  }

  async getMessages(conversationId: string): Promise<StoredMessage[]> {
    const messages = await this.client.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map(toStoredMessage);
  }

  async saveMessage(data: SaveMessageInput): Promise<StoredMessage> {
    const message = await this.client.message.create({
      data: {
        conversationId: data.conversationId,
        role: data.role === 'user' ? MessageRole.USER : MessageRole.ASSISTANT,
        content: data.content,
      },
    });

    return toStoredMessage(message);
  }

  async updateMemorySummary(userId: string, summary: string): Promise<StoredUser> {
    const user = await this.client.user.update({
      where: { id: userId },
      data: { memorySummary: summary },
    });

    return toStoredUser(user);
  }
}
