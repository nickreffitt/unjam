import { describe, it, expect, beforeEach } from 'vitest';
import { TicketListManager } from './TicketListManager';
import { type TicketStore, TicketStoreLocal, type TicketChanges } from '@common/features/TicketManager/store';
import { type CustomerProfile, type EngineerProfile } from '@common/types';

describe('TicketListManager', () => {
  let ticketStore: TicketStore;
  let mockTicketChanges: TicketChanges;

  // Create mock user profiles
  const mockCustomer: CustomerProfile = {
    id: 'CUST-123',
    name: 'Test Customer',
    type: 'customer',
    email: 'customer@test.com'
  };

  const mockEngineer: EngineerProfile = {
    id: 'ENG-456',
    name: 'Test Engineer',
    type: 'engineer',
    email: 'engineer@test.com',
    specialties: ['backend', 'frontend']
  };

  beforeEach(() => {
    // Create a fresh store for each test and populate with mock data
    ticketStore = new TicketStoreLocal();
    ticketStore.clear(); // Clear any existing data from localStorage

    // Create mock TicketChanges
    mockTicketChanges = {
      start: async () => {},
      stop: () => {}
    };

    // Create test tickets
    const testTicket1 = {
      id: 'TKT-001',
      status: 'waiting' as const,
      summary: 'Test ticket 1',
      estimatedTime: '5-10 min',
      problemDescription: 'Test problem 1',
      createdBy: mockCustomer,
      createdAt: new Date(),
      elapsedTime: 0
    };

    const testTicket2 = {
      id: 'TKT-002',
      status: 'waiting' as const,
      summary: 'Test ticket 2 - Abandoned',
      estimatedTime: '10-15 min',
      problemDescription: 'Test problem 2',
      createdBy: mockCustomer,
      createdAt: new Date(Date.now() - 60000), // 1 minute ago
      elapsedTime: 60,
      abandonedAt: new Date(Date.now() - 30000) // Abandoned 30 seconds ago
    };

    ticketStore.create(testTicket1);
    ticketStore.create(testTicket2);
  });

  describe('listNewTickets', () => {
    it('should list new tickets when user is an engineer', async () => {
      // Given a TicketListManager instance for an engineer
      const ticketListManager = new TicketListManager(mockEngineer, ticketStore, mockTicketChanges);

      // When listing new tickets
      const tickets = await ticketListManager.listNewTickets();

      // Then it should return a list of ticket items
      expect(tickets).toBeDefined();
      expect(Array.isArray(tickets)).toBe(true);
      expect(tickets.length).toBeGreaterThan(0);

      // Verify the structure of returned items
      const firstTicket = tickets[0];
      expect(firstTicket).toHaveProperty('ticket');
      expect(firstTicket).toHaveProperty('summary');
      expect(firstTicket).toHaveProperty('status');
      expect(firstTicket).toHaveProperty('time');
      expect(firstTicket).toHaveProperty('actions');
      expect(firstTicket.status).toBe('waiting');
      expect(firstTicket.actions).toContain('claim');
      expect(firstTicket.actions).toContain('view');

      // Verify ticket has createdBy field
      expect(firstTicket.ticket.createdBy).toBeDefined();
      expect(firstTicket.ticket.createdBy.type).toBe('customer');
    });

    it('should include abandoned tickets in the list', async () => {
      // Given a TicketListManager instance for an engineer
      const ticketListManager = new TicketListManager(mockEngineer, ticketStore, mockTicketChanges);

      // When listing new tickets
      const tickets = await ticketListManager.listNewTickets();

      // Then it should include abandoned tickets
      const abandonedTicket = tickets.find(t => t.ticket.abandonedAt !== undefined);
      expect(abandonedTicket).toBeDefined();
      expect(abandonedTicket?.status).toBe('waiting');
    });

    it('should format elapsed time correctly', async () => {
      // Given a TicketListManager instance for an engineer
      const ticketListManager = new TicketListManager(mockEngineer, ticketStore, mockTicketChanges);

      // When listing new tickets
      const tickets = await ticketListManager.listNewTickets();

      // Then the time should be formatted as MM:SS
      tickets.forEach(ticket => {
        expect(ticket.time).toMatch(/^\d+:\d{2}$/);
      });
    });

    it('should throw error when non-engineer tries to list tickets', async () => {
      // Given a TicketListManager instance for a customer
      const ticketListManager = new TicketListManager(mockCustomer, ticketStore, mockTicketChanges);

      // When trying to list tickets as a customer
      // Then it should throw an error
      await expect(
        ticketListManager.listNewTickets()
      ).rejects.toThrow('Only engineers can list new tickets');
    });
  });

  describe('listActiveTickets', () => {
    it('should list tickets with all active statuses for an engineer', async () => {
      // Given tickets with different statuses assigned to the engineer
      ticketStore.clear();
      ticketStore.create({
        id: 'TKT-IN-PROGRESS',
        status: 'in-progress',
        summary: 'In progress ticket',
        estimatedTime: '10 min',
        problemDescription: 'Test problem',
        createdBy: mockCustomer,
        createdAt: new Date(),
        elapsedTime: 300,
        assignedTo: mockEngineer
      });
      ticketStore.create({
        id: 'TKT-AWAITING',
        status: 'awaiting-confirmation',
        summary: 'Awaiting confirmation ticket',
        estimatedTime: '5 min',
        problemDescription: 'Test problem',
        createdBy: mockCustomer,
        createdAt: new Date(),
        elapsedTime: 600,
        assignedTo: mockEngineer
      });
      ticketStore.create({
        id: 'TKT-MARKED',
        status: 'marked-resolved',
        summary: 'Marked resolved ticket',
        estimatedTime: '15 min',
        problemDescription: 'Test problem',
        createdBy: mockCustomer,
        createdAt: new Date(),
        elapsedTime: 900,
        assignedTo: mockEngineer
      });
      ticketStore.create({
        id: 'TKT-COMPLETED',
        status: 'completed',
        summary: 'Completed ticket',
        estimatedTime: '20 min',
        problemDescription: 'Test problem',
        createdBy: mockCustomer,
        createdAt: new Date(),
        elapsedTime: 1200,
        assignedTo: mockEngineer
      });

      // Given a TicketListManager instance for the engineer
      const ticketListManager = new TicketListManager(mockEngineer, ticketStore, mockTicketChanges);

      // When listing active tickets
      const activeTickets = await ticketListManager.listActiveTickets();

      // Then it should return tickets with all active statuses
      expect(activeTickets).toHaveLength(3);
      const ticketIds = activeTickets.map(t => t.ticket.id);
      expect(ticketIds).toContain('TKT-IN-PROGRESS');
      expect(ticketIds).toContain('TKT-AWAITING');
      expect(ticketIds).toContain('TKT-MARKED');
      expect(ticketIds).not.toContain('TKT-COMPLETED'); // completed should not be in active list

      // Verify the structure of returned items
      activeTickets.forEach(ticket => {
        expect(ticket).toHaveProperty('ticket');
        expect(ticket).toHaveProperty('summary');
        expect(ticket).toHaveProperty('status');
        expect(ticket).toHaveProperty('time');
        expect(ticket).toHaveProperty('actions');
        expect(['in-progress', 'awaiting-confirmation', 'marked-resolved']).toContain(ticket.status);
        expect(ticket.actions).toContain('view');
        expect(ticket.actions).toContain('message');
      });
    });

    it('should throw error when non-engineer tries to list active tickets', async () => {
      // Given a TicketListManager instance for a customer
      const ticketListManager = new TicketListManager(mockCustomer, ticketStore, mockTicketChanges);

      // When trying to list active tickets as a customer
      // Then it should throw an error
      await expect(
        ticketListManager.listActiveTickets()
      ).rejects.toThrow('Only engineers can list active tickets');
    });
  });
});