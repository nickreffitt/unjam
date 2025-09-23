import { type ScreenShareRequest, type ScreenShareSession } from '@common/types';

export type ScreenShareEventType =
  | 'screenShareRequestCreated'
  | 'screenShareRequestUpdated'
  | 'screenShareSessionCreated'
  | 'screenShareSessionUpdated'
  | 'screenShareSessionEnded'
  | 'screenShareReloaded'
  | 'screenShareRemoteStreamAvailable';

/**
 * Event emitter for screen share-related events
 * Abstracts the underlying event mechanism to allow for future technology changes
 */
export class ScreenShareEventEmitter {
  constructor() {
    // No need for local listeners - everything goes through window events
  }

  /**
   * Emits a screen share request created event
   * @param request - The created request
   */
  emitScreenShareRequestCreated(request: ScreenShareRequest): void {
    this.emitWindowEvent('screenShareRequestCreated', { request });
  }

  /**
   * Emits a screen share request updated event
   * @param request - The updated request
   */
  emitScreenShareRequestUpdated(request: ScreenShareRequest): void {
    this.emitWindowEvent('screenShareRequestUpdated', { request });
  }

  /**
   * Emits a screen share session created event
   * @param session - The created session
   */
  emitScreenShareSessionCreated(session: ScreenShareSession): void {
    this.emitWindowEvent('screenShareSessionCreated', { session });
  }

  /**
   * Emits a screen share session updated event
   * @param session - The updated session
   */
  emitScreenShareSessionUpdated(session: ScreenShareSession): void {
    this.emitWindowEvent('screenShareSessionUpdated', { session });
  }

  /**
   * Emits a screen share session ended event
   * @param session - The ended session
   */
  emitScreenShareSessionEnded(session: ScreenShareSession): void {
    this.emitWindowEvent('screenShareSessionEnded', { session });
  }

  /**
   * Emits a screen share reloaded event
   * @param ticketId - The ticket ID for the screen share that was reloaded
   */
  emitScreenShareReloaded(ticketId: string): void {
    this.emitWindowEvent('screenShareReloaded', { ticketId });
  }

  /**
   * Emits a screen share remote stream available event
   * @param sessionId - The session ID
   * @param ticketId - The ticket ID
   */
  emitScreenShareRemoteStreamAvailable(sessionId: string, ticketId: string): void {
    this.emitWindowEvent('screenShareRemoteStreamAvailable', { sessionId, ticketId });
  }

  /**
   * Emits events for both same-tab and cross-tab communication
   */
  private emitWindowEvent(type: ScreenShareEventType, data: Record<string, unknown>): void {
    if (typeof window === 'undefined') return; // Skip in non-browser environments

    const eventPayload = {
      type,
      ...data,
      timestamp: Date.now()
    };

    // 1. Emit custom window event for same-tab communication
    const customEvent = new CustomEvent('screenshare-event', {
      detail: eventPayload
    });
    window.dispatchEvent(customEvent);

    // 2. Use localStorage to trigger storage events for cross-tab communication
    const eventKey = 'screenshare-event';
    localStorage.setItem(eventKey, JSON.stringify(eventPayload));

    // Clean up immediately to avoid cluttering localStorage
    localStorage.removeItem(eventKey);

    console.debug('ScreenShareEventEmitter: Emitting both window and storage events:', type, data);
  }
}