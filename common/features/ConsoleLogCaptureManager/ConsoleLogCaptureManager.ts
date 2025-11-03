import { type ConsoleLog } from '@common/types';

/**
 * Platform-specific configuration for extracting preview URLs
 */
interface PlatformConfig {
  urlPattern: RegExp;
  previewUrlSelector: string;
}

/**
 * Manages capturing console logs from preview pages using Chrome Debugger API
 * Opens preview URLs in new tabs, captures logs during page load, and cleans up
 */
export class ConsoleLogCaptureManager {
  private capturedLogs: ConsoleLog[] = [];
  private activeTabId: number | null = null;
  private debuggerAttached: boolean = false;
  private eventListener: ((source: chrome.debugger.Debuggee, method: string, params?: any) => void) | null = null;
  private captureTimeoutId: NodeJS.Timeout | null = null;
  private tabUpdateListener: ((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void) | null = null;

  private platformConfigs: PlatformConfig[] = [
    {
      urlPattern: /^https:\/\/lovable\.dev\/projects\/[a-f0-9-]+$/,
      previewUrlSelector: '#preview-url-bar > div > div.flex.items-center > a'
    }
    // Future: Add Replit, Base44, Bolt, v0 configurations
  ];

  // Maximum time to wait for page load before auto-stopping (in milliseconds)
  private readonly CAPTURE_TIMEOUT_MS = 3000;

  constructor() {
    console.debug('ConsoleLogCaptureManager: Initialized');
  }

  /**
   * Extracts the preview URL from the current page based on platform-specific selectors
   * @param currentUrl - The URL of the page where the user is working
   * @returns The preview URL to capture logs from, or null if not found
   */
  async getPreviewUrl(currentUrl: string): Promise<string | null> {
    console.debug('ConsoleLogCaptureManager: [getPreviewUrl] Checking URL:', currentUrl);

    // Find matching platform configuration
    const config = this.platformConfigs.find(cfg => cfg.urlPattern.test(currentUrl));
    if (!config) {
      console.warn('ConsoleLogCaptureManager: [getPreviewUrl] No platform configuration found for URL:', currentUrl);
      console.debug('ConsoleLogCaptureManager: [getPreviewUrl] Available patterns:', this.platformConfigs.map(c => c.urlPattern.toString()));
      return null;
    }

    console.debug('ConsoleLogCaptureManager: [getPreviewUrl] Matched platform config:', config.urlPattern.toString());

    // Query the current tab to find the preview URL element
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    console.debug('ConsoleLogCaptureManager: [getPreviewUrl] Found tabs:', tabs.length);

    if (tabs.length === 0 || !tabs[0].id) {
      console.error('ConsoleLogCaptureManager: [getPreviewUrl] No active tab found or tab has no ID');
      return null;
    }

    const tabId = tabs[0].id;
    console.debug('ConsoleLogCaptureManager: [getPreviewUrl] Active tab ID:', tabId, 'URL:', tabs[0].url);

    try {
      console.debug('ConsoleLogCaptureManager: [getPreviewUrl] Executing script with selector:', config.previewUrlSelector);

      // Execute script to extract preview URL from DOM
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: (selector: string) => {
          const element = document.querySelector(selector) as HTMLAnchorElement | null;
          console.log('Preview URL extraction - selector:', selector);
          console.log('Preview URL extraction - element found:', !!element);
          if (element) {
            console.log('Preview URL extraction - href:', element.href);
          }
          return element?.href || null;
        },
        args: [config.previewUrlSelector]
      });

      console.debug('ConsoleLogCaptureManager: [getPreviewUrl] Script execution results:', results);

      if (results && results[0]?.result) {
        console.debug('ConsoleLogCaptureManager: [getPreviewUrl] Successfully extracted preview URL:', results[0].result);
        return results[0].result as string;
      }

      console.warn('ConsoleLogCaptureManager: [getPreviewUrl] Preview URL element not found with selector:', config.previewUrlSelector);
      console.debug('ConsoleLogCaptureManager: [getPreviewUrl] Script results were:', JSON.stringify(results, null, 2));
      return null;
    } catch (error) {
      console.error('ConsoleLogCaptureManager: [getPreviewUrl] Error extracting preview URL:', error);
      if (error instanceof Error) {
        console.error('ConsoleLogCaptureManager: [getPreviewUrl] Error details:', error.message, error.stack);
      }
      return null;
    }
  }

  /**
   * Starts capturing console logs from the preview page
   * Creates a blank tab, attaches debugger, then navigates to preview URL
   * Automatically stops after DOM is fully loaded or after timeout
   * @param previewUrl - The preview URL to capture logs from
   */
  async startCapture(previewUrl: string): Promise<void> {
    console.debug('ConsoleLogCaptureManager: [startCapture] Starting capture for preview URL:', previewUrl);

    // Reset state
    this.capturedLogs = [];
    console.debug('ConsoleLogCaptureManager: [startCapture] Cleared previous logs');

    try {
      // STEP 1: Create a blank tab first (inactive to not disrupt user)
      console.debug('ConsoleLogCaptureManager: [startCapture] Creating blank tab');
      const tab = await chrome.tabs.create({ url: 'about:blank', active: false });

      if (!tab.id) {
        console.error('ConsoleLogCaptureManager: [startCapture] Failed to create tab - tab.id is undefined');
        console.debug('ConsoleLogCaptureManager: [startCapture] Tab object:', tab);
        return;
      }

      this.activeTabId = tab.id;
      console.debug('ConsoleLogCaptureManager: [startCapture] Created blank tab with ID:', this.activeTabId);

      // STEP 2: Attach debugger to the blank tab BEFORE navigating
      console.debug('ConsoleLogCaptureManager: [startCapture] Attaching debugger to blank tab:', this.activeTabId);
      await chrome.debugger.attach({ tabId: this.activeTabId }, '1.3');
      this.debuggerAttached = true;
      console.debug('ConsoleLogCaptureManager: [startCapture] Debugger attached successfully');

      // STEP 3: Enable Runtime and Log domains to start capturing console logs
      // Runtime.enable is needed for Runtime.consoleAPICalled events (console.log, console.error, etc.)
      // Log.enable is needed for Log.entryAdded events (browser-level logs)
      console.debug('ConsoleLogCaptureManager: [startCapture] Enabling Runtime domain');
      await chrome.debugger.sendCommand({ tabId: this.activeTabId }, 'Runtime.enable');
      console.debug('ConsoleLogCaptureManager: [startCapture] Runtime domain enabled');

      console.debug('ConsoleLogCaptureManager: [startCapture] Enabling Log domain');
      await chrome.debugger.sendCommand({ tabId: this.activeTabId }, 'Log.enable');
      console.debug('ConsoleLogCaptureManager: [startCapture] Log domain enabled successfully');

      // STEP 4: Set up event listener for ALL debugger events
      let eventCount = 0;
      this.eventListener = (source: chrome.debugger.Debuggee, method: string, params?: any) => {
        eventCount++;
        console.debug(`ConsoleLogCaptureManager: [eventListener] Event #${eventCount}:`, method, 'from tab:', source.tabId, 'Expected tab:', this.activeTabId);

        if (source.tabId === this.activeTabId) {
          console.debug('ConsoleLogCaptureManager: [eventListener] ✓ Tab ID matches, processing event');
          this.handleDebuggerEvent(method, params);
        } else {
          console.debug('ConsoleLogCaptureManager: [eventListener] ✗ Tab ID mismatch, ignoring event');
        }
      };

      chrome.debugger.onEvent.addListener(this.eventListener);
      console.debug('ConsoleLogCaptureManager: [startCapture] Event listener registered successfully');

      // STEP 5: Set up tab update listener to detect when DOM is fully loaded
      this.setupPageLoadListener(this.activeTabId);

      // STEP 6: Set up timeout to auto-stop capture after 1 second
      this.setupCaptureTimeout();

      // STEP 7: NOW navigate to the preview URL (debugger is already attached and listening)
      console.debug('ConsoleLogCaptureManager: [startCapture] Navigating to preview URL:', previewUrl);
      await chrome.tabs.update(this.activeTabId, { url: previewUrl });
      console.debug('ConsoleLogCaptureManager: [startCapture] Navigation started, debugger is capturing logs...');

    } catch (error) {
      console.error('ConsoleLogCaptureManager: [startCapture] Error starting capture:', error);
      if (error instanceof Error) {
        console.error('ConsoleLogCaptureManager: [startCapture] Error details:', error.message, error.stack);
      }
      await this.cleanup();
    }
  }

  /**
   * Sets up a listener to detect when the page DOM is fully loaded
   * Automatically stops capture when 'complete' status is reached
   */
  private setupPageLoadListener(tabId: number): void {
    console.debug('ConsoleLogCaptureManager: [setupPageLoadListener] Setting up for tab:', tabId);

    this.tabUpdateListener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      console.debug('ConsoleLogCaptureManager: [tabUpdateListener] Tab update - ID:', updatedTabId, 'Status:', changeInfo.status, 'URL:', tab.url);

      // Only handle updates for our active tab
      if (updatedTabId !== tabId) {
        console.debug('ConsoleLogCaptureManager: [tabUpdateListener] Ignoring update for different tab');
        return;
      }

      console.debug('ConsoleLogCaptureManager: [tabUpdateListener] Update for our tab, status:', changeInfo.status);

      // When DOM content is fully loaded (document_end) - just log it, don't stop yet
      // We'll let the timeout handle stopping to catch errors that happen after page load
      if (changeInfo.status === 'complete') {
        console.debug('ConsoleLogCaptureManager: [tabUpdateListener] ✓ Page fully loaded, continuing capture until timeout...');
      }
    };

    chrome.tabs.onUpdated.addListener(this.tabUpdateListener);
    console.debug('ConsoleLogCaptureManager: [setupPageLoadListener] Tab update listener registered');
  }

  /**
   * Sets up a timeout to auto-stop capture if page doesn't load within timeout period
   */
  private setupCaptureTimeout(): void {
    const startTime = Date.now();
    console.debug(`ConsoleLogCaptureManager: [setupCaptureTimeout] Setting ${this.CAPTURE_TIMEOUT_MS}ms timeout at`, startTime);

    this.captureTimeoutId = setTimeout(() => {
      const elapsedTime = Date.now() - startTime;
      console.debug(`ConsoleLogCaptureManager: [setupCaptureTimeout] ⏰ Timeout reached after ${elapsedTime}ms, auto-stopping`);
      this.autoStopCapture('timeout');
    }, this.CAPTURE_TIMEOUT_MS);

    console.debug(`ConsoleLogCaptureManager: [setupCaptureTimeout] Timeout scheduled for ${this.CAPTURE_TIMEOUT_MS}ms from now`);
  }

  /**
   * Automatically stops capture and cleans up
   * Called by either page load listener or timeout
   */
  private async autoStopCapture(reason: 'page_loaded' | 'timeout'): Promise<void> {
    console.debug('ConsoleLogCaptureManager: [autoStopCapture] Auto-stopping capture, reason:', reason);
    console.debug(`ConsoleLogCaptureManager: [autoStopCapture] Captured ${this.capturedLogs.length} console logs`);

    if (this.capturedLogs.length > 0) {
      console.debug('ConsoleLogCaptureManager: [autoStopCapture] Log summary:');
      this.capturedLogs.forEach((log, index) => {
        console.debug(`  [${index + 1}] ${log.type}: ${log.message.substring(0, 100)}${log.message.length > 100 ? '...' : ''}`);
      });
    } else {
      console.warn('ConsoleLogCaptureManager: [autoStopCapture] No logs were captured during this session');
      console.debug('ConsoleLogCaptureManager: [autoStopCapture] Possible reasons:');
      console.debug('  1. The page loaded without any console errors or warnings');
      console.debug('  2. The debugger was not attached in time to capture early logs');
      console.debug('  3. The page uses a different console API or logging mechanism');
      console.debug('  4. The logs were filtered out or not in the expected format');
    }

    // Clean up everything (tab, debugger, listeners, timeout)
    await this.cleanup();
  }

  /**
   * Handles debugger events and extracts console logs
   */
  private handleDebuggerEvent(method: string, params: any): void {
    console.debug('ConsoleLogCaptureManager: [handleDebuggerEvent] Received event:', method);

    // Primary handler: Log.entryAdded captures ALL console messages including errors
    if (method === 'Log.entryAdded') {
      console.debug('ConsoleLogCaptureManager: [handleDebuggerEvent] Processing Log.entryAdded with params:', JSON.stringify(params, null, 2));

      // Extract browser logs
      const entry = params.entry;
      const log: ConsoleLog = {
        type: entry.level || 'log',
        message: entry.text || '',
        timestamp: entry.timestamp || Date.now()
      };
      this.capturedLogs.push(log);
      console.debug('ConsoleLogCaptureManager: [handleDebuggerEvent] ✓ Captured log entry:', log.type, log.message);
      console.debug('ConsoleLogCaptureManager: [handleDebuggerEvent] Total logs captured so far:', this.capturedLogs.length);
    } else if (method === 'Runtime.consoleAPICalled') {
      console.debug('ConsoleLogCaptureManager: [handleDebuggerEvent] Processing Runtime.consoleAPICalled with params:', JSON.stringify(params, null, 2));

      // Extract console.log, console.warn, console.error, etc.
      const log: ConsoleLog = {
        type: params.type || 'log',
        message: params.args?.map((arg: any) => arg.value ?? arg.description ?? '').join(' ') || '',
        timestamp: params.timestamp || Date.now(),
        args: params.args?.map((arg: any) => arg.value ?? arg.description)
      };
      this.capturedLogs.push(log);
      console.debug('ConsoleLogCaptureManager: [handleDebuggerEvent] ✓ Captured console message:', log.type, log.message);
      console.debug('ConsoleLogCaptureManager: [handleDebuggerEvent] Total logs captured so far:', this.capturedLogs.length);
    } else if (method === 'Runtime.exceptionThrown') {
      console.debug('ConsoleLogCaptureManager: [handleDebuggerEvent] Processing Runtime.exceptionThrown with params:', JSON.stringify(params, null, 2));

      // Extract uncaught exceptions (like ReferenceError, TypeError, etc.)
      const exceptionDetails = params.exceptionDetails;
      const exception = exceptionDetails?.exception;

      const log: ConsoleLog = {
        type: 'error',
        message: exception?.description || exceptionDetails?.text || 'Uncaught exception',
        timestamp: exceptionDetails?.timestamp || Date.now()
      };
      this.capturedLogs.push(log);
      console.debug('ConsoleLogCaptureManager: [handleDebuggerEvent] ✓ Captured exception:', log.message);
      console.debug('ConsoleLogCaptureManager: [handleDebuggerEvent] Total logs captured so far:', this.capturedLogs.length);
    } else {
      // Log all other debugger events to help diagnose what's happening
      console.debug('ConsoleLogCaptureManager: [handleDebuggerEvent] ○ Ignoring unhandled event type:', method);
    }
  }

  /**
   * Returns the captured console logs
   */
  getConsoleLogs(): ConsoleLog[] {
    return [...this.capturedLogs];
  }

  /**
   * Stops capturing and cleans up resources
   * Detaches debugger and closes the tab
   */
  async stopCapture(): Promise<void> {
    console.debug('ConsoleLogCaptureManager: Stopping capture');
    await this.cleanup();
  }

  /**
   * Internal cleanup method
   */
  private async cleanup(): Promise<void> {
    // Clear timeout if it exists
    if (this.captureTimeoutId) {
      clearTimeout(this.captureTimeoutId);
      this.captureTimeoutId = null;
      console.debug('ConsoleLogCaptureManager: Capture timeout cleared');
    }

    // Remove tab update listener
    if (this.tabUpdateListener) {
      chrome.tabs.onUpdated.removeListener(this.tabUpdateListener);
      this.tabUpdateListener = null;
      console.debug('ConsoleLogCaptureManager: Tab update listener removed');
    }

    // Remove event listener
    if (this.eventListener) {
      chrome.debugger.onEvent.removeListener(this.eventListener);
      this.eventListener = null;
      console.debug('ConsoleLogCaptureManager: Event listener removed');
    }

    // Detach debugger
    if (this.debuggerAttached && this.activeTabId !== null) {
      try {
        await chrome.debugger.detach({ tabId: this.activeTabId });
        console.debug('ConsoleLogCaptureManager: Debugger detached from tab:', this.activeTabId);
      } catch (error) {
        console.warn('ConsoleLogCaptureManager: Error detaching debugger:', error);
      }
      this.debuggerAttached = false;
    }

    // Close tab
    if (this.activeTabId !== null) {
      try {
        await chrome.tabs.remove(this.activeTabId);
        console.debug('ConsoleLogCaptureManager: Tab closed:', this.activeTabId);
      } catch (error) {
        console.warn('ConsoleLogCaptureManager: Error closing tab:', error);
      }
      this.activeTabId = null;
    }
  }

  /**
   * Cleanup method to be called when manager is no longer needed
   */
  async destroy(): Promise<void> {
    console.debug('ConsoleLogCaptureManager: Destroying manager');
    await this.cleanup();
    this.capturedLogs = [];
  }
}
