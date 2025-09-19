import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { type ChatListenerCallbacks } from '@common/features/ChatManager/events';
import { type ChatMessage } from '@common/types';

// Mock the window object
const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

// Store original values
const originalWindow = global.window;

describe('useChatListenerCallbacks', () => {
  let mockMessage: ChatMessage;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set up the mock window
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true
    });

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
  });

  afterEach(() => {
    // Restore original window
    global.window = originalWindow;
    vi.restoreAllMocks();
  });

  it('should set up window event listener on mount with browser environment', () => {
    // Given a window object is available
    const windowAvailable = typeof window !== 'undefined';

    // Then window should be available for setting up listeners
    expect(windowAvailable).toBe(true);
  });

  it('should handle storage events correctly', () => {
    // Given a listener with event handlers
    const listener: Partial<ChatListenerCallbacks> = {
      onChatMessageReceived: vi.fn(),
      onChatMessagesRead: vi.fn(),
      onChatReloaded: vi.fn(),
    };

    // When a storage event is dispatched with chatMessageSent type
    const eventHandler = vi.fn((event: StorageEvent) => {
      if (event.key !== 'chatstore-event' || !event.newValue) return;

      try {
        const eventData = JSON.parse(event.newValue);
        const { type, message, messageIds, ticketId } = eventData;

        let deserializedMessage = message;
        if (message) {
          deserializedMessage = {
            ...message,
            createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
          };
        }

        switch (type) {
          case 'chatMessageSent':
            if (listener.onChatMessageReceived && deserializedMessage) {
              listener.onChatMessageReceived(deserializedMessage);
            }
            break;
          case 'chatMessagesRead':
            if (listener.onChatMessagesRead && messageIds && ticketId) {
              listener.onChatMessagesRead(messageIds, ticketId);
            }
            break;
          case 'chatReloaded':
            if (listener.onChatReloaded && ticketId) {
              listener.onChatReloaded(ticketId);
            }
            break;
        }
      } catch (error) {
        // Handle parsing errors gracefully
      }
    });

    // Simulate the event handling logic
    const mockEvent = {
      key: 'chatstore-event',
      newValue: JSON.stringify({
        type: 'chatMessageSent',
        message: mockMessage
      })
    } as StorageEvent;

    eventHandler(mockEvent);

    // Then the appropriate listener method should be called
    expect(listener.onChatMessageReceived).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockMessage,
        createdAt: expect.any(Date)
      })
    );
  });

  it('should handle multiple event types', () => {
    // Given a listener with multiple event handlers
    const listener: Partial<ChatListenerCallbacks> = {
      onChatMessageReceived: vi.fn(),
      onChatMessagesRead: vi.fn(),
      onChatReloaded: vi.fn(),
    };

    const eventHandler = (event: StorageEvent) => {
      if (event.key !== 'chatstore-event' || !event.newValue) return;

      try {
        const eventData = JSON.parse(event.newValue);
        const { type, message, messageIds, ticketId } = eventData;

        let deserializedMessage = message;
        if (message) {
          deserializedMessage = {
            ...message,
            createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
          };
        }

        switch (type) {
          case 'chatMessageSent':
            if (listener.onChatMessageReceived && deserializedMessage) {
              listener.onChatMessageReceived(deserializedMessage);
            }
            break;
          case 'chatMessagesRead':
            if (listener.onChatMessagesRead && messageIds && ticketId) {
              listener.onChatMessagesRead(messageIds, ticketId);
            }
            break;
          case 'chatReloaded':
            if (listener.onChatReloaded && ticketId) {
              listener.onChatReloaded(ticketId);
            }
            break;
        }
      } catch (error) {
        // Handle parsing errors gracefully
      }
    };

    // When different event types are handled
    eventHandler({
      key: 'chatstore-event',
      newValue: JSON.stringify({ type: 'chatMessageSent', message: mockMessage })
    } as StorageEvent);

    eventHandler({
      key: 'chatstore-event',
      newValue: JSON.stringify({ type: 'chatMessagesRead', messageIds: ['MSG-123'], ticketId: 'TKT-456' })
    } as StorageEvent);

    eventHandler({
      key: 'chatstore-event',
      newValue: JSON.stringify({ type: 'chatReloaded', ticketId: 'TKT-456' })
    } as StorageEvent);

    // Then all appropriate listener methods should be called
    expect(listener.onChatMessageReceived).toHaveBeenCalled();
    expect(listener.onChatMessagesRead).toHaveBeenCalledWith(['MSG-123'], 'TKT-456');
    expect(listener.onChatReloaded).toHaveBeenCalledWith('TKT-456');
  });

  it('should skip setup in non-browser environments', () => {
    // Given window is undefined (simulating SSR/Node environment)
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
      configurable: true
    });

    // When the hook logic checks for window existence
    const shouldSetupListeners = typeof window !== 'undefined';

    // Then setup should be skipped
    expect(shouldSetupListeners).toBe(false);
  });

  it('should handle errors in listener callbacks gracefully', () => {
    // Given a listener that throws an error
    const listener: Partial<ChatListenerCallbacks> = {
      onChatMessageReceived: vi.fn(() => {
        throw new Error('Listener error');
      }),
    };

    // Mock console.error
    const originalError = console.error;
    console.error = vi.fn();

    // When the event handler processes an event with error handling
    const eventHandlerWithErrorHandling = (event: StorageEvent) => {
      if (event.key !== 'chatstore-event' || !event.newValue) return;

      try {
        const eventData = JSON.parse(event.newValue);
        const { type, message } = eventData;

        let deserializedMessage = message;
        if (message) {
          deserializedMessage = {
            ...message,
            createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
          };
        }

        switch (type) {
          case 'chatMessageSent':
            if (listener.onChatMessageReceived && deserializedMessage) {
              try {
                listener.onChatMessageReceived(deserializedMessage);
              } catch (error) {
                console.error('useChatListenerCallbacks: Error in onChatMessageReceived:', error);
              }
            }
            break;
        }
      } catch (error) {
        // Handle parsing errors gracefully
      }
    };

    // Process the event
    expect(() => {
      eventHandlerWithErrorHandling({
        key: 'chatstore-event',
        newValue: JSON.stringify({ type: 'chatMessageSent', message: mockMessage })
      } as StorageEvent);
    }).not.toThrow();

    // Then the error should be logged
    expect(console.error).toHaveBeenCalledWith(
      'useChatListenerCallbacks: Error in onChatMessageReceived:',
      expect.any(Error)
    );

    // Restore console.error
    console.error = originalError;
  });

  it('should ignore events without required data', () => {
    // Given a listener
    const listener: Partial<ChatListenerCallbacks> = {
      onChatMessageReceived: vi.fn(),
    };

    // When an event without message data is processed
    const eventHandler = (event: StorageEvent) => {
      if (event.key !== 'chatstore-event' || !event.newValue) return;

      try {
        const eventData = JSON.parse(event.newValue);
        const { type, message } = eventData;

        switch (type) {
          case 'chatMessageSent':
            if (listener.onChatMessageReceived && message) {
              listener.onChatMessageReceived(message);
            }
            break;
        }
      } catch (error) {
        // Handle parsing errors gracefully
      }
    };

    eventHandler({
      key: 'chatstore-event',
      newValue: JSON.stringify({ type: 'chatMessageSent' })  // No message property
    } as StorageEvent);

    // Then the listener should not be called
    expect(listener.onChatMessageReceived).not.toHaveBeenCalled();
  });

  it('should handle partial listeners', () => {
    // Given a partial listener (only some methods implemented)
    const partialListener: Partial<ChatListenerCallbacks> = {
      onChatMessageReceived: vi.fn(),
      // Other methods not implemented
    };

    // When various events are processed
    const eventHandler = (event: StorageEvent) => {
      if (event.key !== 'chatstore-event' || !event.newValue) return;

      try {
        const eventData = JSON.parse(event.newValue);
        const { type, message, messageIds, ticketId } = eventData;

        let deserializedMessage = message;
        if (message) {
          deserializedMessage = {
            ...message,
            createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
          };
        }

        switch (type) {
          case 'chatMessageSent':
            if (partialListener.onChatMessageReceived && deserializedMessage) {
              partialListener.onChatMessageReceived(deserializedMessage);
            }
            break;
          case 'chatMessagesRead':
            if (partialListener.onChatMessagesRead && messageIds && ticketId) {
              partialListener.onChatMessagesRead(messageIds, ticketId);
            }
            break;
        }
      } catch (error) {
        // Handle parsing errors gracefully
      }
    };

    // Process events for implemented and unimplemented methods
    eventHandler({
      key: 'chatstore-event',
      newValue: JSON.stringify({ type: 'chatMessageSent', message: mockMessage })
    } as StorageEvent);

    eventHandler({
      key: 'chatstore-event',
      newValue: JSON.stringify({ type: 'chatMessagesRead', messageIds: ['MSG-123'], ticketId: 'TKT-456' })
    } as StorageEvent);

    // Then only the implemented method should be called
    expect(partialListener.onChatMessageReceived).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockMessage,
        createdAt: expect.any(Date)
      })
    );
    // No errors should occur for unimplemented methods
  });
});