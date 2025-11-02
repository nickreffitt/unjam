import { type ConsoleLog } from '@common/types';

export interface PageState {
  consoleLogs: ConsoleLog[];
  screenshot: string | null;
}

/**
 * Coordinates capturing of page state including console logs and screenshot
 * Uses Chrome Debugger API for console logs and Chrome Tabs API for screenshots
 */
export class PageStateCaptureCoordinator {
  /**
   * Initializes the capture system
   * No longer needs to inject scripts since we use Chrome Debugger API
   */
  async initialize(): Promise<void> {
    console.debug('[PageStateCaptureCoordinator] Initialized (using Chrome Debugger API)');
  }

  /**
   * Captures console logs by sending a message to the background script
   * @param durationMs - How long to capture console logs (default: 500ms)
   */
  private async captureConsoleLogs(durationMs: number = 500): Promise<ConsoleLog[]> {
    try {
      console.debug('[PageStateCaptureCoordinator] Requesting console logs from background');

      const response = await browser.runtime.sendMessage({
        type: 'CAPTURE_CONSOLE_LOGS',
        durationMs
      });

      if (response.success) {
        console.debug('[PageStateCaptureCoordinator] Console logs captured:', response.logs.length);
        return response.logs;
      } else {
        console.error('[PageStateCaptureCoordinator] Console log capture failed:', response.error);
        return [];
      }
    } catch (error) {
      console.error('[PageStateCaptureCoordinator] Failed to capture console logs:', error);
      return [];
    }
  }

  /**
   * Captures a screenshot by sending a message to the background script
   */
  private async captureScreenshot(): Promise<string | null> {
    try {
      console.debug('[PageStateCaptureCoordinator] Requesting screenshot from background');

      const response = await browser.runtime.sendMessage({
        type: 'CAPTURE_SCREENSHOT'
      });

      if (response.success) {
        console.debug('[PageStateCaptureCoordinator] Screenshot captured successfully');
        return response.screenshot;
      } else {
        console.error('[PageStateCaptureCoordinator] Screenshot capture failed:', response.error);
        return null;
      }
    } catch (error) {
      console.error('[PageStateCaptureCoordinator] Failed to capture screenshot:', error);
      return null;
    }
  }

  /**
   * Captures the full page state (console logs + screenshot)
   * @param captureDurationMs - How long to capture console logs (default: 500ms)
   */
  async capturePageState(captureDurationMs: number = 500): Promise<PageState> {
    console.debug('[PageStateCaptureCoordinator] Capturing page state for', captureDurationMs, 'ms');

    // Capture console logs and screenshot in parallel
    // Note: Console log capture includes its own duration, screenshot is instant
    const [consoleLogs, screenshot] = await Promise.all([
      this.captureConsoleLogs(captureDurationMs),
      this.captureScreenshot()
    ]);

    console.debug('[PageStateCaptureCoordinator] Captured page state:', {
      consoleLogsCount: consoleLogs.length,
      hasScreenshot: screenshot !== null
    });

    return {
      consoleLogs,
      screenshot
    };
  }
}

// Export a singleton instance
export const pageStateCaptureCoordinator = new PageStateCaptureCoordinator();
