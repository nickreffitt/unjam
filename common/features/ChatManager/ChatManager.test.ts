import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatManager } from './ChatManager';
import { type CustomerProfile, type EngineerProfile } from '@common/types';

describe('ChatManager', () => {
  const ticketId = 'TKT-123';
  let chatManager: ChatManager;

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

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset console mocks
    vi.clearAllMocks();
    // Create new instance with customer as sender, engineer as receiver
    chatManager = new ChatManager(ticketId, mockCustomer, mockEngineer);
  });

  describe('constructor', () => {
    it('should initialize with provided ticket ID and profiles', () => {
      expect(chatManager.getTicketId()).toBe(ticketId);
      expect(chatManager.getSender()).toEqual(mockCustomer);
      expect(chatManager.getReceiver()).toEqual(mockEngineer);
    });

    it('should create ChatManager with engineer as sender', () => {
      const engineerChatManager = new ChatManager(ticketId, mockEngineer, mockCustomer);
      expect(engineerChatManager.getSender()).toEqual(mockEngineer);
      expect(engineerChatManager.getReceiver()).toEqual(mockCustomer);
    });
  });

  describe('send', () => {
    it('should send a message and return it', async () => {
      // Act
      const content = 'Hello, I need help with my issue';
      const message = await chatManager.send(content);

      // Assert
      expect(message).toBeDefined();
      expect(message.ticketId).toBe(ticketId);
      expect(message.sender).toEqual(mockCustomer);
      expect(message.receiver).toEqual(mockEngineer);
      expect(message.content).toBe(content);
      expect(message.createdAt).toBeInstanceOf(Date);
      expect(message.isRead).toBe(false);
      expect(message.id).toMatch(/^MSG-\d+-[a-z0-9]+$/);
    });

    it('should throw error for empty content', async () => {
      await expect(chatManager.send('')).rejects.toThrow('Message content cannot be empty');
      await expect(chatManager.send('   ')).rejects.toThrow('Message content cannot be empty');
    });

    it('should trim whitespace from content', async () => {
      const message = await chatManager.send('  Hello World  ');
      expect(message.content).toBe('Hello World');
    });

    it('should persist messages', async () => {
      // Act
      await chatManager.send('First message');
      await chatManager.send('Second message');

      // Assert
      const messages = await chatManager.getRecent();
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('First message');
      expect(messages[1].content).toBe('Second message');
    });

    it('should generate unique message IDs', async () => {
      const message1 = await chatManager.send('Message 1');
      const message2 = await chatManager.send('Message 2');

      expect(message1.id).not.toBe(message2.id);
    });
  });

  describe('getRecent', () => {
    beforeEach(async () => {
      // Add some test messages
      await chatManager.send('Message 1');
      await chatManager.send('Message 2');
      await chatManager.send('Message 3');
      await chatManager.send('Message 4');
      await chatManager.send('Message 5');
    });

    it('should return messages in ascending chronological order', async () => {
      const messages = await chatManager.getRecent(3);

      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('Message 1');
      expect(messages[1].content).toBe('Message 2');
      expect(messages[2].content).toBe('Message 3');
    });

    it('should respect size parameter', async () => {
      const messages = await chatManager.getRecent(2);

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Message 1');
      expect(messages[1].content).toBe('Message 2');
    });

    it('should respect offset parameter', async () => {
      const messages = await chatManager.getRecent(2, 2);

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Message 3');
      expect(messages[1].content).toBe('Message 4');
    });

    it('should use default size of 50 when not specified', async () => {
      // Add many more messages
      for (let i = 6; i <= 60; i++) {
        await chatManager.send(`Message ${i}`);
      }

      const messages = await chatManager.getRecent();
      expect(messages).toHaveLength(50);
    });

    it('should throw error for invalid size', async () => {
      await expect(chatManager.getRecent(0)).rejects.toThrow('Size must be greater than 0');
      await expect(chatManager.getRecent(-1)).rejects.toThrow('Size must be greater than 0');
    });

    it('should throw error for negative offset', async () => {
      await expect(chatManager.getRecent(10, -1)).rejects.toThrow('Offset cannot be negative');
    });

    it('should return empty array when offset exceeds messages', async () => {
      const messages = await chatManager.getRecent(10, 100);
      expect(messages).toHaveLength(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
      // Arrange
      const message1 = await chatManager.send('Message 1');
      const message2 = await chatManager.send('Message 2');

      // Act
      await chatManager.markAsRead([message1.id, message2.id]);

      // Assert
      const messages = await chatManager.getRecent();
      expect(messages[0].isRead).toBe(true);
      expect(messages[1].isRead).toBe(true);
    });

    it('should handle empty array gracefully', async () => {
      await expect(chatManager.markAsRead([])).resolves.not.toThrow();
    });

    it('should handle undefined gracefully', async () => {
      await expect(chatManager.markAsRead(undefined as any)).resolves.not.toThrow();
    });
  });

  describe('getMessageCount', () => {
    it('should return 0 initially', () => {
      expect(chatManager.getMessageCount()).toBe(0);
    });

    it('should return correct count after sending messages', async () => {
      await chatManager.send('Message 1');
      await chatManager.send('Message 2');
      await chatManager.send('Message 3');

      expect(chatManager.getMessageCount()).toBe(3);
    });
  });

  describe('reload', () => {
    it('should reload messages from storage', async () => {
      // Arrange
      await chatManager.send('Initial message');

      // Simulate another tab/instance adding messages
      const anotherChatManager = new ChatManager(ticketId, mockEngineer, mockCustomer);
      await anotherChatManager.send('Message from engineer');

      // Act
      chatManager.reload();

      // Assert
      const messages = await chatManager.getRecent();
      expect(messages).toHaveLength(2);
      expect(messages[1].content).toBe('Message from engineer');
      expect(messages[1].sender).toEqual(mockEngineer);
    });
  });

  describe('cross-tab communication', () => {
    it('should allow chat between customer and engineer', async () => {
      // Customer sends a message
      const customerChat = new ChatManager(ticketId, mockCustomer, mockEngineer);
      await customerChat.send('Hello, I need help');

      // Engineer loads the chat
      const engineerChat = new ChatManager(ticketId, mockEngineer, mockCustomer);
      let messages = await engineerChat.getRecent();

      expect(messages).toHaveLength(1);
      expect(messages[0].sender).toEqual(mockCustomer);
      expect(messages[0].receiver).toEqual(mockEngineer);

      // Engineer responds
      await engineerChat.send('Hi, I can help you with that');

      // Customer reloads to see the response
      customerChat.reload();
      messages = await customerChat.getRecent();

      expect(messages).toHaveLength(2);
      expect(messages[1].sender).toEqual(mockEngineer);
      expect(messages[1].receiver).toEqual(mockCustomer);
      expect(messages[1].content).toBe('Hi, I can help you with that');
    });
  });
});