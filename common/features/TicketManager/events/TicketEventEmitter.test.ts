import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TicketEventEmitter } from './TicketEventEmitter';
import { type Ticket } from '@common/types';

// Mock localStorage and window
const mockLocalStorage = {
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

const mockWindow = {
  dispatchEvent: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Store original localStorage and window references
const originalLocalStorage = global.localStorage;
const originalWindow = global.window;

describe('TicketEventEmitter', () => {
  let emitter: TicketEventEmitter;
  let mockTicket: Ticket;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set up the mock window and localStorage
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true
    });

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });

    emitter = new TicketEventEmitter();

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
    // Restore original window and localStorage
    global.window = originalWindow;
    global.localStorage = originalLocalStorage;
    vi.restoreAllMocks();
  });

  describe('emitTicketCreated', () => {
    it('should emit storage event with correct data', () => {
      // When emitting a ticket created event
      emitter.emitTicketCreated(mockTicket);

      // Then localStorage should be called to trigger storage event
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ticketstore-event',
        expect.stringContaining('"type":"ticketCreated"')
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ticketstore-event');

      // Verify the JSON contains the ticket data
      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const eventData = JSON.parse(setItemCall[1]);
      expect(eventData.type).toBe('ticketCreated');
      expect(eventData.ticket).toEqual({
        ...mockTicket,
        createdAt: mockTicket.createdAt.toISOString()
      });
      expect(eventData.timestamp).toBeTypeOf('number');

      // Window events should be dispatched for same-tab communication
      expect(mockWindow.dispatchEvent).toHaveBeenCalledTimes(1);
      const customEvent = mockWindow.dispatchEvent.mock.calls[0][0];
      expect(customEvent.type).toBe('ticket-event');
      expect(customEvent.detail.type).toBe('ticketCreated');
      expect(customEvent.detail.ticket).toEqual(mockTicket);
    });
  });

  describe('emitTicketUpdated', () => {
    it('should emit storage event with correct data', () => {
      // When emitting a ticket updated event
      emitter.emitTicketUpdated(mockTicket);

      // Then localStorage should be called to trigger storage event
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ticketstore-event',
        expect.stringContaining('"type":"ticketUpdated"')
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ticketstore-event');

      // Verify the JSON contains the ticket data
      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const eventData = JSON.parse(setItemCall[1]);
      expect(eventData.type).toBe('ticketUpdated');
      expect(eventData.ticket).toEqual({
        ...mockTicket,
        createdAt: mockTicket.createdAt.toISOString()
      });
      expect(eventData.timestamp).toBeTypeOf('number');

      // Window events should be dispatched for same-tab communication
      expect(mockWindow.dispatchEvent).toHaveBeenCalledTimes(1);
      const customEvent = mockWindow.dispatchEvent.mock.calls[0][0];
      expect(customEvent.type).toBe('ticket-event');
      expect(customEvent.detail.type).toBe('ticketUpdated');
      expect(customEvent.detail.ticket).toEqual(mockTicket);
    });
  });

  describe('emitTicketDeleted', () => {
    it('should emit storage event with correct data', () => {
      // Given a ticket ID
      const ticketId = 'test-ticket-1';

      // When emitting a ticket deleted event
      emitter.emitTicketDeleted(ticketId);

      // Then localStorage should be called to trigger storage event
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ticketstore-event',
        expect.stringContaining('"type":"ticketDeleted"')
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ticketstore-event');

      // Verify the JSON contains the ticket ID
      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const eventData = JSON.parse(setItemCall[1]);
      expect(eventData.type).toBe('ticketDeleted');
      expect(eventData.ticketId).toBe(ticketId);
      expect(eventData.timestamp).toBeTypeOf('number');

      // Window events should be dispatched for same-tab communication
      expect(mockWindow.dispatchEvent).toHaveBeenCalledTimes(1);
      const customEvent = mockWindow.dispatchEvent.mock.calls[0][0];
      expect(customEvent.type).toBe('ticket-event');
      expect(customEvent.detail.type).toBe('ticketDeleted');
      expect(customEvent.detail.ticketId).toBe(ticketId);
    });
  });

  describe('emitTicketsCleared', () => {
    it('should emit storage event with correct data', () => {
      // When emitting a tickets cleared event
      emitter.emitTicketsCleared();

      // Then localStorage should be called to trigger storage event
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ticketstore-event',
        expect.stringContaining('"type":"ticketsCleared"')
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ticketstore-event');

      // Verify the JSON contains the correct type
      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const eventData = JSON.parse(setItemCall[1]);
      expect(eventData.type).toBe('ticketsCleared');
      expect(eventData.timestamp).toBeTypeOf('number');

      // Window events should be dispatched for same-tab communication
      expect(mockWindow.dispatchEvent).toHaveBeenCalledTimes(1);
      const customEvent = mockWindow.dispatchEvent.mock.calls[0][0];
      expect(customEvent.type).toBe('ticket-event');
      expect(customEvent.detail.type).toBe('ticketsCleared');
    });
  });

  describe('non-browser environments', () => {
    it('should handle missing window gracefully', () => {
      // Given window is undefined (simulating SSR/Node environment)
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
        configurable: true
      });

      // When creating emitter and emitting events
      const emitter = new TicketEventEmitter();

      expect(() => {
        emitter.emitTicketCreated(mockTicket);
        emitter.emitTicketUpdated(mockTicket);
        emitter.emitTicketDeleted('test-id');
        emitter.emitTicketsCleared();
      }).not.toThrow();

      // Then no localStorage calls should be made
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
      expect(mockWindow.dispatchEvent).not.toHaveBeenCalled();
    });
  });

  describe('storage event structure', () => {
    it('should create storage event with correct JSON structure', () => {
      // When emitting any event
      emitter.emitTicketCreated(mockTicket);

      // Then localStorage should be called with correct key and JSON data
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ticketstore-event',
        expect.any(String)
      );

      // Verify the JSON structure
      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const eventData = JSON.parse(setItemCall[1]);
      expect(eventData).toEqual({
        type: 'ticketCreated',
        ticket: {
          ...mockTicket,
          createdAt: mockTicket.createdAt.toISOString()
        },
        timestamp: expect.any(Number)
      });

      // Window events should be dispatched for same-tab communication
      expect(mockWindow.dispatchEvent).toHaveBeenCalledTimes(1);
      const customEvent = mockWindow.dispatchEvent.mock.calls[0][0];
      expect(customEvent.type).toBe('ticket-event');
      expect(customEvent.detail.type).toBe('ticketCreated');
      expect(customEvent.detail.ticket).toEqual(mockTicket);
    });
  });
});