import { type ConsoleLog } from '@common/types';
import { consoleCaptureManager } from './consoleCapture';

export interface PageState {
  consoleLogs: ConsoleLog[];
  screenshot: string | null;
}

/**
 * Coordinates capturing of page state including console logs and screenshot
 */
export class PageStateCaptureCoordinator {
  private isInitialized: boolean = false;

  /**
   * Initializes the capture system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Inject console capture script
      await consoleCaptureManager.inject();
      this.isInitialized = true;
      console.debug('[PageStateCaptureCoordinator] Initialized');
    } catch (error) {
      console.error('[PageStateCaptureCoordinator] Failed to initialize:', error);
      throw error;
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
   * @param captureDurationMs - How long to capture console logs before taking screenshot (default: 500ms)
   */
  async capturePageState(captureDurationMs: number = 500): Promise<PageState> {
    // Initialize if not already done
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Start capturing console logs
    consoleCaptureManager.startCapture();
    console.debug('[PageStateCaptureCoordinator] Started console capture');

    // Wait for the specified duration to capture console activity
    await new Promise(resolve => setTimeout(resolve, captureDurationMs));

    // Capture screenshot and stop console capture in parallel
    const [screenshot, consoleLogs] = await Promise.all([
      this.captureScreenshot(),
      Promise.resolve(consoleCaptureManager.stopCapture())
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

  /**
   * Starts capturing console logs immediately
   * Useful when you want to start capturing before a user action
   */
  startConsoleCapture(): void {
    if (!this.isInitialized) {
      this.initialize().then(() => {
        consoleCaptureManager.startCapture();
      });
    } else {
      consoleCaptureManager.startCapture();
    }
  }

  /**
   * Stops capturing console logs and returns them
   */
  stopConsoleCapture(): ConsoleLog[] {
    return consoleCaptureManager.stopCapture();
  }

  /**
   * Clears all captured console logs
   */
  clearConsoleLogs(): void {
    consoleCaptureManager.clearLogs();
  }
}

// Export a singleton instance
export const pageStateCaptureCoordinator = new PageStateCaptureCoordinator();
