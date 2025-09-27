import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthListenerLocal } from './AuthListenerLocal';
import { type AuthUser } from '@common/types';

// Mock localStorage and window
const mockLocalStorage = {
  getItem: vi.fn(),
  removeItem: vi.fn(),
};

const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Store original implementations
const originalLocalStorage = global.localStorage;
const originalWindow = global.window;

describe('AuthListener', () => {
  let listener: AuthListenerLocal;
  let mockCallbacks: any;
  let mockAuthUser: AuthUser;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock global objects
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true,
    });

    // Create mock callbacks
    mockCallbacks = {
      onUserSignedIn: vi.fn(),
      onUserSignedOut: vi.fn(),
      onAuthStateChanged: vi.fn(),
    };

    // Create mock AuthUser
    mockAuthUser = {
      status: 'signed-in',
      user: {
        id: 'user-1',
        createdAt: new Date(),
        email: 'test@example.com'
      },
      profile: {
        id: 'user-1',
        name: 'Test User',
        type: 'customer',
        email: 'test@example.com'
      }
    };

    // Create listener instance
    listener = new AuthListenerLocal(mockCallbacks);
  });

  afterEach(() => {
    // Stop listening if started
    if (listener.getIsListening()) {
      listener.stopListening();
    }

    // Restore original implementations
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });

    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true,
    });
  });

  describe('startListening', () => {
    it('should start listening to window and storage events', () => {
      // When starting to listen
      listener.startListening();

      // Then window event listeners should be added
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'auth-event',
        expect.any(Function)
      );
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      );

      // And isListening should be true
      expect(listener.getIsListening()).toBe(true);
    });

    it('should not add duplicate listeners when called multiple times', () => {
      // When starting to listen multiple times
      listener.startListening();
      listener.startListening();

      // Then event listeners should only be added once
      expect(mockWindow.addEventListener).toHaveBeenCalledTimes(2);
    });
  });

  describe('stopListening', () => {
    it('should stop listening to events', () => {
      // Given listener is started
      listener.startListening();

      // When stopping
      listener.stopListening();

      // Then window event listeners should be removed
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'auth-event',
        expect.any(Function)
      );
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      );

      // And isListening should be false
      expect(listener.getIsListening()).toBe(false);
    });
  });

  describe('updateCallbacks', () => {
    it('should update callbacks', () => {
      // Given new callbacks
      const newCallbacks = {
        onUserSignedIn: vi.fn(),
      };

      // When updating callbacks
      listener.updateCallbacks(newCallbacks);

      // Then callbacks should be updated (we can't directly test this,
      // but we can verify it doesn't throw)
      expect(() => listener.updateCallbacks(newCallbacks)).not.toThrow();
    });
  });

  describe('window event handling', () => {
    it('should handle userSignedIn window events', () => {
      // Given listener is started
      listener.startListening();

      // Get the event handler that was registered
      const eventHandler = mockWindow.addEventListener.mock.calls
        .find(call => call[0] === 'auth-event')[1];

      // When window event is triggered
      const mockEvent = {
        detail: {
          type: 'userSignedIn',
          authUser: mockAuthUser,
          timestamp: Date.now()
        }
      };
      eventHandler(mockEvent);

      // Then callback should be called
      expect(mockCallbacks.onUserSignedIn).toHaveBeenCalledWith(mockAuthUser);
    });

    it('should handle userSignedOut window events', () => {
      // Given listener is started
      listener.startListening();

      // Get the event handler that was registered
      const eventHandler = mockWindow.addEventListener.mock.calls
        .find(call => call[0] === 'auth-event')[1];

      // When window event is triggered
      const mockEvent = {
        detail: {
          type: 'userSignedOut',
          timestamp: Date.now()
        }
      };
      eventHandler(mockEvent);

      // Then callback should be called
      expect(mockCallbacks.onUserSignedOut).toHaveBeenCalled();
    });

    it('should handle authStateChanged window events', () => {
      // Given listener is started
      listener.startListening();

      // Get the event handler that was registered
      const eventHandler = mockWindow.addEventListener.mock.calls
        .find(call => call[0] === 'auth-event')[1];

      // When window event is triggered
      const mockEvent = {
        detail: {
          type: 'authStateChanged',
          authUser: mockAuthUser,
          timestamp: Date.now()
        }
      };
      eventHandler(mockEvent);

      // Then callback should be called
      expect(mockCallbacks.onAuthStateChanged).toHaveBeenCalledWith(mockAuthUser);
    });
  });

  describe('storage event handling', () => {
    it('should handle storage events for auth events', () => {
      // Given listener is started
      listener.startListening();

      // Mock localStorage.getItem to return auth event
      const authEvent = {
        type: 'userSignedIn',
        authUser: mockAuthUser,
        timestamp: Date.now()
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(authEvent));

      // Get the storage event handler
      const storageHandler = mockWindow.addEventListener.mock.calls
        .find(call => call[0] === 'storage')[1];

      // When storage event is triggered
      const mockStorageEvent = {
        key: 'authstore-event',
        newValue: JSON.stringify(authEvent)
      };
      storageHandler(mockStorageEvent);

      // Then callback should be called (with date serialized as string)
      const expectedAuthUser = {
        ...mockAuthUser,
        user: {
          ...mockAuthUser.user!,
          createdAt: mockAuthUser.user!.createdAt.toISOString()
        }
      };
      expect(mockCallbacks.onUserSignedIn).toHaveBeenCalledWith(expectedAuthUser);
    });

    it('should ignore storage events for other keys', () => {
      // Given listener is started
      listener.startListening();

      // Get the storage event handler
      const storageHandler = mockWindow.addEventListener.mock.calls
        .find(call => call[0] === 'storage')[1];

      // When storage event for different key is triggered
      const mockStorageEvent = {
        key: 'other-key',
        newValue: 'some-value'
      };
      storageHandler(mockStorageEvent);

      // Then no callbacks should be called
      expect(mockCallbacks.onUserSignedIn).not.toHaveBeenCalled();
      expect(mockCallbacks.onUserSignedOut).not.toHaveBeenCalled();
      expect(mockCallbacks.onAuthStateChanged).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle malformed storage event data gracefully', () => {
      // Given listener is started
      listener.startListening();

      // Mock console.error to verify error logging
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Get the storage event handler
      const storageHandler = mockWindow.addEventListener.mock.calls
        .find(call => call[0] === 'storage')[1];

      // When storage event with invalid JSON is triggered
      const mockStorageEvent = {
        key: 'authstore-event',
        newValue: 'invalid-json'
      };
      storageHandler(mockStorageEvent);

      // Then error should be logged and no callbacks called
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AuthListenerLocal: Error parsing storage event'),
        expect.any(Error)
      );
      expect(mockCallbacks.onUserSignedIn).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle callback errors gracefully', () => {
      // Given listener is started
      listener.startListening();

      // Mock callback to throw error
      mockCallbacks.onUserSignedIn.mockImplementation(() => {
        throw new Error('Callback error');
      });

      // Mock console.error to verify error logging
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Get the event handler
      const eventHandler = mockWindow.addEventListener.mock.calls
        .find(call => call[0] === 'auth-event')[1];

      // When event is triggered that causes callback error
      const mockEvent = {
        detail: {
          type: 'userSignedIn',
          authUser: mockAuthUser,
          timestamp: Date.now()
        }
      };
      eventHandler(mockEvent);

      // Then error should be logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AuthListenerLocal: Error in onUserSignedIn'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('non-browser environment', () => {
    it('should handle undefined window gracefully', () => {
      // Given undefined window
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      });

      const listenerInNonBrowser = new AuthListenerLocal(mockCallbacks);

      // When attempting to start listening
      expect(() => {
        listenerInNonBrowser.startListening();
      }).not.toThrow();

      // Then isListening should remain false
      expect(listenerInNonBrowser.getIsListening()).toBe(false);
    });
  });
});