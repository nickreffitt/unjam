/**
 * Console capture script that gets injected into the host page
 * This script runs in the page's context (not isolated) to intercept console calls
 */

import { type ConsoleLog } from '@common/types';

export interface ConsoleCapture {
  startCapture(): void;
  stopCapture(): string; // Returns JSON string of captured logs
  getLogs(): ConsoleLog[];
  clearLogs(): void;
}

// This will be injected as a string into the page context
export const consoleCaptureScript = `
(function() {
  const capturedLogs = [];
  let isCapturing = false;
  const originalConsole = {};

  // Store original console methods
  ['log', 'info', 'warn', 'error', 'debug'].forEach(level => {
    originalConsole[level] = console[level].bind(console);
  });

  // Override console methods
  ['log', 'info', 'warn', 'error', 'debug'].forEach(level => {
    console[level] = function(...args) {
      // Call original method first
      originalConsole[level](...args);

      // Capture if enabled
      if (isCapturing) {
        try {
          const message = args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
              try {
                return JSON.stringify(arg, null, 2);
              } catch (e) {
                return String(arg);
              }
            }
            return String(arg);
          }).join(' ');

          capturedLogs.push({
            level: level,
            message: message,
            timestamp: Date.now(),
            args: args.map(arg => {
              try {
                // Test if serializable
                JSON.stringify(arg);
                return arg;
              } catch {
                return String(arg);
              }
            })
          });
        } catch (error) {
          originalConsole.error('Console capture failed:', error);
        }
      }
    };
  });

  // Expose API to content script
  window.__unjamConsoleCapture = {
    startCapture: () => {
      isCapturing = true;
      capturedLogs.length = 0; // Clear previous logs
    },
    stopCapture: () => {
      isCapturing = false;
      return JSON.stringify(capturedLogs);
    },
    getLogs: () => {
      return capturedLogs;
    },
    clearLogs: () => {
      capturedLogs.length = 0;
    }
  };

  console.log('[Unjam] Console capture initialized');
})();
`;

/**
 * Interface to communicate with the injected console capture script
 */
export class ConsoleCaptureManager {
  private isInjected: boolean = false;

  /**
   * Injects the console capture script into the page
   */
  async inject(): Promise<void> {
    if (this.isInjected) {
      console.debug('[ConsoleCaptureManager] Already injected');
      return;
    }

    // Create a script element and inject it into the page context
    const script = document.createElement('script');
    script.textContent = consoleCaptureScript;
    (document.head || document.documentElement).appendChild(script);
    script.remove();

    this.isInjected = true;
    console.debug('[ConsoleCaptureManager] Console capture script injected');

    // Wait a bit for the script to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Starts capturing console logs
   */
  startCapture(): void {
    if (!this.isInjected) {
      console.warn('[ConsoleCaptureManager] Not injected yet, injecting now...');
      this.inject();
    }

    const captureApi = (window as any).__unjamConsoleCapture;
    if (captureApi) {
      captureApi.startCapture();
      console.debug('[ConsoleCaptureManager] Started capturing');
    } else {
      console.error('[ConsoleCaptureManager] Capture API not available');
    }
  }

  /**
   * Stops capturing and returns the captured logs
   */
  stopCapture(): ConsoleLog[] {
    const captureApi = (window as any).__unjamConsoleCapture;
    if (captureApi) {
      const logsJson = captureApi.stopCapture();
      console.debug('[ConsoleCaptureManager] Stopped capturing');
      try {
        return JSON.parse(logsJson);
      } catch (error) {
        console.error('[ConsoleCaptureManager] Failed to parse logs:', error);
        return [];
      }
    } else {
      console.error('[ConsoleCaptureManager] Capture API not available');
      return [];
    }
  }

  /**
   * Gets currently captured logs without stopping capture
   */
  getLogs(): ConsoleLog[] {
    const captureApi = (window as any).__unjamConsoleCapture;
    if (captureApi) {
      return captureApi.getLogs();
    }
    return [];
  }

  /**
   * Clears all captured logs
   */
  clearLogs(): void {
    const captureApi = (window as any).__unjamConsoleCapture;
    if (captureApi) {
      captureApi.clearLogs();
    }
  }
}

// Export a singleton instance
export const consoleCaptureManager = new ConsoleCaptureManager();
