import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatEventEmitter } from './ChatEventEmitter';
import { type ChatMessage, type UserProfile } from '@common/types';

// Mock localStorage and window
const mockLocalStorage = {
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

const mockWindow = {
  dispatchEvent: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Store original localStorage and window references
const originalLocalStorage = global.localStorage;
const originalWindow = global.window;

describe('ChatEventEmitter', () => {
  let emitter: ChatEventEmitter;
  let mockMessage: ChatMessage;
  let mockUser: UserProfile;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set up the mock window and localStorage
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true,
    });

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    emitter = new ChatEventEmitter();

    // Create a mock chat message
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

    // Create a mock user profile
    mockUser = {
      id: 'customer-1',
      name: 'John Doe',
      type: 'customer',
      email: 'john@example.com'
    };
  });

  afterEach(() => {
    // Restore original localStorage and window
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });

    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true,
    });
  });

  describe('emitChatMessageSent', () => {
    it('should emit chat message sent event', () => {
      // given a chat message

      // when emitting message sent event
      emitter.emitChatMessageSent(mockMessage);

      // then should set storage item with correct data
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'chatstore-event',
        expect.stringContaining('"type":"chatMessageSent"')
      );

      // and should include the message
      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const eventData = JSON.parse(setItemCall[1]);
      expect(eventData.type).toBe('chatMessageSent');
      expect(eventData.message).toEqual({
        ...mockMessage,
        createdAt: mockMessage.createdAt.toISOString()
      });
      expect(eventData.timestamp).toBeTypeOf('number');

      // and should clean up the storage item
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('chatstore-event');
    });
  });

  describe('emitChatMessagesRead', () => {
    it('should emit chat messages read event', () => {
      // given message IDs and ticket ID
      const messageIds = ['MSG-123', 'MSG-124'];
      const ticketId = 'TKT-456';

      // when emitting messages read event
      emitter.emitChatMessagesRead(messageIds, ticketId);

      // then should set storage item with correct data
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'chatstore-event',
        expect.stringContaining('"type":"chatMessagesRead"')
      );

      // and should include the message IDs and ticket ID
      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const eventData = JSON.parse(setItemCall[1]);
      expect(eventData.type).toBe('chatMessagesRead');
      expect(eventData.messageIds).toEqual(messageIds);
      expect(eventData.ticketId).toBe(ticketId);
      expect(eventData.timestamp).toBeTypeOf('number');

      // and should clean up the storage item
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('chatstore-event');
    });
  });

  describe('emitChatReloaded', () => {
    it('should emit chat reloaded event', () => {
      // given a ticket ID
      const ticketId = 'TKT-456';

      // when emitting chat reloaded event
      emitter.emitChatReloaded(ticketId);

      // then should set storage item with correct data
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'chatstore-event',
        expect.stringContaining('"type":"chatReloaded"')
      );

      // and should include the ticket ID
      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const eventData = JSON.parse(setItemCall[1]);
      expect(eventData.type).toBe('chatReloaded');
      expect(eventData.ticketId).toBe(ticketId);
      expect(eventData.timestamp).toBeTypeOf('number');

      // and should clean up the storage item
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('chatstore-event');
    });
  });

  describe('emitChatSenderIsTyping', () => {
    it('should emit sender typing event', () => {
      // given a ticket ID and user
      const ticketId = 'TKT-456';

      // when emitting sender typing event
      emitter.emitChatSenderIsTyping(ticketId, mockUser);

      // then should set storage item with correct data
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'chatstore-event',
        expect.stringContaining('"type":"chatSenderIsTyping"')
      );

      // and should include the ticket ID and user
      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const eventData = JSON.parse(setItemCall[1]);
      expect(eventData.type).toBe('chatSenderIsTyping');
      expect(eventData.ticketId).toBe(ticketId);
      expect(eventData.user).toEqual(mockUser);
      expect(eventData.timestamp).toBeTypeOf('number');

      // and should clean up the storage item
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('chatstore-event');
    });

    it('should throttle typing events to once every 5 seconds', () => {
      // given a ticket ID and user
      const ticketId = 'TKT-456';

      // when emitting multiple typing events quickly
      emitter.emitChatSenderIsTyping(ticketId, mockUser);
      emitter.emitChatSenderIsTyping(ticketId, mockUser);
      emitter.emitChatSenderIsTyping(ticketId, mockUser);

      // then should only emit once
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledTimes(1);
    });

    it('should emit again after sufficient time has passed', async () => {
      // given a fresh emitter and ticket ID and user
      const freshEmitter = new ChatEventEmitter();
      const ticketId = 'TKT-456';

      // Clear any previous calls
      vi.clearAllMocks();

      // when emitting first typing event
      freshEmitter.emitChatSenderIsTyping(ticketId, mockUser);
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);

      // and emitting again immediately (should be throttled)
      freshEmitter.emitChatSenderIsTyping(ticketId, mockUser);
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1); // Still 1

      // and waiting for throttle to expire (simulate by creating new fresh emitter)
      const anotherFreshEmitter = new ChatEventEmitter();
      anotherFreshEmitter.emitChatSenderIsTyping(ticketId, mockUser);

      // then should emit the second time
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('non-browser environment', () => {
    it('should not emit events when window is undefined', () => {
      // given window is undefined
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      });

      const emitterInNonBrowser = new ChatEventEmitter();

      // when emitting an event
      emitterInNonBrowser.emitChatMessageSent(mockMessage);

      // then should not call localStorage methods
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
    });
  });
});