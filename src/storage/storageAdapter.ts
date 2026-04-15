export type StorageMessageRole = 'user' | 'assistant';

export type StoredUser = {
  id: string;
  name: string;
  email: string | null;
  memorySummary: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserInput = {
  name: string;
  email?: string;
};

export type StoredConversation = {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateConversationInput = {
  userId: string;
  title: string;
};

export type StoredMessage = {
  id: string;
  conversationId: string;
  role: StorageMessageRole;
  content: string;
  createdAt: Date;
};

export type SaveMessageInput = {
  conversationId: string;
  role: StorageMessageRole;
  content: string;
};

export interface StorageAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getUser(id: string): Promise<StoredUser | null>;
  createUser(data: CreateUserInput): Promise<StoredUser>;
  getConversation(id: string): Promise<StoredConversation | null>;
  createConversation(data: CreateConversationInput): Promise<StoredConversation>;
  listUserConversations(userId: string): Promise<StoredConversation[]>;
  getMessages(conversationId: string): Promise<StoredMessage[]>;
  saveMessage(data: SaveMessageInput): Promise<StoredMessage>;
  updateMemorySummary(userId: string, summary: string): Promise<StoredUser>;
}
