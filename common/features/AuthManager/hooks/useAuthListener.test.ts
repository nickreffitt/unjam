import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useAuthListener } from './useAuthListener';
import { type AuthUser } from '@common/types';

// Mock the AuthListenerLocal import
vi.mock('../events', () => {
  return {
    AuthListenerLocal: vi.fn(),
  };
});

// Get the mocked constructor
import { AuthListenerLocal } from '../events';
const MockAuthListenerLocal = vi.mocked(AuthListenerLocal);

// Mock functions
const mockStartListening = vi.fn();
const mockStopListening = vi.fn();
const mockUpdateCallbacks = vi.fn();

describe('useAuthListener', () => {
  let mockCallbacks: any;
  let mockAuthUser: AuthUser;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set up mock implementation
    MockAuthListenerLocal.mockImplementation(() => ({
      startListening: mockStartListening,
      stopListening: mockStopListening,
      updateCallbacks: mockUpdateCallbacks,
    }));

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
  });

  afterEach(() => {
    cleanup();
  });

  describe('hook lifecycle', () => {
    it('should create AuthListener and start listening on mount', () => {
      // When hook is rendered
      renderHook(() => useAuthListener(mockCallbacks));

      // Then AuthListener should be created with callbacks
      expect(MockAuthListenerLocal).toHaveBeenCalledWith(mockCallbacks);
      expect(mockStartListening).toHaveBeenCalled();
    });

    it('should stop listening and cleanup on unmount', () => {
      // Given hook is rendered
      const { unmount } = renderHook(() => useAuthListener(mockCallbacks));

      // When hook is unmounted
      unmount();

      // Then should stop listening
      expect(mockStopListening).toHaveBeenCalled();
    });
  });

  describe('callback updates', () => {
    it('should update callbacks when they change', () => {
      // Given hook is rendered
      const { rerender } = renderHook(
        ({ callbacks }) => useAuthListener(callbacks),
        { initialProps: { callbacks: mockCallbacks } }
      );

      // When callbacks change (with different object reference)
      const newCallbacks = {
        onUserSignedIn: vi.fn(),
        onAuthStateChanged: vi.fn(),
      };

      // Clear previous calls before rerender
      mockUpdateCallbacks.mockClear();

      rerender({ callbacks: newCallbacks });

      // Then callbacks should be updated via updateCallbacks, not by creating a new listener
      expect(mockUpdateCallbacks).toHaveBeenCalledWith(newCallbacks);
    });

    it('should update callbacks without recreating listener', () => {
      // Given hook is rendered
      const { rerender } = renderHook(
        ({ callbacks }) => useAuthListener(callbacks),
        { initialProps: { callbacks: mockCallbacks } }
      );

      // Reset the mock to count new calls
      MockAuthListenerLocal.mockClear();
      mockStopListening.mockClear();
      mockUpdateCallbacks.mockClear();

      // When callbacks change
      const newCallbacks = {
        onUserSignedIn: vi.fn(),
      };
      rerender({ callbacks: newCallbacks });

      // Then callbacks should be updated without stopping/recreating listener
      expect(mockStopListening).not.toHaveBeenCalled();
      expect(MockAuthListenerLocal).not.toHaveBeenCalled(); // No new listener created
      expect(mockUpdateCallbacks).toHaveBeenCalledWith(newCallbacks);
    });
  });

  describe('partial callbacks', () => {
    it('should work with partial callbacks', () => {
      // Given partial callbacks
      const partialCallbacks = {
        onUserSignedIn: vi.fn(),
      };

      // When hook is rendered with partial callbacks
      renderHook(() => useAuthListener(partialCallbacks));

      // Then should work without error
      expect(MockAuthListenerLocal).toHaveBeenCalledWith(partialCallbacks);
      expect(mockStartListening).toHaveBeenCalled();
    });

    it('should work with empty callbacks', () => {
      // Given empty callbacks
      const emptyCallbacks = {};

      // When hook is rendered with empty callbacks
      renderHook(() => useAuthListener(emptyCallbacks));

      // Then should work without error
      expect(MockAuthListenerLocal).toHaveBeenCalledWith(emptyCallbacks);
      expect(mockStartListening).toHaveBeenCalled();
    });
  });

  describe('multiple hook instances', () => {
    it('should create separate listeners for multiple hook instances', () => {
      // When multiple hook instances are rendered
      renderHook(() => useAuthListener({ onUserSignedIn: vi.fn() }));
      renderHook(() => useAuthListener({ onUserSignedOut: vi.fn() }));

      // Then separate listeners should be created
      expect(MockAuthListenerLocal).toHaveBeenCalledTimes(2);
      expect(mockStartListening).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle listener creation without throwing', () => {
      // When hook is rendered with valid callbacks
      expect(() => {
        renderHook(() => useAuthListener(mockCallbacks));
      }).not.toThrow();

      // Then listener should be created
      expect(MockAuthListenerLocal).toHaveBeenCalledWith(mockCallbacks);
      expect(mockStartListening).toHaveBeenCalled();
    });
  });
});