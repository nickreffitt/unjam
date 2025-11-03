import { useState, useCallback, useMemo } from 'react';
import { ExtensionEventEmitter } from '@common/features/ExtensionManager/events';
import { type ConsoleLog } from '@common/types';

type CaptureState =
  | { status: 'idle' }
  | { status: 'fetching-url' }
  | { status: 'capturing' }
  | { status: 'completed'; totalLogs: number; errorLogs: number; logs: ConsoleLog[] }
  | { status: 'error'; message: string };

/**
 * Hook for managing console log capture
 * Provides methods to fetch preview URL and capture logs
 */
export function useConsoleLogCapture() {
  const [captureState, setCaptureState] = useState<CaptureState>({ status: 'idle' });
  const extensionEventEmitter = useMemo(() => new ExtensionEventEmitter(), []);

  /**
   * Starts capturing console logs
   * Fetches the preview URL first, then starts capture
   */
  const startCapture = useCallback(async () => {
    console.log('useConsoleLogCapture: startCapture called');
    try {
      // Set fetching state
      setCaptureState({ status: 'fetching-url' });
      console.log('useConsoleLogCapture: State set to fetching-url');

      // Get current URL
      const currentUrl = window.location.href;
      console.log('useConsoleLogCapture: Current URL:', currentUrl);
      console.debug('useConsoleLogCapture: Fetching preview URL for:', currentUrl);

      // Get preview URL
      console.log('useConsoleLogCapture: Calling getPreviewUrl...');
      const previewUrl = await extensionEventEmitter.getPreviewUrl(currentUrl);
      console.log('useConsoleLogCapture: getPreviewUrl returned:', previewUrl);

      if (!previewUrl) {
        console.warn('useConsoleLogCapture: No preview URL found');
        setCaptureState({
          status: 'error',
          message: 'Could not find preview URL for this page'
        });
        return;
      }

      console.debug('useConsoleLogCapture: Found preview URL:', previewUrl);

      // Start capturing
      console.log('useConsoleLogCapture: Setting state to capturing');
      setCaptureState({ status: 'capturing' });
      console.log('useConsoleLogCapture: Calling emitStartConsoleCapture...');
      await extensionEventEmitter.emitStartConsoleCapture(previewUrl);

      console.log('useConsoleLogCapture: Console capture started successfully');
      console.debug('useConsoleLogCapture: Console capture started');
    } catch (error) {
      console.error('useConsoleLogCapture: Failed to start capture:', error);
      console.error('useConsoleLogCapture: Error details:', error);
      setCaptureState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to start capture'
      });
    }
  }, [extensionEventEmitter]);

  /**
   * Stops capturing and retrieves captured logs
   */
  const stopCapture = useCallback(async () => {
    console.log('useConsoleLogCapture: stopCapture called');
    try {
      console.debug('useConsoleLogCapture: Stopping capture');
      const logs = await extensionEventEmitter.emitStopConsoleCapture();
      console.log('useConsoleLogCapture: Received logs:', logs.length);

      // Count error logs
      const errorLogs = logs.filter(log => log.type === 'error').length;

      console.debug('useConsoleLogCapture: Capture complete:', logs.length, 'total,', errorLogs, 'errors');

      setCaptureState({
        status: 'completed',
        totalLogs: logs.length,
        errorLogs,
        logs
      });

      return logs;
    } catch (error) {
      console.error('useConsoleLogCapture: Failed to stop capture:', error);
      setCaptureState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to stop capture'
      });
      return [];
    }
  }, [extensionEventEmitter]);

  /**
   * Resets the capture state
   */
  const resetCapture = useCallback(() => {
    setCaptureState({ status: 'idle' });
  }, []);

  return {
    captureState,
    startCapture,
    stopCapture,
    resetCapture,
  };
}
