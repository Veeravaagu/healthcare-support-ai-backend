import { randomUUID } from 'crypto';

import mongoose, { Schema } from 'mongoose';

import { env } from '../config/env';
import type {
  CreateConversationInput,
  CreateUserInput,
  SaveMessageInput,
  StorageAdapter,
  StoredConversation,
  StoredMessage,
  StoredUser,
} from './storageAdapter';

const userSchema = new Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: null, sparse: true, index: true },
    memorySummary: { type: String, default: '' },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const conversationSchema = new Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

conversationSchema.index({ userId: 1, createdAt: -1 });

const messageSchema = new Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    conversationId: { type: String, required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  },
);

messageSchema.index({ conversationId: 1, timestamp: 1 });

type RawUser = {
  id: string;
  name: string;
  email?: string | null;
  memorySummary: string;
  createdAt: Date;
  updatedAt: Date;
};

type RawConversation = {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

type RawMessage = {
  id: string;
  conversationId: string;
  role: StoredMessage['role'];
  content: string;
  timestamp: Date;
};

const UserModel =
  (mongoose.models.User as mongoose.Model<RawUser> | undefined) ??
  mongoose.model<RawUser>('User', userSchema);
const ConversationModel =
  (mongoose.models.Conversation as mongoose.Model<RawConversation> | undefined) ??
  mongoose.model<RawConversation>('Conversation', conversationSchema);
const MessageModel =
  (mongoose.models.Message as mongoose.Model<RawMessage> | undefined) ??
  mongoose.model<RawMessage>('Message', messageSchema);

const toStoredUser = (user: RawUser): StoredUser => {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    memorySummary: user.memorySummary,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const toStoredConversation = (
  conversation: RawConversation,
): StoredConversation => {
  return {
    id: conversation.id,
    userId: conversation.userId,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
};

const toStoredMessage = (message: RawMessage): StoredMessage => {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    createdAt: message.timestamp,
  };
};

export class MongooseAdapter implements StorageAdapter {
  constructor(private readonly mongoUrl: string = env.MONGODB_URL ?? '') {}

  async connect(): Promise<void> {
    if (mongoose.connection.readyState === 1) {
      return;
    }

    await mongoose.connect(this.mongoUrl);
  }

  async disconnect(): Promise<void> {
    if (mongoose.connection.readyState === 0) {
      return;
    }

    await mongoose.disconnect();
  }

  async getUser(id: string): Promise<StoredUser | null> {
    const user = await UserModel.findOne({ id }).lean();
    return user ? toStoredUser(user) : null;
  }

  async createUser(data: CreateUserInput): Promise<StoredUser> {
    const user = await UserModel.create({
      name: data.name,
      email: data.email ?? null,
    });

    return toStoredUser(user.toObject());
  }

  async getConversation(id: string): Promise<StoredConversation | null> {
    const conversation = await ConversationModel.findOne({ id }).lean();
    return conversation ? toStoredConversation(conversation) : null;
  }

  async createConversation(data: CreateConversationInput): Promise<StoredConversation> {
    const conversation = await ConversationModel.create(data);
    return toStoredConversation(conversation.toObject());
  }

  async listUserConversations(userId: string): Promise<StoredConversation[]> {
    const conversations = await ConversationModel.find({ userId }).sort({ updatedAt: -1 }).lean();
    return conversations.map(toStoredConversation);
  }

  async getMessages(conversationId: string): Promise<StoredMessage[]> {
    const messages = await MessageModel.find({ conversationId }).sort({ timestamp: 1 }).lean();
    return messages.map(toStoredMessage);
  }

  async saveMessage(data: SaveMessageInput): Promise<StoredMessage> {
    const message = await MessageModel.create({
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
    });

    return toStoredMessage(message.toObject());
  }

  async updateMemorySummary(userId: string, summary: string): Promise<StoredUser> {
    const user = await UserModel.findOneAndUpdate(
      { id: userId },
      { $set: { memorySummary: summary } },
      { returnDocument: 'after' },
    ).lean();

    if (!user) {
      throw new Error('User not found.');
    }

    return toStoredUser(user);
  }
}
