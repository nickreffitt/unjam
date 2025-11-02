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
  private isCapturing: boolean = false;

  /**
   * Initializes the capture system and starts continuous console log capture
   */
  async initialize(): Promise<void> {
    if (this.isCapturing) {
      console.debug('[PageStateCaptureCoordinator] Already capturing');
      return;
    }

    try {
      console.debug('[PageStateCaptureCoordinator] Starting continuous console capture');

      const response = await browser.runtime.sendMessage({
        type: 'START_CONSOLE_CAPTURE'
      });

      if (response.success) {
        this.isCapturing = true;
        console.debug('[PageStateCaptureCoordinator] Console capture started successfully');
      } else {
        console.error('[PageStateCaptureCoordinator] Failed to start console capture:', response.error);
      }
    } catch (error) {
      console.error('[PageStateCaptureCoordinator] Failed to initialize console capture:', error);
    }
  }

  /**
   * Gets accumulated console logs from the background script
   */
  private async getConsoleLogs(): Promise<ConsoleLog[]> {
    try {
      console.debug('[PageStateCaptureCoordinator] Getting accumulated console logs');

      const response = await browser.runtime.sendMessage({
        type: 'GET_CONSOLE_LOGS'
      });

      if (response.success) {
        console.debug('[PageStateCaptureCoordinator] Got', response.logs.length, 'console logs');
        return response.logs;
      } else {
        console.error('[PageStateCaptureCoordinator] Failed to get console logs:', response.error);
        return [];
      }
    } catch (error) {
      console.error('[PageStateCaptureCoordinator] Failed to get console logs:', error);
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
   * Captures the full page state (accumulated console logs + screenshot)
   * Console logs are captured continuously from the moment initialize() was called
   */
  async capturePageState(): Promise<PageState> {
    console.debug('[PageStateCaptureCoordinator] Capturing page state');

    // Get accumulated console logs and capture screenshot in parallel
    const [consoleLogs, screenshot] = await Promise.all([
      this.getConsoleLogs(),
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

  /**
   * Stops console log capture
   */
  async stopCapture(): Promise<void> {
    if (!this.isCapturing) {
      return;
    }

    try {
      console.debug('[PageStateCaptureCoordinator] Stopping console capture');

      const response = await browser.runtime.sendMessage({
        type: 'STOP_CONSOLE_CAPTURE'
      });

      if (response.success) {
        this.isCapturing = false;
        console.debug('[PageStateCaptureCoordinator] Console capture stopped');
      } else {
        console.error('[PageStateCaptureCoordinator] Failed to stop console capture:', response.error);
      }
    } catch (error) {
      console.error('[PageStateCaptureCoordinator] Failed to stop console capture:', error);
    }
  }
}

// Export a singleton instance
export const pageStateCaptureCoordinator = new PageStateCaptureCoordinator();
