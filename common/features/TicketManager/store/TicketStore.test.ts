import { describe, it, expect, beforeEach } from 'vitest';
import { TicketStoreLocal } from './TicketStoreLocal';
import { type TicketStore } from './TicketStore';
import { type CustomerProfile, type EngineerProfile, type Ticket } from '@common/types';

describe('TicketStoreLocal', () => {
  let ticketStore: TicketStore;

  // Mock user profiles for testing
  const mockCustomer: CustomerProfile = {
    id: 'CUST-TEST-001',
    name: 'Test Customer',
    type: 'customer',
    email: 'customer@test.com'
  };

  const mockEngineer: EngineerProfile = {
    id: 'ENG-TEST-001',
    name: 'Test Engineer',
    type: 'engineer',
    email: 'engineer@test.com',
    specialties: ['frontend']
  };

  // Mock ticket for testing
  const createMockTicket = (overrides?: Partial<Ticket>): Ticket => ({
    id: 'TKT-TEST-001',
    status: 'waiting',
    summary: 'Test ticket summary',
    estimatedTime: '10-15 min',
    problemDescription: 'Test problem description',
    createdBy: mockCustomer,
    createdAt: new Date(),
    elapsedTime: 0,
    ...overrides
  });

  beforeEach(() => {
    // Create a fresh store for each test
    ticketStore = new TicketStoreLocal();
    ticketStore.clear(); // Clear the mock data for isolated testing
  });

  describe('create', () => {
    it('should create a new ticket and add it to the store', () => {
      // Given a new ticket
      const newTicket = createMockTicket();

      // When creating the ticket
      const createdTicket = ticketStore.create(newTicket);

      // Then it should return the ticket and add it to the store
      expect(createdTicket).toEqual(newTicket);
      expect(ticketStore.getAll()).toHaveLength(1);
      expect(ticketStore.getAll()[0]).toEqual(newTicket);
    });

    it('should add new tickets to the beginning of the array', () => {
      // Given two tickets
      const firstTicket = createMockTicket({ id: 'TKT-FIRST' });
      const secondTicket = createMockTicket({ id: 'TKT-SECOND' });

      // When creating them in order
      ticketStore.create(firstTicket);
      ticketStore.create(secondTicket);

      // Then the most recent should be first
      const allTickets = ticketStore.getAll();
      expect(allTickets[0].id).toBe('TKT-SECOND');
      expect(allTickets[1].id).toBe('TKT-FIRST');
    });
  });

  describe('get', () => {
    it('should return a ticket when it exists', () => {
      // Given a ticket in the store
      const ticket = createMockTicket();
      ticketStore.create(ticket);

      // When getting the ticket by ID
      const foundTicket = ticketStore.get(ticket.id);

      // Then it should return the ticket
      expect(foundTicket).toEqual(ticket);
    });

    it('should return null when ticket does not exist', () => {
      // Given an empty store
      // When trying to get a non-existent ticket
      const foundTicket = ticketStore.get('NON-EXISTENT-ID');

      // Then it should return null
      expect(foundTicket).toBeNull();
    });

    it('should return a copy of the ticket to prevent external mutations', () => {
      // Given a ticket in the store
      const ticket = createMockTicket();
      ticketStore.create(ticket);

      // When getting the ticket
      const foundTicket = ticketStore.get(ticket.id);

      // Then modifying the returned ticket should not affect the store
      foundTicket!.summary = 'Modified summary';
      const originalTicket = ticketStore.get(ticket.id);
      expect(originalTicket!.summary).toBe('Test ticket summary');
    });
  });

  describe('getAllByStatus', () => {
    it('should return tickets with matching status', () => {
      // Given tickets with different statuses
      const waitingTicket = createMockTicket({ id: 'TKT-WAITING', status: 'waiting' });
      const inProgressTicket = createMockTicket({ id: 'TKT-PROGRESS', status: 'in-progress' });
      const completedTicket = createMockTicket({ id: 'TKT-COMPLETED', status: 'completed' });

      ticketStore.create(waitingTicket);
      ticketStore.create(inProgressTicket);
      ticketStore.create(completedTicket);

      // When getting tickets by status
      const waitingTickets = ticketStore.getAllByStatus('waiting', 10);
      const inProgressTickets = ticketStore.getAllByStatus('in-progress', 10);

      // Then it should return only matching tickets
      expect(waitingTickets).toHaveLength(1);
      expect(waitingTickets[0].id).toBe('TKT-WAITING');
      expect(inProgressTickets).toHaveLength(1);
      expect(inProgressTickets[0].id).toBe('TKT-PROGRESS');
    });

    it('should return tickets with matching statuses when array is provided', () => {
      // Given tickets with different statuses
      const waitingTicket = createMockTicket({ id: 'TKT-WAITING', status: 'waiting' });
      const inProgressTicket = createMockTicket({ id: 'TKT-PROGRESS', status: 'in-progress' });
      const awaitingConfirmationTicket = createMockTicket({ id: 'TKT-AWAITING', status: 'awaiting-confirmation' });
      const completedTicket = createMockTicket({ id: 'TKT-COMPLETED', status: 'completed' });

      ticketStore.create(waitingTicket);
      ticketStore.create(inProgressTicket);
      ticketStore.create(awaitingConfirmationTicket);
      ticketStore.create(completedTicket);

      // When getting tickets by multiple statuses
      const activeTickets = ticketStore.getAllByStatus(['in-progress', 'awaiting-confirmation'], 10);
      const finishedTickets = ticketStore.getAllByStatus(['completed'], 10);

      // Then it should return only matching tickets
      expect(activeTickets).toHaveLength(2);
      expect(activeTickets.map(t => t.id)).toContain('TKT-PROGRESS');
      expect(activeTickets.map(t => t.id)).toContain('TKT-AWAITING');
      expect(finishedTickets).toHaveLength(1);
      expect(finishedTickets[0].id).toBe('TKT-COMPLETED');
    });

    it('should support pagination with size parameter', () => {
      // Given multiple tickets with the same status
      for (let i = 0; i < 5; i++) {
        const ticket = createMockTicket({ id: `TKT-${i}`, status: 'waiting' });
        ticketStore.create(ticket);
      }

      // When getting tickets with size limit
      const firstPage = ticketStore.getAllByStatus('waiting', 2);
      const secondPage = ticketStore.getAllByStatus('waiting', 2, 2);

      // Then it should return the correct number of tickets
      expect(firstPage).toHaveLength(2);
      expect(secondPage).toHaveLength(2);
      expect(firstPage[0].id).not.toBe(secondPage[0].id);
    });

    it('should support pagination with offset parameter', () => {
      // Given 3 tickets with the same status
      const tickets = [];
      for (let i = 0; i < 3; i++) {
        const ticket = createMockTicket({ id: `TKT-${i}`, status: 'waiting' });
        tickets.push(ticket);
        ticketStore.create(ticket);
      }

      // When getting tickets with offset
      const withoutOffset = ticketStore.getAllByStatus('waiting', 2, 0);
      const withOffset = ticketStore.getAllByStatus('waiting', 2, 1);

      // Then the results should be different
      expect(withoutOffset).toHaveLength(2);
      expect(withOffset).toHaveLength(2);
      expect(withoutOffset[0].id).not.toBe(withOffset[0].id);
    });
  });

  describe('update', () => {
    it('should update an existing ticket', () => {
      // Given a ticket in the store
      const originalTicket = createMockTicket();
      ticketStore.create(originalTicket);

      // When updating the ticket
      const updatedTicket = createMockTicket({
        id: originalTicket.id,
        summary: 'Updated summary',
        status: 'in-progress',
        assignedTo: mockEngineer
      });
      const result = ticketStore.update(originalTicket.id, updatedTicket);

      // Then the ticket should be updated
      expect(result.summary).toBe('Updated summary');
      expect(result.status).toBe('in-progress');
      expect(result.assignedTo).toEqual(mockEngineer);

      // And the store should contain the updated ticket
      const storedTicket = ticketStore.get(originalTicket.id);
      expect(storedTicket!.summary).toBe('Updated summary');
    });

    it('should preserve the ticket ID when updating', () => {
      // Given a ticket in the store
      const originalTicket = createMockTicket();
      ticketStore.create(originalTicket);

      // When updating with a different ID
      const updatedTicket = createMockTicket({
        id: 'DIFFERENT-ID',
        summary: 'Updated summary'
      });
      const result = ticketStore.update(originalTicket.id, updatedTicket);

      // Then the original ID should be preserved
      expect(result.id).toBe(originalTicket.id);
      expect(result.id).not.toBe('DIFFERENT-ID');
    });

    it('should throw error when trying to update non-existent ticket', () => {
      // Given an empty store
      const ticketToUpdate = createMockTicket();

      // When trying to update a non-existent ticket
      // Then it should throw an error
      expect(() => {
        ticketStore.update('NON-EXISTENT-ID', ticketToUpdate);
      }).toThrow('Ticket with ID NON-EXISTENT-ID not found');
    });
  });

  describe('getCountByStatus', () => {
    it('should return the correct count of tickets by status', () => {
      // Given tickets with different statuses
      ticketStore.create(createMockTicket({ id: 'TKT-1', status: 'waiting' }));
      ticketStore.create(createMockTicket({ id: 'TKT-2', status: 'waiting' }));
      ticketStore.create(createMockTicket({ id: 'TKT-3', status: 'in-progress' }));

      // When counting tickets by status
      const waitingCount = ticketStore.getCountByStatus('waiting');
      const inProgressCount = ticketStore.getCountByStatus('in-progress');
      const completedCount = ticketStore.getCountByStatus('completed');

      // Then it should return correct counts
      expect(waitingCount).toBe(2);
      expect(inProgressCount).toBe(1);
      expect(completedCount).toBe(0);
    });
  });

  describe('getAll', () => {
    it('should return all tickets in the store', () => {
      // Given multiple tickets
      const ticket1 = createMockTicket({ id: 'TKT-1' });
      const ticket2 = createMockTicket({ id: 'TKT-2' });

      ticketStore.create(ticket1);
      ticketStore.create(ticket2);

      // When getting all tickets
      const allTickets = ticketStore.getAll();

      // Then it should return all tickets
      expect(allTickets).toHaveLength(2);
      expect(allTickets.map(t => t.id)).toContain('TKT-1');
      expect(allTickets.map(t => t.id)).toContain('TKT-2');
    });

    it('should return a copy of the tickets array', () => {
      // Given a ticket in the store
      const ticket = createMockTicket();
      ticketStore.create(ticket);

      // When getting all tickets
      const allTickets = ticketStore.getAll();

      // Then modifying the returned array should not affect the store
      allTickets.pop();
      expect(ticketStore.getAll()).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should remove all tickets from the store', () => {
      // Given tickets in the store
      ticketStore.create(createMockTicket({ id: 'TKT-1' }));
      ticketStore.create(createMockTicket({ id: 'TKT-2' }));
      expect(ticketStore.getAll()).toHaveLength(2);

      // When clearing the store
      ticketStore.clear();

      // Then the store should be empty
      expect(ticketStore.getAll()).toHaveLength(0);
    });
  });

  describe('getAllEngineerTicketsByStatus', () => {
    const anotherEngineer: EngineerProfile = {
      id: 'ENG-TEST-002',
      name: 'Another Engineer',
      type: 'engineer',
      email: 'another@test.com',
      specialties: ['backend']
    };

    it('should return only tickets assigned to the specific engineer with the specified status', () => {
      // Given tickets assigned to different engineers
      ticketStore.create(createMockTicket({
        id: 'TKT-1',
        status: 'in-progress',
        assignedTo: mockEngineer
      }));
      ticketStore.create(createMockTicket({
        id: 'TKT-2',
        status: 'in-progress',
        assignedTo: anotherEngineer
      }));
      ticketStore.create(createMockTicket({
        id: 'TKT-3',
        status: 'completed',
        assignedTo: mockEngineer
      }));

      // When getting in-progress tickets for mockEngineer
      const engineerTickets = ticketStore.getAllEngineerTicketsByStatus(
        mockEngineer,
        'in-progress',
        10,
        0
      );

      // Then it should return only the ticket assigned to mockEngineer with in-progress status
      expect(engineerTickets).toHaveLength(1);
      expect(engineerTickets[0].id).toBe('TKT-1');
      expect(engineerTickets[0].assignedTo?.id).toBe(mockEngineer.id);
      expect(engineerTickets[0].status).toBe('in-progress');
    });

    it('should return tickets assigned to the specific engineer with multiple specified statuses', () => {
      // Given tickets assigned to the engineer with different statuses
      ticketStore.create(createMockTicket({
        id: 'TKT-1',
        status: 'in-progress',
        assignedTo: mockEngineer
      }));
      ticketStore.create(createMockTicket({
        id: 'TKT-2',
        status: 'awaiting-confirmation',
        assignedTo: mockEngineer
      }));
      ticketStore.create(createMockTicket({
        id: 'TKT-3',
        status: 'marked-resolved',
        assignedTo: mockEngineer
      }));
      ticketStore.create(createMockTicket({
        id: 'TKT-4',
        status: 'completed',
        assignedTo: mockEngineer
      }));
      ticketStore.create(createMockTicket({
        id: 'TKT-5',
        status: 'in-progress',
        assignedTo: anotherEngineer
      }));

      // When getting active status tickets for mockEngineer
      const activeTickets = ticketStore.getAllEngineerTicketsByStatus(
        mockEngineer,
        ['in-progress', 'awaiting-confirmation', 'marked-resolved'],
        10,
        0
      );

      // Then it should return tickets assigned to mockEngineer with any of the active statuses
      expect(activeTickets).toHaveLength(3);
      expect(activeTickets.map(t => t.id)).toContain('TKT-1');
      expect(activeTickets.map(t => t.id)).toContain('TKT-2');
      expect(activeTickets.map(t => t.id)).toContain('TKT-3');
      expect(activeTickets.map(t => t.id)).not.toContain('TKT-4'); // completed should not be included
      expect(activeTickets.map(t => t.id)).not.toContain('TKT-5'); // different engineer should not be included
      activeTickets.forEach(ticket => {
        expect(ticket.assignedTo?.id).toBe(mockEngineer.id);
        expect(['in-progress', 'awaiting-confirmation', 'marked-resolved']).toContain(ticket.status);
      });
    });

    it('should return empty array when no tickets match the criteria', () => {
      // Given tickets not assigned to the engineer
      ticketStore.create(createMockTicket({
        id: 'TKT-1',
        status: 'in-progress',
        assignedTo: anotherEngineer
      }));

      // When getting tickets for mockEngineer
      const engineerTickets = ticketStore.getAllEngineerTicketsByStatus(
        mockEngineer,
        'in-progress',
        10,
        0
      );

      // Then it should return empty array
      expect(engineerTickets).toHaveLength(0);
    });

    it('should support pagination', () => {
      // Given multiple tickets assigned to the engineer
      for (let i = 1; i <= 5; i++) {
        ticketStore.create(createMockTicket({
          id: `TKT-${i}`,
          status: 'in-progress',
          assignedTo: mockEngineer
        }));
      }

      // When getting first 2 tickets
      const firstPage = ticketStore.getAllEngineerTicketsByStatus(
        mockEngineer,
        'in-progress',
        2,
        0
      );

      // Then it should return 2 tickets
      expect(firstPage).toHaveLength(2);

      // When getting next 2 tickets
      const secondPage = ticketStore.getAllEngineerTicketsByStatus(
        mockEngineer,
        'in-progress',
        2,
        2
      );

      // Then it should return 2 different tickets
      expect(secondPage).toHaveLength(2);
      expect(secondPage[0].id).not.toBe(firstPage[0].id);
      expect(secondPage[0].id).not.toBe(firstPage[1].id);
    });

    it('should only return tickets with exact status match', () => {
      // Given tickets with different statuses assigned to the engineer
      ticketStore.create(createMockTicket({
        id: 'TKT-1',
        status: 'in-progress',
        assignedTo: mockEngineer
      }));
      ticketStore.create(createMockTicket({
        id: 'TKT-2',
        status: 'completed',
        assignedTo: mockEngineer
      }));
      ticketStore.create(createMockTicket({
        id: 'TKT-3',
        status: 'waiting',
        assignedTo: mockEngineer
      }));

      // When getting only completed tickets
      const completedTickets = ticketStore.getAllEngineerTicketsByStatus(
        mockEngineer,
        'completed',
        10,
        0
      );

      // Then it should return only the completed ticket
      expect(completedTickets).toHaveLength(1);
      expect(completedTickets[0].id).toBe('TKT-2');
      expect(completedTickets[0].status).toBe('completed');
    });

    it('should exclude tickets with no assignedTo', () => {
      // Given tickets without assignment
      ticketStore.create(createMockTicket({
        id: 'TKT-1',
        status: 'waiting'
        // no assignedTo field
      }));

      // When getting waiting tickets for the engineer
      const engineerTickets = ticketStore.getAllEngineerTicketsByStatus(
        mockEngineer,
        'waiting',
        10,
        0
      );

      // Then it should return empty array
      expect(engineerTickets).toHaveLength(0);
    });
  });
});