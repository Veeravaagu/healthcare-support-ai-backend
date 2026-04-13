import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatPromptContext } from '../src/types/chat';

const mocks = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    conversation: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
  },
  generateAssistantReplyMock: vi.fn(),
  updateMemorySummaryMock: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: mocks.prismaMock,
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
    mocks.prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Ava',
      email: 'ava@example.com',
      memorySummary: '- Prefers calm, practical support',
    });

    mocks.prismaMock.conversation.create.mockResolvedValue({
      id: 'conversation-1',
      title: 'Need support',
      userId: 'user-1',
      messages: [],
    });

    mocks.prismaMock.message.create
      .mockResolvedValueOnce({
        id: 'message-user-1',
        conversationId: 'conversation-1',
        role: 'USER',
        content: 'I feel overwhelmed coordinating appointments.',
      })
      .mockResolvedValueOnce({
        id: 'message-assistant-1',
        conversationId: 'conversation-1',
        role: 'ASSISTANT',
        content: 'We can slow this down and organize the next steps together.',
      });

    mocks.prismaMock.conversation.findUnique
      .mockResolvedValueOnce({
        id: 'conversation-1',
        title: 'Need support',
        userId: 'user-1',
        messages: [
          {
            id: 'message-user-1',
            conversationId: 'conversation-1',
            role: 'USER',
            content: 'I feel overwhelmed coordinating appointments.',
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 'conversation-1',
        title: 'Need support',
        userId: 'user-1',
        messages: [
          {
            id: 'message-user-1',
            conversationId: 'conversation-1',
            role: 'USER',
            content: 'I feel overwhelmed coordinating appointments.',
          },
          {
            id: 'message-assistant-1',
            conversationId: 'conversation-1',
            role: 'ASSISTANT',
            content: 'We can slow this down and organize the next steps together.',
          },
        ],
      });

    mocks.generateAssistantReplyMock.mockImplementation(async (context: ChatPromptContext) => {
      return `Memory seen: ${context.memorySummary}`;
    });

    mocks.updateMemorySummaryMock.mockResolvedValue('- Updated memory summary');
    mocks.prismaMock.user.update.mockResolvedValue({
      id: 'user-1',
      memorySummary: '- Updated memory summary',
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

    expect(mocks.prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { memorySummary: '- Updated memory summary' },
    });

    expect(result.memorySummary).toBe('- Updated memory summary');
    expect(result.assistantMessage.content).toBe('We can slow this down and organize the next steps together.');
  });
});
