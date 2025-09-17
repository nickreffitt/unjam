import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatStore } from './ChatStore';
import { type ChatMessage, type CustomerProfile, type EngineerProfile } from '@common/types';

describe('ChatStore', () => {
  const ticketId = 'TKT-123';
  let chatStore: ChatStore;

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
    // Create new instance
    chatStore = new ChatStore(ticketId);
  });

  describe('constructor', () => {
    it('should initialize with empty messages when no stored data exists', () => {
      const messages = chatStore.getAll();
      expect(messages).toEqual([]);
    });

    it('should load messages from localStorage if they exist', () => {
      // Arrange
      const storedMessages = [mockMessage];
      localStorage.setItem(`chatStore-${ticketId}`, JSON.stringify(storedMessages));

      // Act
      const newChatStore = new ChatStore(ticketId);

      // Assert
      const messages = newChatStore.getAll();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe(mockMessage.content);
    });
  });

  describe('create', () => {
    it('should create a new message and return it', () => {
      // Act
      const createdMessage = chatStore.create(mockMessage);

      // Assert
      expect(createdMessage).toEqual(mockMessage);
      const messages = chatStore.getAll();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(mockMessage);
    });

    it('should save messages to localStorage', () => {
      // Act
      chatStore.create(mockMessage);

      // Assert
      const stored = localStorage.getItem(`chatStore-${ticketId}`);
      expect(stored).toBeTruthy();
      const parsedMessages = JSON.parse(stored!);
      expect(parsedMessages).toHaveLength(1);
      expect(parsedMessages[0].content).toBe(mockMessage.content);
    });

    it('should maintain chronological order', () => {
      // Arrange
      const message1 = { ...mockMessage, id: 'MSG-1', createdAt: new Date('2024-01-01T10:00:00Z') };
      const message2 = { ...mockMessage, id: 'MSG-2', createdAt: new Date('2024-01-01T10:01:00Z') };
      const message3 = { ...mockMessage, id: 'MSG-3', createdAt: new Date('2024-01-01T10:02:00Z') };

      // Act
      chatStore.create(message1);
      chatStore.create(message2);
      chatStore.create(message3);

      // Assert
      const messages = chatStore.getAll();
      expect(messages).toHaveLength(3);
      expect(messages[0].id).toBe('MSG-1');
      expect(messages[1].id).toBe('MSG-2');
      expect(messages[2].id).toBe('MSG-3');
    });
  });

  describe('getRecent', () => {
    beforeEach(() => {
      // Create 5 messages
      for (let i = 1; i <= 5; i++) {
        chatStore.create({
          ...mockMessage,
          id: `MSG-${i}`,
          content: `Message ${i}`,
          createdAt: new Date(`2024-01-01T10:0${i}:00Z`)
        });
      }
    });

    it('should return messages in ascending chronological order', () => {
      // Act
      const messages = chatStore.getRecent(3);

      // Assert
      expect(messages).toHaveLength(3);
      expect(messages[0].id).toBe('MSG-1');
      expect(messages[1].id).toBe('MSG-2');
      expect(messages[2].id).toBe('MSG-3');
    });

    it('should respect size parameter', () => {
      // Act
      const messages = chatStore.getRecent(2);

      // Assert
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe('MSG-1');
      expect(messages[1].id).toBe('MSG-2');
    });

    it('should respect offset parameter', () => {
      // Act
      const messages = chatStore.getRecent(2, 2);

      // Assert
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe('MSG-3');
      expect(messages[1].id).toBe('MSG-4');
    });

    it('should return remaining messages when size exceeds available', () => {
      // Act
      const messages = chatStore.getRecent(10, 3);

      // Assert
      expect(messages).toHaveLength(2); // Only MSG-4 and MSG-5 remain
      expect(messages[0].id).toBe('MSG-4');
      expect(messages[1].id).toBe('MSG-5');
    });

    it('should return empty array when offset exceeds total messages', () => {
      // Act
      const messages = chatStore.getRecent(5, 10);

      // Assert
      expect(messages).toHaveLength(0);
    });

    it('should return copies to prevent external mutations', () => {
      // Act
      const messages = chatStore.getRecent(1);
      messages[0].content = 'Modified content';

      // Assert
      const originalMessages = chatStore.getAll();
      expect(originalMessages[0].content).toBe('Message 1');
    });
  });

  describe('markAsRead', () => {
    beforeEach(() => {
      chatStore.create({ ...mockMessage, id: 'MSG-1', isRead: false });
      chatStore.create({ ...mockMessage, id: 'MSG-2', isRead: false });
      chatStore.create({ ...mockMessage, id: 'MSG-3', isRead: true });
    });

    it('should mark specified messages as read', () => {
      // Act
      chatStore.markAsRead(['MSG-1', 'MSG-2']);

      // Assert
      const messages = chatStore.getAll();
      expect(messages[0].isRead).toBe(true);
      expect(messages[1].isRead).toBe(true);
      expect(messages[2].isRead).toBe(true); // Already was true
    });

    it('should not modify messages that are already read', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'info');

      // Act
      chatStore.markAsRead(['MSG-3']);

      // Assert
      // Should not save since no changes were made
      const messages = chatStore.getAll();
      expect(messages[2].isRead).toBe(true);
      // markAsRead should not be called if no changes
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Marked messages as read')
      );
    });

    it('should save changes to localStorage', () => {
      // Act
      chatStore.markAsRead(['MSG-1']);

      // Assert
      const stored = localStorage.getItem(`chatStore-${ticketId}`);
      const parsedMessages = JSON.parse(stored!);
      expect(parsedMessages[0].isRead).toBe(true);
    });

    it('should handle non-existent message IDs gracefully', () => {
      // Act & Assert (should not throw)
      expect(() => {
        chatStore.markAsRead(['MSG-999']);
      }).not.toThrow();
    });
  });

  describe('getCount', () => {
    it('should return 0 for empty store', () => {
      expect(chatStore.getCount()).toBe(0);
    });

    it('should return correct count after adding messages', () => {
      chatStore.create(mockMessage);
      chatStore.create({ ...mockMessage, id: 'MSG-2' });
      chatStore.create({ ...mockMessage, id: 'MSG-3' });

      expect(chatStore.getCount()).toBe(3);
    });
  });

  describe('reload', () => {
    it('should reload messages from localStorage', () => {
      // Arrange
      chatStore.create(mockMessage);

      // Simulate another tab adding a message
      const storedMessages = chatStore.getAll();
      const newMessage = { ...mockMessage, id: 'MSG-2', content: 'New message from another tab' };
      localStorage.setItem(
        `chatStore-${ticketId}`,
        JSON.stringify([...storedMessages, newMessage])
      );

      // Act
      chatStore.reload();

      // Assert
      const messages = chatStore.getAll();
      expect(messages).toHaveLength(2);
      expect(messages[1].content).toBe('New message from another tab');
    });
  });

  describe('clear', () => {
    it('should remove all messages', () => {
      // Arrange
      chatStore.create(mockMessage);
      chatStore.create({ ...mockMessage, id: 'MSG-2' });

      // Act
      chatStore.clear();

      // Assert
      expect(chatStore.getAll()).toHaveLength(0);
      expect(chatStore.getCount()).toBe(0);
    });

    it('should clear localStorage', () => {
      // Arrange
      chatStore.create(mockMessage);

      // Act
      chatStore.clear();

      // Assert
      const stored = localStorage.getItem(`chatStore-${ticketId}`);
      expect(JSON.parse(stored!)).toEqual([]);
    });
  });
});