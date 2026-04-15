import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  CreateConversationInput,
  CreateUserInput,
  SaveMessageInput,
  StorageAdapter,
} from '../src/storage';

type StorageHarness = {
  adapter: StorageAdapter;
  cleanup: () => Promise<void>;
};

type SetupStorageHarness = () => Promise<StorageHarness>;

const createUserInput = (suffix: string): CreateUserInput => ({
  name: `User ${suffix}`,
  email: `user-${suffix}@example.com`,
});

const createConversationInput = (userId: string, title: string): CreateConversationInput => ({
  userId,
  title,
});

const createMessageInput = (
  conversationId: string,
  role: SaveMessageInput['role'],
  content: string,
): SaveMessageInput => ({
  conversationId,
  role,
  content,
});

export const runStorageAdapterBehaviorTests = (
  label: string,
  setupHarness: SetupStorageHarness,
): void => {
  describe(`${label} storage adapter`, () => {
    let harness: StorageHarness;

    beforeEach(async () => {
      harness = await setupHarness();
      await harness.adapter.connect();
    });

    afterEach(async () => {
      if (harness) {
        await harness.cleanup();
      }
    });

    it('creates a user with an empty memory summary by default', async () => {
      const user = await harness.adapter.createUser(createUserInput('default-memory'));

      expect(user.name).toBe('User default-memory');
      expect(user.email).toBe('user-default-memory@example.com');
      expect(user.memorySummary).toBe('');
    });

    it('returns null for a missing user', async () => {
      const user = await harness.adapter.getUser('missing-user');

      expect(user).toBeNull();
    });

    it('creates and fetches a conversation', async () => {
      const user = await harness.adapter.createUser(createUserInput('conversation'));
      const createdConversation = await harness.adapter.createConversation(
        createConversationInput(user.id, 'Care plan check-in'),
      );

      const fetchedConversation = await harness.adapter.getConversation(createdConversation.id);

      expect(fetchedConversation).toMatchObject({
        id: createdConversation.id,
        userId: user.id,
        title: 'Care plan check-in',
      });
    });

    it('lists user conversations in most recently updated order', async () => {
      const user = await harness.adapter.createUser(createUserInput('list-conversations'));
      const firstConversation = await harness.adapter.createConversation(
        createConversationInput(user.id, 'First'),
      );
      const secondConversation = await harness.adapter.createConversation(
        createConversationInput(user.id, 'Second'),
      );

      await harness.adapter.saveMessage(
        createMessageInput(firstConversation.id, 'user', 'Checking on my first conversation'),
      );

      const conversations = await harness.adapter.listUserConversations(user.id);

      expect(conversations.map((conversation) => conversation.id)).toEqual([
        secondConversation.id,
        firstConversation.id,
      ]);
    });

    it('returns an empty message list for a conversation with no messages', async () => {
      const user = await harness.adapter.createUser(createUserInput('empty-messages'));
      const conversation = await harness.adapter.createConversation(
        createConversationInput(user.id, 'No messages yet'),
      );

      const messages = await harness.adapter.getMessages(conversation.id);

      expect(messages).toEqual([]);
    });

    it('saves a user message and preserves its content and role', async () => {
      const user = await harness.adapter.createUser(createUserInput('save-user-message'));
      const conversation = await harness.adapter.createConversation(
        createConversationInput(user.id, 'Support thread'),
      );

      const message = await harness.adapter.saveMessage(
        createMessageInput(conversation.id, 'user', 'I need help keeping appointments organized.'),
      );

      expect(message).toMatchObject({
        conversationId: conversation.id,
        role: 'user',
        content: 'I need help keeping appointments organized.',
      });
    });

    it('retrieves messages in ascending time order', async () => {
      const user = await harness.adapter.createUser(createUserInput('message-order'));
      const conversation = await harness.adapter.createConversation(
        createConversationInput(user.id, 'Ordered thread'),
      );

      await harness.adapter.saveMessage(
        createMessageInput(conversation.id, 'user', 'First update'),
      );
      await harness.adapter.saveMessage(
        createMessageInput(conversation.id, 'assistant', 'Second update'),
      );

      const messages = await harness.adapter.getMessages(conversation.id);

      expect(messages.map((message) => message.content)).toEqual(['First update', 'Second update']);
    });

    it('updates and persists the memory summary', async () => {
      const user = await harness.adapter.createUser(createUserInput('memory-update'));

      const updatedUser = await harness.adapter.updateMemorySummary(
        user.id,
        '- Prefers practical reminders',
      );
      const fetchedUser = await harness.adapter.getUser(user.id);

      expect(updatedUser.memorySummary).toBe('- Prefers practical reminders');
      expect(fetchedUser?.memorySummary).toBe('- Prefers practical reminders');
    });
  });
};
