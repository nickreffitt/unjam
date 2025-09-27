import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TicketListenerLocal } from './TicketListenerLocal';
import { type TicketListenerCallbacks } from './TicketListener';
import { type Ticket } from '@common/types';

// Mock window object
const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

// Store original window reference
const originalWindow = global.window;

describe('TicketListener', () => {
  let listener: TicketListenerLocal;
  let mockCallbacks: TicketListenerCallbacks;
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

    mockCallbacks = {
      onTicketCreated: vi.fn(),
      onTicketUpdated: vi.fn(),
      onTicketDeleted: vi.fn(),
      onTicketsCleared: vi.fn(),
      onTicketsLoaded: vi.fn(),
    };

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

    listener = new TicketListenerLocal(mockCallbacks);
  });

  afterEach(() => {
    // Clean up listener if it's still active
    if (listener.getIsListening()) {
      listener.stopListening();
    }

    // Restore original window
    global.window = originalWindow;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create a listener with callbacks', () => {
      // Given callbacks are provided
      const callbacks = { onTicketCreated: vi.fn() };

      // When creating a TicketListener
      const listener = new TicketListenerLocal(callbacks);

      // Then it should be created but not listening yet
      expect(listener.getIsListening()).toBe(false);
    });
  });

  describe('startListening', () => {
    it('should add window event listener when starting', () => {
      // When starting to listen
      listener.startListening();

      // Then it should add event listener and mark as listening
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      );
      expect(listener.getIsListening()).toBe(true);
    });

    it('should not add duplicate listeners if already listening', () => {
      // Given listener is already active
      listener.startListening();
      expect(listener.getIsListening()).toBe(true);
      vi.clearAllMocks();

      // When trying to start listening again
      listener.startListening();

      // Then it should not add another event listener
      expect(mockWindow.addEventListener).not.toHaveBeenCalled();
      expect(listener.getIsListening()).toBe(true);
    });

    it('should not add listener in non-browser environment', () => {
      // Given window is undefined
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
        configurable: true
      });
      const listener = new TicketListenerLocal(mockCallbacks);

      // When trying to start listening
      listener.startListening();

      // Then it should not add event listener
      expect(mockWindow.addEventListener).not.toHaveBeenCalled();
      expect(listener.getIsListening()).toBe(false);
    });
  });

  describe('stopListening', () => {
    it('should remove window event listener when stopping', () => {
      // Given listener is active
      listener.startListening();
      const eventHandler = mockWindow.addEventListener.mock.calls[0][1];

      // When stopping listening
      listener.stopListening();

      // Then it should remove event listener and mark as not listening
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'storage',
        eventHandler
      );
      expect(listener.getIsListening()).toBe(false);
    });

    it('should not remove listener if not currently listening', () => {
      // Given listener is not active
      expect(listener.getIsListening()).toBe(false);

      // When trying to stop listening
      listener.stopListening();

      // Then it should not attempt to remove event listener
      expect(mockWindow.removeEventListener).not.toHaveBeenCalled();
    });
  });

  describe('updateCallbacks', () => {
    it('should update callbacks for active listener', () => {
      // Given listener is active
      listener.startListening();
      const eventHandler = mockWindow.addEventListener.mock.calls[0][1];

      // When updating callbacks
      const newCallbacks = {
        onTicketCreated: vi.fn(),
      };
      listener.updateCallbacks(newCallbacks);

      // And a ticket created storage event is received
      const mockEvent = {
        key: 'ticketstore-event',
        newValue: JSON.stringify({
          type: 'ticketCreated',
          ticket: mockTicket
        })
      } as StorageEvent;

      eventHandler(mockEvent);

      // Then new callback should be called, old ones should not
      expect(newCallbacks.onTicketCreated).toHaveBeenCalledWith(mockTicket);
      expect(mockCallbacks.onTicketCreated).not.toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    beforeEach(() => {
      listener.startListening();
    });

    it('should call onTicketCreated when ticketCreated event is received', () => {
      // Given listener is active
      const eventHandler = mockWindow.addEventListener.mock.calls[0][1];

      // When ticketCreated storage event is received
      const mockEvent = {
        key: 'ticketstore-event',
        newValue: JSON.stringify({
          type: 'ticketCreated',
          ticket: mockTicket
        })
      } as StorageEvent;

      eventHandler(mockEvent);

      // Then onTicketCreated callback should be called
      expect(mockCallbacks.onTicketCreated).toHaveBeenCalledWith(mockTicket);
    });

    it('should call onTicketUpdated when ticketUpdated event is received', () => {
      // Given listener is active
      const eventHandler = mockWindow.addEventListener.mock.calls[0][1];

      // When ticketUpdated storage event is received
      const mockEvent = {
        key: 'ticketstore-event',
        newValue: JSON.stringify({
          type: 'ticketUpdated',
          ticket: mockTicket
        })
      } as StorageEvent;

      eventHandler(mockEvent);

      // Then onTicketUpdated callback should be called
      expect(mockCallbacks.onTicketUpdated).toHaveBeenCalledWith(mockTicket);
    });

    it('should call onTicketDeleted when ticketDeleted event is received', () => {
      // Given listener is active
      const eventHandler = mockWindow.addEventListener.mock.calls[0][1];

      // When ticketDeleted storage event is received
      const mockEvent = {
        key: 'ticketstore-event',
        newValue: JSON.stringify({
          type: 'ticketDeleted',
          ticketId: 'test-ticket-1'
        })
      } as StorageEvent;

      eventHandler(mockEvent);

      // Then onTicketDeleted callback should be called
      expect(mockCallbacks.onTicketDeleted).toHaveBeenCalledWith('test-ticket-1');
    });

    it('should call onTicketsCleared when ticketsCleared event is received', () => {
      // Given listener is active
      const eventHandler = mockWindow.addEventListener.mock.calls[0][1];

      // When ticketsCleared storage event is received
      const mockEvent = {
        key: 'ticketstore-event',
        newValue: JSON.stringify({
          type: 'ticketsCleared'
        })
      } as StorageEvent;

      eventHandler(mockEvent);

      // Then onTicketsCleared callback should be called
      expect(mockCallbacks.onTicketsCleared).toHaveBeenCalled();
    });

    it('should call onTicketsLoaded when ticketsLoaded event is received', () => {
      // Given listener is active
      const eventHandler = mockWindow.addEventListener.mock.calls[0][1];
      const tickets = [mockTicket];

      // When ticketsLoaded storage event is received
      const mockEvent = {
        key: 'ticketstore-event',
        newValue: JSON.stringify({
          type: 'ticketsLoaded',
          tickets
        })
      } as StorageEvent;

      eventHandler(mockEvent);

      // Then onTicketsLoaded callback should be called
      expect(mockCallbacks.onTicketsLoaded).toHaveBeenCalledWith(tickets);
    });

    it('should handle partial callbacks gracefully', () => {
      // Given listener with only some callbacks
      const partialCallbacks = {
        onTicketCreated: vi.fn(),
      };

      // Clear previous mocks
      vi.clearAllMocks();

      const partialListener = new TicketListenerLocal(partialCallbacks);
      partialListener.startListening();

      const eventHandler = mockWindow.addEventListener.mock.calls[0][1]; // First call (storage event)

      // When various storage events are received
      const events = [
        { key: 'ticketstore-event', newValue: JSON.stringify({ type: 'ticketCreated', ticket: mockTicket }) },
        { key: 'ticketstore-event', newValue: JSON.stringify({ type: 'ticketUpdated', ticket: mockTicket }) },
        { key: 'ticketstore-event', newValue: JSON.stringify({ type: 'ticketsCleared' }) }
      ];

      events.forEach(event => {
        expect(() => {
          eventHandler(event as StorageEvent);
        }).not.toThrow();
      });

      // Then only the implemented callback should be called
      expect(partialCallbacks.onTicketCreated).toHaveBeenCalledWith(mockTicket);

      // Cleanup
      partialListener.stopListening();
    });

    it('should handle callback errors gracefully', () => {
      // Given a callback that throws an error
      const errorCallbacks = {
        onTicketCreated: vi.fn(() => {
          throw new Error('Callback error');
        }),
      };

      // Clear previous mocks
      vi.clearAllMocks();

      // Mock console.error
      const originalError = console.error;
      console.error = vi.fn();

      const errorListener = new TicketListenerLocal(errorCallbacks);
      errorListener.startListening();

      const eventHandler = mockWindow.addEventListener.mock.calls[0][1]; // First call (storage event)

      // When storage event is received and callback throws
      const mockEvent = {
        key: 'ticketstore-event',
        newValue: JSON.stringify({
          type: 'ticketCreated',
          ticket: mockTicket
        })
      } as StorageEvent;

      expect(() => {
        eventHandler(mockEvent);
      }).not.toThrow();

      // Then error should be logged
      expect(console.error).toHaveBeenCalledWith(
        'TicketListenerLocal: Error in onTicketCreated:',
        expect.any(Error)
      );

      // Restore console.error
      console.error = originalError;

      // Cleanup
      errorListener.stopListening();
    });

    it('should ignore events without required data', () => {
      // Given listener is active
      const eventHandler = mockWindow.addEventListener.mock.calls[0][1];

      // When storage events without required data are received
      const incompleteEvents = [
        { key: 'ticketstore-event', newValue: JSON.stringify({ type: 'ticketCreated' }) }, // No ticket
        { key: 'ticketstore-event', newValue: JSON.stringify({ type: 'ticketUpdated' }) }, // No ticket
        { key: 'ticketstore-event', newValue: JSON.stringify({ type: 'ticketDeleted' }) }, // No ticketId
        { key: 'ticketstore-event', newValue: JSON.stringify({ type: 'ticketsLoaded' }) }, // No tickets
      ];

      incompleteEvents.forEach(event => {
        eventHandler(event as StorageEvent);
      });

      // Then callbacks should not be called
      expect(mockCallbacks.onTicketCreated).not.toHaveBeenCalled();
      expect(mockCallbacks.onTicketUpdated).not.toHaveBeenCalled();
      expect(mockCallbacks.onTicketDeleted).not.toHaveBeenCalled();
      expect(mockCallbacks.onTicketsLoaded).not.toHaveBeenCalled();
    });

    it('should ignore storage events with wrong key or invalid JSON', () => {
      // Given listener is active
      const eventHandler = mockWindow.addEventListener.mock.calls[0][1];

      // Mock console.error
      const originalError = console.error;
      console.error = vi.fn();

      // When events with wrong key or invalid JSON are received
      const invalidEvents = [
        { key: 'other-key', newValue: JSON.stringify({ type: 'ticketCreated', ticket: mockTicket }) }, // Wrong key
        { key: 'ticketstore-event', newValue: 'invalid-json' }, // Invalid JSON
        { key: 'ticketstore-event', newValue: null }, // Null value
        { key: null, newValue: JSON.stringify({ type: 'ticketCreated', ticket: mockTicket }) }, // Null key
      ];

      invalidEvents.forEach(event => {
        eventHandler(event as StorageEvent);
      });

      // Then callbacks should not be called
      expect(mockCallbacks.onTicketCreated).not.toHaveBeenCalled();

      // Restore console.error
      console.error = originalError;
    });
  });
});