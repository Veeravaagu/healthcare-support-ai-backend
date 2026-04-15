import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatPromptContext } from '../src/types/chat';
import type { StorageAdapter } from '../src/storage';

const mocks = vi.hoisted(() => ({
  storageAdapterMock: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    getUser: vi.fn(),
    createUser: vi.fn(),
    getConversation: vi.fn(),
    createConversation: vi.fn(),
    listUserConversations: vi.fn(),
    getMessages: vi.fn(),
    saveMessage: vi.fn(),
    updateMemorySummary: vi.fn(),
  } satisfies StorageAdapter,
  generateAssistantReplyMock: vi.fn(),
  updateMemorySummaryMock: vi.fn(),
}));

vi.mock('../src/storage', () => ({
  getStorageAdapter: () => mocks.storageAdapterMock,
}));

vi.mock('../src/services/aiService', () => ({
  generateAssistantReply: mocks.generateAssistantReplyMock,
  updateMemorySummary: mocks.updateMemorySummaryMock,
}));

import { sendChatMessage } from '../src/services/chatService';

describe('sendChatMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses memory in the assistant prompt and updates memory after the saved assistant reply', async () => {
    mocks.storageAdapterMock.getUser.mockResolvedValue({
      id: 'user-1',
      name: 'Ava',
      email: 'ava@example.com',
      memorySummary: '- Prefers calm, practical support',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    });

    mocks.storageAdapterMock.createConversation.mockResolvedValue({
      id: 'conversation-1',
      title: 'Need support',
      userId: 'user-1',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    });

    mocks.storageAdapterMock.saveMessage
      .mockResolvedValueOnce({
        id: 'message-user-1',
        conversationId: 'conversation-1',
        role: 'user',
        content: 'I feel overwhelmed coordinating appointments.',
        createdAt: new Date('2025-01-01T00:01:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'message-assistant-1',
        conversationId: 'conversation-1',
        role: 'assistant',
        content: 'We can slow this down and organize the next steps together.',
        createdAt: new Date('2025-01-01T00:02:00.000Z'),
      });

    mocks.storageAdapterMock.getConversation.mockResolvedValue({
      id: 'conversation-1',
      title: 'Need support',
      userId: 'user-1',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:02:00.000Z'),
    });

    mocks.storageAdapterMock.getMessages
      .mockResolvedValueOnce([
        {
          id: 'message-user-1',
          conversationId: 'conversation-1',
          role: 'user',
          content: 'I feel overwhelmed coordinating appointments.',
          createdAt: new Date('2025-01-01T00:01:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'message-user-1',
          conversationId: 'conversation-1',
          role: 'user',
          content: 'I feel overwhelmed coordinating appointments.',
          createdAt: new Date('2025-01-01T00:01:00.000Z'),
        },
        {
          id: 'message-assistant-1',
          conversationId: 'conversation-1',
          role: 'assistant',
          content: 'We can slow this down and organize the next steps together.',
          createdAt: new Date('2025-01-01T00:02:00.000Z'),
        },
      ]);

    mocks.generateAssistantReplyMock.mockImplementation(async (context: ChatPromptContext) => {
      return `Memory seen: ${context.memorySummary}`;
    });

    mocks.updateMemorySummaryMock.mockResolvedValue('- Updated memory summary');
    mocks.storageAdapterMock.updateMemorySummary.mockResolvedValue({
      id: 'user-1',
      name: 'Ava',
      email: 'ava@example.com',
      memorySummary: '- Updated memory summary',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:03:00.000Z'),
    });

    const result = await sendChatMessage({
      userId: 'user-1',
      content: 'I feel overwhelmed coordinating appointments.',
    });

    expect(mocks.generateAssistantReplyMock).toHaveBeenCalledWith({
      memorySummary: '- Prefers calm, practical support',
      recentMessages: [],
      latestUserMessage: 'I feel overwhelmed coordinating appointments.',
      safetyAssessment: {
        triggered: true,
        triggers: ['severe_distress'],
      },
    });

    expect(mocks.updateMemorySummaryMock).toHaveBeenCalledWith('- Prefers calm, practical support', [
      {
        role: 'user',
        content: 'I feel overwhelmed coordinating appointments.',
      },
      {
        role: 'assistant',
        content: 'We can slow this down and organize the next steps together.',
      },
    ]);

    expect(mocks.storageAdapterMock.updateMemorySummary).toHaveBeenCalledWith(
      'user-1',
      '- Updated memory summary',
    );

    expect(result.memorySummary).toBe('- Updated memory summary');
    expect(result.assistantMessage.content).toBe('We can slow this down and organize the next steps together.');
  });
});
