import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useWebRTCListener } from './useWebRTCListener';
import { WebRTCListener } from '@common/features/WebRTCManager/events';
import type { WebRTCListenerCallbacks } from '@common/features/WebRTCManager/events';

// Mock WebRTCListener
vi.mock('@common/features/WebRTCManager/events', () => ({
  WebRTCListener: vi.fn().mockImplementation(() => ({
    startListening: vi.fn(),
    stopListening: vi.fn(),
    updateCallbacks: vi.fn(),
  })),
}));

const MockWebRTCListener = vi.mocked(WebRTCListener);

describe('useWebRTCListener', () => {
  let mockListener: any;
  let mockCallbacks: Partial<WebRTCListenerCallbacks>;

  beforeEach(() => {
    vi.clearAllMocks();
    MockWebRTCListener.mockClear();

    mockListener = {
      startListening: vi.fn(),
      stopListening: vi.fn(),
      updateCallbacks: vi.fn(),
    };
    MockWebRTCListener.mockImplementation(() => mockListener);

    mockCallbacks = {
      onWebRTCStateChanged: vi.fn(),
      onWebRTCError: vi.fn(),
      onWebRTCRemoteStream: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  describe('initial setup', () => {
    it('should create WebRTCListener and start listening on first render', () => {
      // when hook is rendered
      renderHook(() => useWebRTCListener(mockCallbacks));

      // then should create listener with callbacks
      expect(MockWebRTCListener).toHaveBeenCalledWith(mockCallbacks);
      expect(mockListener.startListening).toHaveBeenCalled();
      expect(mockListener.updateCallbacks).not.toHaveBeenCalled();
    });

    it('should handle empty callbacks', () => {
      // given empty callbacks
      const emptyCallbacks = {};

      // when hook is rendered
      renderHook(() => useWebRTCListener(emptyCallbacks));

      // then should create listener with empty callbacks
      expect(MockWebRTCListener).toHaveBeenCalledWith(emptyCallbacks);
      expect(mockListener.startListening).toHaveBeenCalled();
    });
  });

  describe('callback updates', () => {
    it('should update callbacks on re-render without recreating listener', () => {
      // given initial callbacks
      const { rerender } = renderHook(
        ({ callbacks }) => useWebRTCListener(callbacks),
        { initialProps: { callbacks: mockCallbacks } }
      );

      // when callbacks change
      const newCallbacks = {
        onWebRTCStateChanged: vi.fn(),
        onWebRTCIceCandidate: vi.fn(),
      };
      rerender({ callbacks: newCallbacks });

      // then should update callbacks but not create new listener
      expect(MockWebRTCListener).toHaveBeenCalledTimes(1); // Only created once
      expect(mockListener.updateCallbacks).toHaveBeenCalledWith(newCallbacks);
      expect(mockListener.startListening).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should handle multiple callback updates', () => {
      // given initial callbacks
      const { rerender } = renderHook(
        ({ callbacks }) => useWebRTCListener(callbacks),
        { initialProps: { callbacks: mockCallbacks } }
      );

      // when callbacks change multiple times
      const newCallbacks1 = { onWebRTCError: vi.fn() };
      const newCallbacks2 = { onWebRTCRemoteStream: vi.fn() };

      rerender({ callbacks: newCallbacks1 });
      rerender({ callbacks: newCallbacks2 });

      // then should update callbacks each time
      expect(mockListener.updateCallbacks).toHaveBeenCalledTimes(2);
      expect(mockListener.updateCallbacks).toHaveBeenNthCalledWith(1, newCallbacks1);
      expect(mockListener.updateCallbacks).toHaveBeenNthCalledWith(2, newCallbacks2);
    });
  });

  describe('cleanup', () => {
    it('should stop listening and cleanup on unmount', () => {
      // given hook is rendered
      const { unmount } = renderHook(() => useWebRTCListener(mockCallbacks));

      // when hook is unmounted
      unmount();

      // then should stop listening and cleanup
      expect(mockListener.stopListening).toHaveBeenCalled();
    });

    it('should handle cleanup when listener is null', () => {
      // given listener creation returns null (unusual but possible)
      MockWebRTCListener.mockImplementation(() => null as any);

      // when hook is rendered and unmounted
      const { unmount } = renderHook(() => useWebRTCListener(mockCallbacks));

      // then should not error on cleanup
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle listener creation failure gracefully', () => {
      // given listener creation throws error
      MockWebRTCListener.mockImplementation(() => {
        throw new Error('Listener creation failed');
      });

      // when hook is rendered
      // then should throw error (expected behavior)
      expect(() => {
        renderHook(() => useWebRTCListener(mockCallbacks));
      }).toThrow('Listener creation failed');
    });

    it('should handle startListening error gracefully', () => {
      // given startListening throws error
      mockListener.startListening.mockImplementation(() => {
        throw new Error('Start listening failed');
      });

      // when hook is rendered
      // then should throw error (expected behavior)
      expect(() => {
        renderHook(() => useWebRTCListener(mockCallbacks));
      }).toThrow('Start listening failed');
    });

    it('should handle updateCallbacks error gracefully', () => {
      // given updateCallbacks throws error
      mockListener.updateCallbacks.mockImplementation(() => {
        throw new Error('Update callbacks failed');
      });

      // given initial render succeeds
      const { rerender } = renderHook(
        ({ callbacks }) => useWebRTCListener(callbacks),
        { initialProps: { callbacks: mockCallbacks } }
      );

      // when callbacks are updated and error occurs
      const newCallbacks = { onWebRTCError: vi.fn() };

      // then should not crash (error is handled internally)
      expect(() => {
        rerender({ callbacks: newCallbacks });
      }).not.toThrow();
    });

    it('should handle stopListening error gracefully', () => {
      // given stopListening throws error
      mockListener.stopListening.mockImplementation(() => {
        throw new Error('Stop listening failed');
      });

      // given hook is rendered
      const { unmount } = renderHook(() => useWebRTCListener(mockCallbacks));

      // when hook is unmounted
      // then should not throw error during cleanup
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('dependency tracking', () => {
    it('should react to callback reference changes', () => {
      // given initial callbacks
      const initialCallbacks = { onWebRTCStateChanged: vi.fn() };
      const { rerender } = renderHook(
        ({ callbacks }) => useWebRTCListener(callbacks),
        { initialProps: { callbacks: initialCallbacks } }
      );

      // when callback reference changes (new function with same signature)
      const newCallbacks = { onWebRTCStateChanged: vi.fn() };
      rerender({ callbacks: newCallbacks });

      // then should update callbacks
      expect(mockListener.updateCallbacks).toHaveBeenCalledWith(newCallbacks);
    });

    it('should handle callback property changes', () => {
      // given initial callbacks
      const initialCallbacks = { onWebRTCStateChanged: vi.fn() };
      const { rerender } = renderHook(
        ({ callbacks }) => useWebRTCListener(callbacks),
        { initialProps: { callbacks: initialCallbacks } }
      );

      // when callback properties change
      const updatedCallbacks = {
        ...initialCallbacks,
        onWebRTCError: vi.fn()
      };
      rerender({ callbacks: updatedCallbacks });

      // then should update callbacks
      expect(mockListener.updateCallbacks).toHaveBeenCalledWith(updatedCallbacks);
    });
  });
});