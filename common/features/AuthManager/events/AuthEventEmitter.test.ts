import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthEventEmitterLocal } from './AuthEventEmitterLocal';
import { type AuthUser } from '@common/types';

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

// Store original implementations
const originalLocalStorage = global.localStorage;
const originalWindow = global.window;

describe('AuthEventEmitter', () => {
  let emitter: AuthEventEmitterLocal;
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

    // Create emitter instance
    emitter = new AuthEventEmitterLocal();

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
  });

  afterEach(() => {
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

  describe('emitUserSignedIn', () => {
    it('should emit user signed in event', () => {
      // When emitting user signed in
      emitter.emitUserSignedIn(mockAuthUser);

      // Then window event should be dispatched twice (sign in + state change)
      expect(mockWindow.dispatchEvent).toHaveBeenCalledTimes(2);

      // And localStorage should be used for cross-tab communication twice
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('emitUserSignedOut', () => {
    it('should emit user signed out event', () => {
      // When emitting user signed out
      emitter.emitUserSignedOut();

      // Then window event should be dispatched twice (sign out + state change)
      expect(mockWindow.dispatchEvent).toHaveBeenCalledTimes(2);

      // And localStorage should be used for cross-tab communication twice
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('emitAuthStateChanged', () => {
    it('should emit auth state changed event', () => {
      // When emitting auth state changed
      emitter.emitAuthStateChanged(mockAuthUser);

      // Then window event should be dispatched once
      expect(mockWindow.dispatchEvent).toHaveBeenCalledTimes(1);

      // And localStorage should be used for cross-tab communication
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledTimes(1);
    });

    it('should emit auth state changed event with not-signed-in status', () => {
      // When emitting auth state changed with not-signed-in status
      emitter.emitAuthStateChanged({ status: 'not-signed-in' });

      // Then window event should be dispatched once
      expect(mockWindow.dispatchEvent).toHaveBeenCalledTimes(1);

      // And localStorage should be used for cross-tab communication
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('storage event structure', () => {
    it('should create storage event with correct JSON structure', () => {
      // When emitting user signed in
      emitter.emitUserSignedIn(mockAuthUser);

      // Then localStorage.setItem should be called with correct structure
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'authstore-event',
        expect.stringMatching(/{"type":"userSignedIn","authUser":.*,"timestamp":\d+}/)
      );
    });
  });

  describe('window event structure', () => {
    it('should dispatch custom window event with correct structure', () => {
      // When emitting user signed in
      emitter.emitUserSignedIn(mockAuthUser);

      // Then dispatchEvent should be called with correct CustomEvent
      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth-event',
          detail: expect.objectContaining({
            type: 'userSignedIn',
            authUser: mockAuthUser,
            timestamp: expect.any(Number)
          })
        })
      );
    });
  });

  describe('non-browser environment', () => {
    it('should handle undefined window gracefully', () => {
      // Given undefined window
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      });

      const emitterInNonBrowser = new AuthEventEmitterLocal();

      // When emitting user signed in
      expect(() => {
        emitterInNonBrowser.emitUserSignedIn(mockAuthUser);
      }).not.toThrow();

      // Then no window operations should be attempted
      expect(mockWindow.dispatchEvent).not.toHaveBeenCalled();
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });
});