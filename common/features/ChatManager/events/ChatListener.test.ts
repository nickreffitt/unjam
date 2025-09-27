import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatListenerLocal } from './ChatListenerLocal';
import { type ChatListenerCallbacks } from './ChatListener';
import { type ChatMessage, type UserProfile } from '@common/types';

// Mock window object
const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

// Store original window reference
const originalWindow = global.window;

describe('ChatListener', () => {
  let listener: ChatListenerLocal;
  let mockCallbacks: ChatListenerCallbacks;
  let mockMessage: ChatMessage;
  let mockUser: UserProfile;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set up the mock window
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true
    });

    mockCallbacks = {
      onChatMessageReceived: vi.fn(),
      onChatMessagesRead: vi.fn(),
      onChatReloaded: vi.fn(),
      onChatReceiverIsTyping: vi.fn(),
    };

    mockMessage = {
      id: 'MSG-123',
      ticketId: 'TKT-456',
      sender: {
        id: 'customer-1',
        name: 'John Doe',
        type: 'customer',
        email: 'john@example.com'
      },
      receiver: {
        id: 'engineer-1',
        name: 'Jane Smith',
        type: 'engineer',
        email: 'jane@example.com'
      },
      content: 'Hello, I need help',
      createdAt: new Date('2024-01-15T12:00:00Z'),
      isRead: false
    };

    mockUser = {
      id: 'customer-1',
      name: 'John Doe',
      type: 'customer',
      email: 'john@example.com'
    };

    listener = new ChatListenerLocal(mockCallbacks);
  });

  afterEach(() => {
    // Restore original window
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true
    });
  });

  describe('constructor', () => {
    it('should create listener with callbacks', () => {
      expect(listener).toBeDefined();
      expect(listener.getIsListening()).toBe(false);
    });
  });

  describe('startListening', () => {
    it('should add storage event listener', () => {
      // when starting to listen
      listener.startListening();

      // then should add event listener and be listening
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
      expect(listener.getIsListening()).toBe(true);
    });

    it('should not add listener twice', () => {
      // given already listening
      listener.startListening();

      // when starting to listen again
      listener.startListening();

      // then should only add listener once
      expect(mockWindow.addEventListener).toHaveBeenCalledTimes(1);
    });

    it('should not listen in non-browser environment', () => {
      // given window is undefined
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      });

      const listenerInNonBrowser = new ChatListenerLocal(mockCallbacks);

      // when starting to listen
      listenerInNonBrowser.startListening();

      // then should not be listening
      expect(listenerInNonBrowser.getIsListening()).toBe(false);
    });
  });

  describe('stopListening', () => {
    it('should remove storage event listener', () => {
      // given listening
      listener.startListening();

      // when stopping
      listener.stopListening();

      // then should remove event listener and not be listening
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
      expect(listener.getIsListening()).toBe(false);
    });

    it('should handle stop when not listening', () => {
      // when stopping without starting
      listener.stopListening();

      // then should not throw error
      expect(mockWindow.removeEventListener).not.toHaveBeenCalled();
      expect(listener.getIsListening()).toBe(false);
    });
  });

  describe('updateCallbacks', () => {
    it('should update callbacks', () => {
      const newCallbacks: ChatListenerCallbacks = {
        onChatMessageReceived: vi.fn(),
      };

      // when updating callbacks
      listener.updateCallbacks(newCallbacks);

      // then callbacks should be updated (we can't directly test this, but it shouldn't throw)
      expect(() => listener.updateCallbacks(newCallbacks)).not.toThrow();
    });
  });

  describe('storage event handling', () => {
    let storageHandler: (event: StorageEvent) => void;

    beforeEach(() => {
      listener.startListening();
      // Extract the event handler
      storageHandler = mockWindow.addEventListener.mock.calls[0][1];
    });

    it('should handle chatMessageSent event', () => {
      // given a storage event for chat message sent
      const storageEvent = {
        key: 'chatstore-event',
        newValue: JSON.stringify({
          type: 'chatMessageSent',
          message: mockMessage
        })
      } as StorageEvent;

      // when handling the event
      storageHandler(storageEvent);

      // then should call onChatMessageReceived callback
      expect(mockCallbacks.onChatMessageReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockMessage,
          createdAt: expect.any(Date)
        })
      );
    });

    it('should handle chatMessagesRead event', () => {
      // given a storage event for messages read
      const messageIds = ['MSG-123', 'MSG-124'];
      const ticketId = 'TKT-456';
      const storageEvent = {
        key: 'chatstore-event',
        newValue: JSON.stringify({
          type: 'chatMessagesRead',
          messageIds,
          ticketId
        })
      } as StorageEvent;

      // when handling the event
      storageHandler(storageEvent);

      // then should call onChatMessagesRead callback
      expect(mockCallbacks.onChatMessagesRead).toHaveBeenCalledWith(messageIds, ticketId);
    });

    it('should handle chatReloaded event', () => {
      // given a storage event for chat reloaded
      const ticketId = 'TKT-456';
      const storageEvent = {
        key: 'chatstore-event',
        newValue: JSON.stringify({
          type: 'chatReloaded',
          ticketId
        })
      } as StorageEvent;

      // when handling the event
      storageHandler(storageEvent);

      // then should call onChatReloaded callback
      expect(mockCallbacks.onChatReloaded).toHaveBeenCalledWith(ticketId);
    });

    it('should handle chatSenderIsTyping event', () => {
      // given a storage event for sender typing
      const ticketId = 'TKT-456';
      const storageEvent = {
        key: 'chatstore-event',
        newValue: JSON.stringify({
          type: 'chatSenderIsTyping',
          ticketId,
          user: mockUser
        })
      } as StorageEvent;

      // when handling the event
      storageHandler(storageEvent);

      // then should call onChatReceiverIsTyping callback
      expect(mockCallbacks.onChatReceiverIsTyping).toHaveBeenCalledWith(ticketId, mockUser);
    });

    it('should ignore events with wrong key', () => {
      // given a storage event with wrong key
      const storageEvent = {
        key: 'other-event',
        newValue: JSON.stringify({
          type: 'chatMessageSent',
          message: mockMessage
        })
      } as StorageEvent;

      // when handling the event
      storageHandler(storageEvent);

      // then should not call any callbacks
      expect(mockCallbacks.onChatMessageReceived).not.toHaveBeenCalled();
    });

    it('should ignore events with no newValue', () => {
      // given a storage event with no new value
      const storageEvent = {
        key: 'chatstore-event',
        newValue: null
      } as StorageEvent;

      // when handling the event
      storageHandler(storageEvent);

      // then should not call any callbacks
      expect(mockCallbacks.onChatMessageReceived).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON gracefully', () => {
      // given a storage event with invalid JSON
      const storageEvent = {
        key: 'chatstore-event',
        newValue: 'invalid json'
      } as StorageEvent;

      // when handling the event
      expect(() => storageHandler(storageEvent)).not.toThrow();

      // then should not call any callbacks
      expect(mockCallbacks.onChatMessageReceived).not.toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      // given callback that throws error
      mockCallbacks.onChatMessageReceived = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      const storageEvent = {
        key: 'chatstore-event',
        newValue: JSON.stringify({
          type: 'chatMessageSent',
          message: mockMessage
        })
      } as StorageEvent;

      // when handling the event
      expect(() => storageHandler(storageEvent)).not.toThrow();

      // then callback should have been called
      expect(mockCallbacks.onChatMessageReceived).toHaveBeenCalled();
    });

    it('should deserialize date objects correctly', () => {
      // given a storage event with date as string
      const messageWithStringDate = {
        ...mockMessage,
        createdAt: '2024-01-15T12:00:00Z'
      };

      const storageEvent = {
        key: 'chatstore-event',
        newValue: JSON.stringify({
          type: 'chatMessageSent',
          message: messageWithStringDate
        })
      } as StorageEvent;

      // when handling the event
      storageHandler(storageEvent);

      // then should deserialize date correctly
      expect(mockCallbacks.onChatMessageReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.any(Date)
        })
      );

      const callArg = (mockCallbacks.onChatMessageReceived as any).mock.calls[0][0];
      expect(callArg.createdAt).toBeInstanceOf(Date);
      expect(callArg.createdAt.toISOString()).toBe('2024-01-15T12:00:00.000Z');
    });
  });
});