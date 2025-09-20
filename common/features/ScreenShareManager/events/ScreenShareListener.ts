import { type ScreenShareRequest, type ScreenShareSession } from '@common/types';
import { type ScreenShareEventType } from './ScreenShareEventEmitter';

/**
 * Interface for objects that listen to screen share events
 * All methods are optional to allow listeners to subscribe to only the events they care about
 */
export interface ScreenShareListenerCallbacks {
  /**
   * Called when a new screen share request is created
   * @param request - The newly created request
   */
  onScreenShareRequestCreated?(request: ScreenShareRequest): void;

  /**
   * Called when a screen share request is updated
   * @param request - The updated request
   */
  onScreenShareRequestUpdated?(request: ScreenShareRequest): void;

  /**
   * Called when a new screen share session is created
   * @param session - The newly created session
   */
  onScreenShareSessionCreated?(session: ScreenShareSession): void;

  /**
   * Called when a screen share session is updated
   * @param session - The updated session
   */
  onScreenShareSessionUpdated?(session: ScreenShareSession): void;

  /**
   * Called when screen share data is reloaded from storage
   * @param ticketId - The ticket ID for the screen share that was reloaded
   */
  onScreenShareReloaded?(ticketId: string): void;

  /**
   * Called when a remote stream becomes available
   * @param sessionId - The session ID
   * @param ticketId - The ticket ID
   */
  onScreenShareRemoteStreamAvailable?(sessionId: string, ticketId: string): void;
}

/**
 * Class that manages listening to global screen share events
 * Handles both same-tab (window events) and cross-tab (storage events) communication
 */
export class ScreenShareListener {
  private callbacks: Partial<ScreenShareListenerCallbacks>;
  private isListening: boolean = false;
  private handleStorageEvent: ((event: StorageEvent) => void) | null = null;
  private handleWindowEvent: ((event: CustomEvent) => void) | null = null;

  constructor(callbacks: Partial<ScreenShareListenerCallbacks>) {
    this.callbacks = callbacks;
  }

  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<ScreenShareListenerCallbacks>): void {
    this.callbacks = callbacks;
  }

  /**
   * Starts listening to both storage events (cross-tab) and window events (same-tab)
   */
  startListening(): void {
    if (this.isListening || typeof window === 'undefined') return;

    // Listen for storage events (cross-tab communication)
    this.handleStorageEvent = (event: StorageEvent) => {
      // Only process events for our specific key
      if (event.key !== 'screenshare-event' || !event.newValue) return;

      try {
        const eventData = JSON.parse(event.newValue);
        this.processEventData(eventData);
      } catch (error) {
        console.error('ScreenShareListener: Error parsing storage event data:', error);
      }
    };

    // Listen for window events (same-tab communication)
    this.handleWindowEvent = (event: CustomEvent) => {
      try {
        this.processEventData(event.detail);
      } catch (error) {
        console.error('ScreenShareListener: Error processing window event data:', error);
      }
    };

    window.addEventListener('storage', this.handleStorageEvent);
    window.addEventListener('screenshare-event', this.handleWindowEvent as EventListener);
    this.isListening = true;

    console.debug('ScreenShareListener: Started listening to global screen share events via storage and window events');
  }

  /**
   * Processes event data from either storage or window events
   */
  private processEventData(eventData: any): void {
    try {
      const { type, request, session, ticketId } = eventData;

      // Deserialize Date objects if needed
      let deserializedRequest = request;
      if (request) {
        deserializedRequest = {
          ...request,
          createdAt: request.createdAt ? new Date(request.createdAt) : new Date(),
            updatedAt: request.updatedAt ? new Date(request.updatedAt) : new Date(),
          };
        }

        let deserializedSession = session;
        if (session) {
          deserializedSession = {
            ...session,
            createdAt: session.createdAt ? new Date(session.createdAt) : new Date(),
            updatedAt: session.updatedAt ? new Date(session.updatedAt) : new Date(),
            startedAt: session.startedAt ? new Date(session.startedAt) : undefined,
            endedAt: session.endedAt ? new Date(session.endedAt) : undefined,
          };
        }

        switch (type as ScreenShareEventType) {
          case 'screenShareRequestCreated':
            if (this.callbacks.onScreenShareRequestCreated && deserializedRequest) {
              try {
                this.callbacks.onScreenShareRequestCreated(deserializedRequest);
              } catch (error) {
                console.error('ScreenShareListener: Error in onScreenShareRequestCreated:', error);
              }
            }
            break;
          case 'screenShareRequestUpdated':
            if (this.callbacks.onScreenShareRequestUpdated && deserializedRequest) {
              try {
                this.callbacks.onScreenShareRequestUpdated(deserializedRequest);
              } catch (error) {
                console.error('ScreenShareListener: Error in onScreenShareRequestUpdated:', error);
              }
            }
            break;
          case 'screenShareSessionCreated':
            if (this.callbacks.onScreenShareSessionCreated && deserializedSession) {
              try {
                this.callbacks.onScreenShareSessionCreated(deserializedSession);
              } catch (error) {
                console.error('ScreenShareListener: Error in onScreenShareSessionCreated:', error);
              }
            }
            break;
          case 'screenShareSessionUpdated':
            if (this.callbacks.onScreenShareSessionUpdated && deserializedSession) {
              try {
                this.callbacks.onScreenShareSessionUpdated(deserializedSession);
              } catch (error) {
                console.error('ScreenShareListener: Error in onScreenShareSessionUpdated:', error);
              }
            }
            break;
          case 'screenShareReloaded':
            if (this.callbacks.onScreenShareReloaded && ticketId) {
              try {
                this.callbacks.onScreenShareReloaded(ticketId);
              } catch (error) {
                console.error('ScreenShareListener: Error in onScreenShareReloaded:', error);
              }
            }
            break;
          case 'screenShareRemoteStreamAvailable':
            const { sessionId } = eventData;
            if (this.callbacks.onScreenShareRemoteStreamAvailable && sessionId && ticketId) {
              try {
                this.callbacks.onScreenShareRemoteStreamAvailable(sessionId, ticketId);
              } catch (error) {
                console.error('ScreenShareListener: Error in onScreenShareRemoteStreamAvailable:', error);
              }
            }
            break;
        }
    } catch (error) {
      console.error('ScreenShareListener: Error processing event data:', error);
    }
  }

  /**
   * Stops listening to both storage and window events
   */
  stopListening(): void {
    if (!this.isListening) return;

    if (this.handleStorageEvent) {
      window.removeEventListener('storage', this.handleStorageEvent);
      this.handleStorageEvent = null;
    }

    if (this.handleWindowEvent) {
      window.removeEventListener('screenshare-event', this.handleWindowEvent as EventListener);
      this.handleWindowEvent = null;
    }

    this.isListening = false;
    console.debug('ScreenShareListener: Stopped listening to global screen share events');
  }

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}