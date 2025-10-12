import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatStoreLocal } from '@common/features/ChatManager/store/ChatStoreLocal';
import { ChatEventEmitterLocal } from '@common/features/ChatManager/events/ChatEventEmitterLocal';
import { type ChatMessage, type CustomerProfile, type EngineerProfile } from '@common/types';

describe('ChatStore', () => {
  const ticketId = 'TKT-123';
  let chatStore: ChatStoreLocal;

  const mockCustomer: CustomerProfile = {
    id: 'customer-1',
    name: 'John Doe',
    type: 'customer',
    email: 'john@example.com'
  };

  const mockEngineer: EngineerProfile = {
    id: 'engineer-1',
    name: 'Jane Smith',
    type: 'engineer',
    email: 'jane@example.com'
  };

  const mockMessage: ChatMessage = {
    id: 'MSG-1',
    ticketId,
    sender: mockCustomer,
    receiver: mockEngineer,
    content: 'Hello, I need help with my issue',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    isRead: false
  };

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset console mocks
    vi.clearAllMocks();
    // Create new instance with event emitter
    const eventEmitter = new ChatEventEmitterLocal();
    chatStore = new ChatStoreLocal(ticketId, eventEmitter);
  });

  describe('constructor', () => {
    it('should initialize with empty messages when no stored data exists', async () => {
      const messages = await chatStore.getAll();
      expect(messages).toEqual([]);
    });

    it('should load messages from localStorage if they exist', async () => {
      // Arrange
      const storedMessages = [mockMessage];
      localStorage.setItem(`chatStore-${ticketId}`, JSON.stringify(storedMessages));

      // Act
      const eventEmitter = new ChatEventEmitterLocal();
      const newChatStore = new ChatStoreLocal(ticketId, eventEmitter);

      // Assert
      const messages = await newChatStore.getAll();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe(mockMessage.content);
    });
  });

  describe('create', () => {
    it('should create a new message and return it', async () => {
      // Act
      const createdMessage = await chatStore.create(mockMessage);

      // Assert
      expect(createdMessage).toEqual(mockMessage);
      const messages = await chatStore.getAll();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(mockMessage);
    });

    it('should save messages to localStorage', async () => {
      // Act
      await chatStore.create(mockMessage);

      // Assert
      const stored = localStorage.getItem(`chatStore-${ticketId}`);
      expect(stored).toBeTruthy();
      const parsedMessages = JSON.parse(stored!);
      expect(parsedMessages).toHaveLength(1);
      expect(parsedMessages[0].content).toBe(mockMessage.content);
    });

    it('should maintain chronological order', async () => {
      // Arrange
      const message1 = { ...mockMessage, id: 'MSG-1', createdAt: new Date('2024-01-01T10:00:00Z') };
      const message2 = { ...mockMessage, id: 'MSG-2', createdAt: new Date('2024-01-01T10:01:00Z') };
      const message3 = { ...mockMessage, id: 'MSG-3', createdAt: new Date('2024-01-01T10:02:00Z') };

      // Act
      await chatStore.create(message1);
      await chatStore.create(message2);
      await chatStore.create(message3);

      // Assert
      const messages = await chatStore.getAll();
      expect(messages).toHaveLength(3);
      expect(messages[0].id).toBe('MSG-1');
      expect(messages[1].id).toBe('MSG-2');
      expect(messages[2].id).toBe('MSG-3');
    });
  });

  describe('getRecent', () => {
    beforeEach(async () => {
      // Create 5 messages
      for (let i = 1; i <= 5; i++) {
        await chatStore.create({
          ...mockMessage,
          id: `MSG-${i}`,
          content: `Message ${i}`,
          createdAt: new Date(`2024-01-01T10:0${i}:00Z`)
        });
      }
    });

    it('should return messages in ascending chronological order', async () => {
      // Act
      const messages = await chatStore.getRecent(3);

      // Assert
      expect(messages).toHaveLength(3);
      expect(messages[0].id).toBe('MSG-1');
      expect(messages[1].id).toBe('MSG-2');
      expect(messages[2].id).toBe('MSG-3');
    });

    it('should respect size parameter', async () => {
      // Act
      const messages = await chatStore.getRecent(2);

      // Assert
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe('MSG-1');
      expect(messages[1].id).toBe('MSG-2');
    });

    it('should respect offset parameter', async () => {
      // Act
      const messages = await chatStore.getRecent(2, 2);

      // Assert
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe('MSG-3');
      expect(messages[1].id).toBe('MSG-4');
    });

    it('should return remaining messages when size exceeds available', async () => {
      // Act
      const messages = await chatStore.getRecent(10, 3);

      // Assert
      expect(messages).toHaveLength(2); // Only MSG-4 and MSG-5 remain
      expect(messages[0].id).toBe('MSG-4');
      expect(messages[1].id).toBe('MSG-5');
    });

    it('should return empty array when offset exceeds total messages', async () => {
      // Act
      const messages = await chatStore.getRecent(5, 10);

      // Assert
      expect(messages).toHaveLength(0);
    });

    it('should return copies to prevent external mutations', async () => {
      // Act
      const messages = await chatStore.getRecent(1);
      messages[0].content = 'Modified content';

      // Assert
      const originalMessages = await chatStore.getAll();
      expect(originalMessages[0].content).toBe('Message 1');
    });
  });

  describe('markAsRead', () => {
    beforeEach(async () => {
      await chatStore.create({ ...mockMessage, id: 'MSG-1', isRead: false });
      await chatStore.create({ ...mockMessage, id: 'MSG-2', isRead: false });
      await chatStore.create({ ...mockMessage, id: 'MSG-3', isRead: true });
    });

    it('should mark specified messages as read', async () => {
      // Act
      await chatStore.markAsRead(['MSG-1', 'MSG-2']);

      // Assert
      const messages = await chatStore.getAll();
      expect(messages[0].isRead).toBe(true);
      expect(messages[1].isRead).toBe(true);
      expect(messages[2].isRead).toBe(true); // Already was true
    });

    it('should not modify messages that are already read', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'info');

      // Act
      await chatStore.markAsRead(['MSG-3']);

      // Assert
      // Should not save since no changes were made
      const messages = await chatStore.getAll();
      expect(messages[2].isRead).toBe(true);
      // markAsRead should not be called if no changes
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Marked messages as read')
      );
    });

    it('should save changes to localStorage', async () => {
      // Act
      await chatStore.markAsRead(['MSG-1']);

      // Assert
      const stored = localStorage.getItem(`chatStore-${ticketId}`);
      const parsedMessages = JSON.parse(stored!);
      expect(parsedMessages[0].isRead).toBe(true);
    });

    it('should handle non-existent message IDs gracefully', async () => {
      // Act & Assert (should not throw)
      await expect(chatStore.markAsRead(['MSG-999'])).resolves.not.toThrow();
    });
  });

  describe('getCount', () => {
    it('should return 0 for empty store', async () => {
      expect(await chatStore.getCount()).toBe(0);
    });

    it('should return correct count after adding messages', async () => {
      await chatStore.create(mockMessage);
      await chatStore.create({ ...mockMessage, id: 'MSG-2' });
      await chatStore.create({ ...mockMessage, id: 'MSG-3' });

      expect(await chatStore.getCount()).toBe(3);
    });
  });

  describe('reload', () => {
    it('should reload messages from localStorage', async () => {
      // Arrange
      await chatStore.create(mockMessage);

      // Simulate another tab adding a message
      const storedMessages = await chatStore.getAll();
      const newMessage = { ...mockMessage, id: 'MSG-2', content: 'New message from another tab' };
      localStorage.setItem(
        `chatStore-${ticketId}`,
        JSON.stringify([...storedMessages, newMessage])
      );

      // Act
      chatStore.reload();

      // Assert
      const messages = await chatStore.getAll();
      expect(messages).toHaveLength(2);
      expect(messages[1].content).toBe('New message from another tab');
    });
  });

  describe('clear', () => {
    it('should remove all messages', async () => {
      // Arrange
      await chatStore.create(mockMessage);
      await chatStore.create({ ...mockMessage, id: 'MSG-2' });

      // Act
      await chatStore.clear();

      // Assert
      expect(await chatStore.getAll()).toHaveLength(0);
      expect(await chatStore.getCount()).toBe(0);
    });

    it('should clear localStorage', async () => {
      // Arrange
      await chatStore.create(mockMessage);

      // Act
      await chatStore.clear();

      // Assert
      const stored = localStorage.getItem(`chatStore-${ticketId}`);
      expect(JSON.parse(stored!)).toEqual([]);
    });
  });
});