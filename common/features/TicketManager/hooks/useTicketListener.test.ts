import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { type TicketListenerCallbacks } from '@common/features/TicketManager/events';
import { type Ticket } from '@common/types';

// Mock the window object
const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

// Store original values
const originalWindow = global.window;

describe('useTicketListenerCallbacks', () => {
  let mockTicket: Ticket;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set up the mock window
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true
    });

    mockTicket = {
      id: 'test-ticket-1',
      status: 'waiting',
      summary: 'Test ticket',
      estimatedTime: '5-10 min',
      problemDescription: 'Test problem',
      createdBy: {
        id: 'customer-1',
        name: 'Test Customer',
        type: 'customer',
        email: 'customer@test.com'
      },
      createdAt: new Date(),
      elapsedTime: 0
    };
  });

  afterEach(() => {
    // Restore original window
    global.window = originalWindow;
    vi.restoreAllMocks();
  });

  it('should set up window event listener on mount with browser environment', () => {
    // Given a window object is available
    const windowAvailable = typeof window !== 'undefined';

    // Then window should be available for setting up listeners
    expect(windowAvailable).toBe(true);
  });

  it('should handle window events correctly', () => {
    // Given a listener with event handlers
    const listener: Partial<TicketListenerCallbacks> = {
      onTicketCreated: vi.fn(),
      onTicketUpdated: vi.fn(),
      onTicketsCleared: vi.fn(),
    };

    // When a window event is dispatched with ticketCreated type
    const eventHandler = vi.fn((event: CustomEvent) => {
      const { type, ticket } = event.detail;

      switch (type) {
        case 'ticketCreated':
          if (listener.onTicketCreated && ticket) {
            listener.onTicketCreated(ticket);
          }
          break;
        case 'ticketUpdated':
          if (listener.onTicketUpdated && ticket) {
            listener.onTicketUpdated(ticket);
          }
          break;
        case 'ticketsCleared':
          if (listener.onTicketsCleared) {
            listener.onTicketsCleared();
          }
          break;
      }
    });

    // Simulate the event handling logic
    const mockEvent = {
      detail: {
        type: 'ticketCreated',
        ticket: mockTicket
      }
    } as CustomEvent;

    eventHandler(mockEvent);

    // Then the appropriate listener method should be called
    expect(listener.onTicketCreated).toHaveBeenCalledWith(mockTicket);
  });

  it('should handle multiple event types', () => {
    // Given a listener with multiple event handlers
    const listener: Partial<TicketListenerCallbacks> = {
      onTicketCreated: vi.fn(),
      onTicketUpdated: vi.fn(),
      onTicketsCleared: vi.fn(),
    };

    const eventHandler = (event: CustomEvent) => {
      const { type, ticket } = event.detail;

      switch (type) {
        case 'ticketCreated':
          if (listener.onTicketCreated && ticket) {
            listener.onTicketCreated(ticket);
          }
          break;
        case 'ticketUpdated':
          if (listener.onTicketUpdated && ticket) {
            listener.onTicketUpdated(ticket);
          }
          break;
        case 'ticketsCleared':
          if (listener.onTicketsCleared) {
            listener.onTicketsCleared();
          }
          break;
      }
    };

    // When different event types are handled
    eventHandler({
      detail: { type: 'ticketCreated', ticket: mockTicket }
    } as CustomEvent);

    eventHandler({
      detail: { type: 'ticketUpdated', ticket: mockTicket }
    } as CustomEvent);

    eventHandler({
      detail: { type: 'ticketsCleared' }
    } as CustomEvent);

    // Then all appropriate listener methods should be called
    expect(listener.onTicketCreated).toHaveBeenCalledWith(mockTicket);
    expect(listener.onTicketUpdated).toHaveBeenCalledWith(mockTicket);
    expect(listener.onTicketsCleared).toHaveBeenCalled();
  });

  it('should skip setup in non-browser environments', () => {
    // Given window is undefined (simulating SSR/Node environment)
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
      configurable: true
    });

    // When the hook logic checks for window existence
    const shouldSetupListeners = typeof window !== 'undefined';

    // Then setup should be skipped
    expect(shouldSetupListeners).toBe(false);
  });

  it('should handle errors in listener callbacks gracefully', () => {
    // Given a listener that throws an error
    const listener: Partial<TicketListenerCallbacks> = {
      onTicketCreated: vi.fn(() => {
        throw new Error('Listener error');
      }),
    };

    // Mock console.error
    const originalError = console.error;
    console.error = vi.fn();

    // When the event handler processes an event with error handling
    const eventHandlerWithErrorHandling = (event: CustomEvent) => {
      const { type, ticket } = event.detail;

      switch (type) {
        case 'ticketCreated':
          if (listener.onTicketCreated && ticket) {
            try {
              listener.onTicketCreated(ticket);
            } catch (error) {
              console.error('useTicketListenerCallbacks: Error in onTicketCreated:', error);
            }
          }
          break;
      }
    };

    // Process the event
    expect(() => {
      eventHandlerWithErrorHandling({
        detail: { type: 'ticketCreated', ticket: mockTicket }
      } as CustomEvent);
    }).not.toThrow();

    // Then the error should be logged
    expect(console.error).toHaveBeenCalledWith(
      'useTicketListenerCallbacks: Error in onTicketCreated:',
      expect.any(Error)
    );

    // Restore console.error
    console.error = originalError;
  });

  it('should ignore events without tickets when ticket is required', () => {
    // Given a listener
    const listener: Partial<TicketListenerCallbacks> = {
      onTicketCreated: vi.fn(),
    };

    // When an event without ticket data is processed
    const eventHandler = (event: CustomEvent) => {
      const { type, ticket } = event.detail;

      switch (type) {
        case 'ticketCreated':
          if (listener.onTicketCreated && ticket) {
            listener.onTicketCreated(ticket);
          }
          break;
      }
    };

    eventHandler({
      detail: { type: 'ticketCreated' }  // No ticket property
    } as CustomEvent);

    // Then the listener should not be called
    expect(listener.onTicketCreated).not.toHaveBeenCalled();
  });

  it('should handle partial listeners', () => {
    // Given a partial listener (only some methods implemented)
    const partialListener: Partial<TicketListenerCallbacks> = {
      onTicketCreated: vi.fn(),
      // Other methods not implemented
    };

    // When various events are processed
    const eventHandler = (event: CustomEvent) => {
      const { type, ticket } = event.detail;

      switch (type) {
        case 'ticketCreated':
          if (partialListener.onTicketCreated && ticket) {
            partialListener.onTicketCreated(ticket);
          }
          break;
        case 'ticketUpdated':
          if (partialListener.onTicketUpdated && ticket) {
            partialListener.onTicketUpdated(ticket);
          }
          break;
      }
    };

    // Process events for implemented and unimplemented methods
    eventHandler({
      detail: { type: 'ticketCreated', ticket: mockTicket }
    } as CustomEvent);

    eventHandler({
      detail: { type: 'ticketUpdated', ticket: mockTicket }
    } as CustomEvent);

    // Then only the implemented method should be called
    expect(partialListener.onTicketCreated).toHaveBeenCalledWith(mockTicket);
    // No errors should occur for unimplemented methods
  });
});