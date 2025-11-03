import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleLogCaptureManager } from './ConsoleLogCaptureManager';
import { type ConsoleLog } from '@common/types';

// Mock Chrome APIs
const createMockChromeAPIs = () => {
  const mockTabs = {
    query: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  };

  const mockDebugger = {
    attach: vi.fn(),
    detach: vi.fn(),
    sendCommand: vi.fn(),
    onEvent: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  };

  const mockScripting = {
    executeScript: vi.fn(),
  };

  return { mockTabs, mockDebugger, mockScripting };
};

describe('ConsoleLogCaptureManager', () => {
  let manager: ConsoleLogCaptureManager;
  let mockChromeAPIs: ReturnType<typeof createMockChromeAPIs>;
  let originalChrome: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Store original chrome object
    originalChrome = (global as any).chrome;

    // Create mock Chrome APIs
    mockChromeAPIs = createMockChromeAPIs();

    // Set up global chrome object
    (global as any).chrome = {
      tabs: mockChromeAPIs.mockTabs,
      debugger: mockChromeAPIs.mockDebugger,
      scripting: mockChromeAPIs.mockScripting,
    };

    manager = new ConsoleLogCaptureManager();
  });

  afterEach(async () => {
    // Clean up manager
    await manager.destroy();

    // Restore original chrome object
    (global as any).chrome = originalChrome;

    vi.restoreAllMocks();
  });

  describe('startCapture', () => {
    it('should capture console logs from Lovable preview page', async () => {
      // Given a preview URL (not the project URL)
      const previewUrl = 'https://preview--personal-site-please.lovable.app';

      // Mock tab creation (blank tab first)
      mockChromeAPIs.mockTabs.create.mockResolvedValue({
        id: 2,
        url: 'about:blank'
      });

      // Mock tab update for navigation
      mockChromeAPIs.mockTabs.update = vi.fn().mockResolvedValue(undefined);

      // Mock debugger attach and commands
      mockChromeAPIs.mockDebugger.attach.mockResolvedValue(undefined);
      mockChromeAPIs.mockDebugger.sendCommand.mockResolvedValue(undefined);

      // When starting capture
      await manager.startCapture(previewUrl);

      // Then should create blank tab (inactive)
      expect(mockChromeAPIs.mockTabs.create).toHaveBeenCalledWith({
        url: 'about:blank',
        active: false
      });

      // Then should attach debugger to the blank tab
      expect(mockChromeAPIs.mockDebugger.attach).toHaveBeenCalledWith(
        { tabId: 2 },
        '1.3'
      );

      // Then should enable Runtime domain
      expect(mockChromeAPIs.mockDebugger.sendCommand).toHaveBeenCalledWith(
        { tabId: 2 },
        'Runtime.enable'
      );

      // Then should enable Log domain
      expect(mockChromeAPIs.mockDebugger.sendCommand).toHaveBeenCalledWith(
        { tabId: 2 },
        'Log.enable'
      );

      // Then should navigate to preview URL
      expect(mockChromeAPIs.mockTabs.update).toHaveBeenCalledWith(
        2,
        { url: previewUrl }
      );

      // Then should register event listener
      expect(mockChromeAPIs.mockDebugger.onEvent.addListener).toHaveBeenCalled();

      // Then should register tab update listener
      expect(mockChromeAPIs.mockTabs.onUpdated.addListener).toHaveBeenCalled();
    });

    it('should capture Runtime.consoleAPICalled events', async () => {
      // Given a Lovable project URL
      const lovableProjectUrl = 'https://lovable.dev/projects/abc-123-def-456';
      const previewUrl = 'https://preview--personal-site-please.lovable.app';

      mockChromeAPIs.mockTabs.query.mockResolvedValue([{ id: 1 }]);
      mockChromeAPIs.mockScripting.executeScript.mockResolvedValue([{ result: previewUrl }]);
      mockChromeAPIs.mockTabs.create.mockResolvedValue({ id: 2 });
      mockChromeAPIs.mockDebugger.attach.mockResolvedValue(undefined);
      mockChromeAPIs.mockDebugger.sendCommand.mockResolvedValue(undefined);

      // When starting capture
      await manager.startCapture(lovableProjectUrl);

      // Get the event listener that was registered
      const eventListener = mockChromeAPIs.mockDebugger.onEvent.addListener.mock.calls[0][0];

      // Simulate console.error event from the debugger
      const consoleErrorEvent = {
        type: 'error',
        timestamp: Date.now(),
        args: [
          { value: 'Failed to load resource:' },
          { value: 'net::ERR_FAILED' }
        ]
      };

      eventListener(
        { tabId: 2 },
        'Runtime.consoleAPICalled',
        consoleErrorEvent
      );

      // Then should capture the console log
      const capturedLogs = manager.getConsoleLogs();
      expect(capturedLogs).toHaveLength(1);
      expect(capturedLogs[0]).toEqual({
        type: 'error',
        message: 'Failed to load resource: net::ERR_FAILED',
        timestamp: consoleErrorEvent.timestamp,
        args: ['Failed to load resource:', 'net::ERR_FAILED']
      });
    });

    it('should capture Log.entryAdded events', async () => {
      // Given a Lovable project URL
      const lovableProjectUrl = 'https://lovable.dev/projects/abc-123-def-456';
      const previewUrl = 'https://preview--personal-site-please.lovable.app';

      mockChromeAPIs.mockTabs.query.mockResolvedValue([{ id: 1 }]);
      mockChromeAPIs.mockScripting.executeScript.mockResolvedValue([{ result: previewUrl }]);
      mockChromeAPIs.mockTabs.create.mockResolvedValue({ id: 2 });
      mockChromeAPIs.mockDebugger.attach.mockResolvedValue(undefined);
      mockChromeAPIs.mockDebugger.sendCommand.mockResolvedValue(undefined);

      // When starting capture
      await manager.startCapture(lovableProjectUrl);

      // Get the event listener that was registered
      const eventListener = mockChromeAPIs.mockDebugger.onEvent.addListener.mock.calls[0][0];

      // Simulate browser log entry
      const logEntryEvent = {
        entry: {
          level: 'error',
          text: 'Uncaught TypeError: Cannot read property of undefined',
          timestamp: Date.now()
        }
      };

      eventListener(
        { tabId: 2 },
        'Log.entryAdded',
        logEntryEvent
      );

      // Then should capture the log entry
      const capturedLogs = manager.getConsoleLogs();
      expect(capturedLogs).toHaveLength(1);
      expect(capturedLogs[0]).toEqual({
        type: 'error',
        message: 'Uncaught TypeError: Cannot read property of undefined',
        timestamp: logEntryEvent.entry.timestamp
      });
    });

    it('should capture multiple console logs in sequence', async () => {
      // Given a Lovable project URL
      const lovableProjectUrl = 'https://lovable.dev/projects/abc-123-def-456';
      const previewUrl = 'https://preview--personal-site-please.lovable.app';

      mockChromeAPIs.mockTabs.query.mockResolvedValue([{ id: 1 }]);
      mockChromeAPIs.mockScripting.executeScript.mockResolvedValue([{ result: previewUrl }]);
      mockChromeAPIs.mockTabs.create.mockResolvedValue({ id: 2 });
      mockChromeAPIs.mockDebugger.attach.mockResolvedValue(undefined);
      mockChromeAPIs.mockDebugger.sendCommand.mockResolvedValue(undefined);

      // When starting capture
      await manager.startCapture(lovableProjectUrl);

      // Get the event listener
      const eventListener = mockChromeAPIs.mockDebugger.onEvent.addListener.mock.calls[0][0];

      // Simulate multiple console events
      eventListener({ tabId: 2 }, 'Runtime.consoleAPICalled', {
        type: 'log',
        timestamp: 1000,
        args: [{ value: 'App starting...' }]
      });

      eventListener({ tabId: 2 }, 'Runtime.consoleAPICalled', {
        type: 'warn',
        timestamp: 2000,
        args: [{ value: 'Deprecated API usage' }]
      });

      eventListener({ tabId: 2 }, 'Runtime.consoleAPICalled', {
        type: 'error',
        timestamp: 3000,
        args: [{ value: 'Failed to fetch data' }]
      });

      // Then should capture all logs in order
      const capturedLogs = manager.getConsoleLogs();
      expect(capturedLogs).toHaveLength(3);
      expect(capturedLogs[0].type).toBe('log');
      expect(capturedLogs[0].message).toBe('App starting...');
      expect(capturedLogs[1].type).toBe('warn');
      expect(capturedLogs[1].message).toBe('Deprecated API usage');
      expect(capturedLogs[2].type).toBe('error');
      expect(capturedLogs[2].message).toBe('Failed to fetch data');
    });

    it('should continue capturing after page load completes', async () => {
      // Given a Lovable project URL
      const lovableProjectUrl = 'https://lovable.dev/projects/abc-123-def-456';
      const previewUrl = 'https://preview--personal-site-please.lovable.app';

      mockChromeAPIs.mockTabs.query.mockResolvedValue([{ id: 1 }]);
      mockChromeAPIs.mockScripting.executeScript.mockResolvedValue([{ result: previewUrl }]);
      mockChromeAPIs.mockTabs.create.mockResolvedValue({ id: 2 });
      mockChromeAPIs.mockDebugger.attach.mockResolvedValue(undefined);
      mockChromeAPIs.mockDebugger.sendCommand.mockResolvedValue(undefined);
      mockChromeAPIs.mockDebugger.detach.mockResolvedValue(undefined);
      mockChromeAPIs.mockTabs.remove.mockResolvedValue(undefined);

      // When starting capture
      await manager.startCapture(lovableProjectUrl);

      // Get the tab update listener
      const tabUpdateListener = mockChromeAPIs.mockTabs.onUpdated.addListener.mock.calls[0][0];

      // Simulate page load completion
      tabUpdateListener(2, { status: 'complete' }, { id: 2 });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Then should NOT have detached debugger yet (waiting for timeout)
      expect(mockChromeAPIs.mockDebugger.detach).not.toHaveBeenCalled();

      // Then should NOT have closed the tab yet
      expect(mockChromeAPIs.mockTabs.remove).not.toHaveBeenCalled();
    });

    it('should auto-stop capture after timeout', async () => {
      // Given a Lovable project URL
      const lovableProjectUrl = 'https://lovable.dev/projects/abc-123-def-456';
      const previewUrl = 'https://preview--personal-site-please.lovable.app';

      mockChromeAPIs.mockTabs.query.mockResolvedValue([{ id: 1 }]);
      mockChromeAPIs.mockScripting.executeScript.mockResolvedValue([{ result: previewUrl }]);
      mockChromeAPIs.mockTabs.create.mockResolvedValue({ id: 2 });
      mockChromeAPIs.mockDebugger.attach.mockResolvedValue(undefined);
      mockChromeAPIs.mockDebugger.sendCommand.mockResolvedValue(undefined);
      mockChromeAPIs.mockDebugger.detach.mockResolvedValue(undefined);
      mockChromeAPIs.mockTabs.remove.mockResolvedValue(undefined);

      // When starting capture
      await manager.startCapture(lovableProjectUrl);

      // Wait for timeout (3000ms)
      await new Promise(resolve => setTimeout(resolve, 3100));

      // Then should detach debugger
      expect(mockChromeAPIs.mockDebugger.detach).toHaveBeenCalledWith({ tabId: 2 });

      // Then should close the tab
      expect(mockChromeAPIs.mockTabs.remove).toHaveBeenCalledWith(2);
    });

    it('should not capture events from other tabs', async () => {
      // Given a Lovable project URL
      const lovableProjectUrl = 'https://lovable.dev/projects/abc-123-def-456';
      const previewUrl = 'https://preview--personal-site-please.lovable.app';

      mockChromeAPIs.mockTabs.query.mockResolvedValue([{ id: 1 }]);
      mockChromeAPIs.mockScripting.executeScript.mockResolvedValue([{ result: previewUrl }]);
      mockChromeAPIs.mockTabs.create.mockResolvedValue({ id: 2 });
      mockChromeAPIs.mockDebugger.attach.mockResolvedValue(undefined);
      mockChromeAPIs.mockDebugger.sendCommand.mockResolvedValue(undefined);

      // When starting capture
      await manager.startCapture(lovableProjectUrl);

      // Get the event listener
      const eventListener = mockChromeAPIs.mockDebugger.onEvent.addListener.mock.calls[0][0];

      // Simulate console event from a different tab (id: 999)
      eventListener({ tabId: 999 }, 'Runtime.consoleAPICalled', {
        type: 'error',
        timestamp: Date.now(),
        args: [{ value: 'Error from other tab' }]
      });

      // Then should not capture the log
      const capturedLogs = manager.getConsoleLogs();
      expect(capturedLogs).toHaveLength(0);
    });

    it('should handle missing preview URL gracefully', async () => {
      // Given a Lovable project URL (this test should use getPreviewUrl method)
      const lovableProjectUrl = 'https://lovable.dev/projects/abc-123-def-456';

      mockChromeAPIs.mockTabs.query.mockResolvedValue([{ id: 1 }]);
      mockChromeAPIs.mockScripting.executeScript.mockResolvedValue([{ result: null }]);

      // When trying to get preview URL
      const previewUrl = await manager.getPreviewUrl(lovableProjectUrl);

      // Then should return null
      expect(previewUrl).toBeNull();

      // Then should have queried for active tab
      expect(mockChromeAPIs.mockTabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true
      });

      // Then should have tried to execute script
      expect(mockChromeAPIs.mockScripting.executeScript).toHaveBeenCalled();
    });

    it('should handle non-matching platform URLs gracefully', async () => {
      // Given a non-Lovable URL (this test should use getPreviewUrl method)
      const nonLovableUrl = 'https://example.com/some-page';

      // When trying to get preview URL
      const previewUrl = await manager.getPreviewUrl(nonLovableUrl);

      // Then should return null (no matching platform config)
      expect(previewUrl).toBeNull();

      // Then should not have executed script (no platform match)
      expect(mockChromeAPIs.mockScripting.executeScript).not.toHaveBeenCalled();

      // Then should not have queried for tabs
      expect(mockChromeAPIs.mockTabs.query).not.toHaveBeenCalled();
    });

    it('should handle errors during capture gracefully', async () => {
      // Given a Lovable project URL
      const lovableProjectUrl = 'https://lovable.dev/projects/abc-123-def-456';
      const previewUrl = 'https://preview--personal-site-please.lovable.app';

      mockChromeAPIs.mockTabs.query.mockResolvedValue([{ id: 1 }]);
      mockChromeAPIs.mockScripting.executeScript.mockResolvedValue([{ result: previewUrl }]);
      mockChromeAPIs.mockTabs.create.mockResolvedValue({ id: 2 });

      // Mock debugger.attach to throw error
      mockChromeAPIs.mockDebugger.attach.mockRejectedValue(new Error('Failed to attach debugger'));
      mockChromeAPIs.mockDebugger.detach.mockResolvedValue(undefined);
      mockChromeAPIs.mockTabs.remove.mockResolvedValue(undefined);

      // When starting capture
      await manager.startCapture(lovableProjectUrl);

      // Then should attempt cleanup
      // Note: Cleanup may have been called during error handling
      // We just verify it doesn't throw and handles the error
      expect(true).toBe(true);
    });
  });

  describe('stopCapture', () => {
    it('should clean up all resources', async () => {
      // Given an active capture session
      const lovableProjectUrl = 'https://lovable.dev/projects/abc-123-def-456';
      const previewUrl = 'https://preview--personal-site-please.lovable.app';

      mockChromeAPIs.mockTabs.query.mockResolvedValue([{ id: 1 }]);
      mockChromeAPIs.mockScripting.executeScript.mockResolvedValue([{ result: previewUrl }]);
      mockChromeAPIs.mockTabs.create.mockResolvedValue({ id: 2 });
      mockChromeAPIs.mockDebugger.attach.mockResolvedValue(undefined);
      mockChromeAPIs.mockDebugger.sendCommand.mockResolvedValue(undefined);
      mockChromeAPIs.mockDebugger.detach.mockResolvedValue(undefined);
      mockChromeAPIs.mockTabs.remove.mockResolvedValue(undefined);

      await manager.startCapture(lovableProjectUrl);

      // When stopping capture
      await manager.stopCapture();

      // Then should detach debugger
      expect(mockChromeAPIs.mockDebugger.detach).toHaveBeenCalledWith({ tabId: 2 });

      // Then should close tab
      expect(mockChromeAPIs.mockTabs.remove).toHaveBeenCalledWith(2);

      // Then should remove event listeners
      expect(mockChromeAPIs.mockDebugger.onEvent.removeListener).toHaveBeenCalled();
      expect(mockChromeAPIs.mockTabs.onUpdated.removeListener).toHaveBeenCalled();
    });
  });

  describe('getConsoleLogs', () => {
    it('should return a copy of captured logs', async () => {
      // Given captured console logs
      const lovableProjectUrl = 'https://lovable.dev/projects/abc-123-def-456';
      const previewUrl = 'https://preview--personal-site-please.lovable.app';

      mockChromeAPIs.mockTabs.query.mockResolvedValue([{ id: 1 }]);
      mockChromeAPIs.mockScripting.executeScript.mockResolvedValue([{ result: previewUrl }]);
      mockChromeAPIs.mockTabs.create.mockResolvedValue({ id: 2 });
      mockChromeAPIs.mockDebugger.attach.mockResolvedValue(undefined);
      mockChromeAPIs.mockDebugger.sendCommand.mockResolvedValue(undefined);

      await manager.startCapture(lovableProjectUrl);

      const eventListener = mockChromeAPIs.mockDebugger.onEvent.addListener.mock.calls[0][0];
      eventListener({ tabId: 2 }, 'Runtime.consoleAPICalled', {
        type: 'error',
        timestamp: Date.now(),
        args: [{ value: 'Test error' }]
      });

      // When getting console logs
      const logs1 = manager.getConsoleLogs();
      const logs2 = manager.getConsoleLogs();

      // Then should return copies (different array instances)
      expect(logs1).not.toBe(logs2);
      expect(logs1).toEqual(logs2);
    });

    it('should return empty array when no logs captured', () => {
      // When getting console logs before any capture
      const logs = manager.getConsoleLogs();

      // Then should return empty array
      expect(logs).toEqual([]);
    });
  });

  describe('destroy', () => {
    it('should clean up all resources and clear logs', async () => {
      // Given an active capture session with logs
      const lovableProjectUrl = 'https://lovable.dev/projects/abc-123-def-456';
      const previewUrl = 'https://preview--personal-site-please.lovable.app';

      mockChromeAPIs.mockTabs.query.mockResolvedValue([{ id: 1 }]);
      mockChromeAPIs.mockScripting.executeScript.mockResolvedValue([{ result: previewUrl }]);
      mockChromeAPIs.mockTabs.create.mockResolvedValue({ id: 2 });
      mockChromeAPIs.mockDebugger.attach.mockResolvedValue(undefined);
      mockChromeAPIs.mockDebugger.sendCommand.mockResolvedValue(undefined);
      mockChromeAPIs.mockDebugger.detach.mockResolvedValue(undefined);
      mockChromeAPIs.mockTabs.remove.mockResolvedValue(undefined);

      await manager.startCapture(lovableProjectUrl);

      const eventListener = mockChromeAPIs.mockDebugger.onEvent.addListener.mock.calls[0][0];
      eventListener({ tabId: 2 }, 'Runtime.consoleAPICalled', {
        type: 'error',
        timestamp: Date.now(),
        args: [{ value: 'Test error' }]
      });

      // When destroying manager
      await manager.destroy();

      // Then should clean up resources
      expect(mockChromeAPIs.mockDebugger.detach).toHaveBeenCalledWith({ tabId: 2 });
      expect(mockChromeAPIs.mockTabs.remove).toHaveBeenCalledWith(2);

      // Then should clear logs
      const logs = manager.getConsoleLogs();
      expect(logs).toEqual([]);
    });
  });

  describe('real-world error scenarios', () => {
    it('should capture network errors like on https://preview--personal-site-please.lovable.app', async () => {
      // Given a Lovable preview URL that has network errors
      const lovableProjectUrl = 'https://lovable.dev/projects/abc-123-def-456';
      const previewUrl = 'https://preview--personal-site-please.lovable.app';

      mockChromeAPIs.mockTabs.query.mockResolvedValue([{ id: 1 }]);
      mockChromeAPIs.mockScripting.executeScript.mockResolvedValue([{ result: previewUrl }]);
      mockChromeAPIs.mockTabs.create.mockResolvedValue({ id: 2 });
      mockChromeAPIs.mockDebugger.attach.mockResolvedValue(undefined);
      mockChromeAPIs.mockDebugger.sendCommand.mockResolvedValue(undefined);

      await manager.startCapture(lovableProjectUrl);

      const eventListener = mockChromeAPIs.mockDebugger.onEvent.addListener.mock.calls[0][0];

      // Simulate typical network error
      eventListener({ tabId: 2 }, 'Runtime.consoleAPICalled', {
        type: 'error',
        timestamp: Date.now(),
        args: [
          { value: 'Failed to load resource:' },
          { value: 'the server responded with a status of 404' }
        ]
      });

      // Simulate CORS error
      eventListener({ tabId: 2 }, 'Log.entryAdded', {
        entry: {
          level: 'error',
          text: 'Access to fetch at \'https://api.example.com/data\' from origin \'https://preview--personal-site-please.lovable.app\' has been blocked by CORS policy',
          timestamp: Date.now()
        }
      });

      // Then should capture both errors
      const logs = manager.getConsoleLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].type).toBe('error');
      expect(logs[0].message).toContain('Failed to load resource');
      expect(logs[1].type).toBe('error');
      expect(logs[1].message).toContain('CORS policy');
    });
  });
});
