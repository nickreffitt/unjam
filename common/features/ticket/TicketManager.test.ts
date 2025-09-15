import { describe, it, expect, beforeEach } from 'vitest';
import { TicketManager } from './TicketManager';
import { TicketStore } from '../../data';
import { type CustomerProfile, type EngineerProfile } from '../../types';

describe('TicketManager', () => {
  let ticketStore: TicketStore;

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

  const anotherEngineer: EngineerProfile = {
    id: 'ENG-789',
    name: 'Another Engineer',
    type: 'engineer',
    email: 'another@test.com'
  };

  beforeEach(() => {
    // Create a fresh store for each test
    ticketStore = new TicketStore();
    ticketStore.clear(); // Clear the mock data for isolated testing
  });

  describe('createTicket', () => {
    it('should create a ticket when user is a customer', async () => {
      // Given a TicketManager instance for a customer
      const ticketManager = new TicketManager(mockCustomer, ticketStore);
      const problemDescription = 'My application is not loading properly';

      // When creating a ticket
      const ticket = await ticketManager.createTicket(problemDescription);

      // Then the ticket should be created with correct properties
      expect(ticket).toBeDefined();
      expect(ticket.id).toContain('TKT-');
      expect(ticket.status).toBe('waiting');
      expect(ticket.problemDescription).toBe(problemDescription);
      expect(ticket.summary).toBe('My application is not loading properly');
      expect(ticket.estimatedTime).toBe('5-10 min');
      expect(ticket.createdAt).toBeInstanceOf(Date);
      expect(ticket.elapsedTime).toBe(0);
      expect(ticket.createdBy).toEqual(mockCustomer);
      expect(ticket.assignedTo).toBeUndefined();
    });

    it('should truncate long problem descriptions in summary', async () => {
      // Given a customer with a long problem description
      const ticketManager = new TicketManager(mockCustomer, ticketStore);
      const longDescription = 'This is a very long problem description that exceeds fifty characters and should be truncated';

      // When creating a ticket
      const ticket = await ticketManager.createTicket(longDescription);

      // Then the summary should be truncated with ellipsis
      expect(ticket.summary).toBe('This is a very long problem description that excee...');
      expect(ticket.problemDescription).toBe(longDescription);
      expect(ticket.createdBy).toEqual(mockCustomer);
    });

    it('should throw error when non-customer tries to create ticket', async () => {
      // Given a TicketManager instance for an engineer
      const ticketManager = new TicketManager(mockEngineer, ticketStore);

      // When trying to create a ticket as an engineer
      // Then it should throw an error
      await expect(
        ticketManager.createTicket('Problem description')
      ).rejects.toThrow('Only customers can create tickets');
    });
  });


  describe('claimTicket', () => {
    it('should allow engineer to claim an unassigned ticket', async () => {
      // Given an engineer and an unassigned ticket in the store
      const ticketManager = new TicketManager(mockEngineer, ticketStore);
      const unassignedTicket = {
        id: 'TKT-999',
        status: 'waiting' as const,
        summary: 'Test ticket',
        estimatedTime: '5-10 min',
        problemDescription: 'Test problem',
        createdBy: mockCustomer,
        createdAt: new Date(),
        elapsedTime: 0
      };
      ticketStore.create(unassignedTicket);

      // When claiming the ticket
      const claimedTicket = await ticketManager.claimTicket('TKT-999');

      // Then the ticket should be assigned to the engineer
      expect(claimedTicket.status).toBe('in-progress');
      expect(claimedTicket.assignedTo).toEqual(mockEngineer);
      expect(claimedTicket.claimedAt).toBeInstanceOf(Date);
    });

    it('should throw error when customer tries to claim ticket', async () => {
      // Given a customer and a ticket in the store
      const ticketManager = new TicketManager(mockCustomer, ticketStore);
      const ticket = {
        id: 'TKT-999',
        status: 'waiting' as const,
        summary: 'Test ticket',
        estimatedTime: '5-10 min',
        problemDescription: 'Test problem',
        createdBy: mockCustomer,
        createdAt: new Date(),
        elapsedTime: 0
      };
      ticketStore.create(ticket);

      // When trying to claim as a customer
      // Then it should throw an error
      await expect(
        ticketManager.claimTicket('TKT-999')
      ).rejects.toThrow('Only engineers can claim tickets');
    });

    it('should throw error when ticket is already assigned', async () => {
      // Given an engineer and an already assigned ticket in the store
      const ticketManager = new TicketManager(anotherEngineer, ticketStore);
      const assignedTicket = {
        id: 'TKT-999',
        status: 'in-progress' as const,
        summary: 'Test ticket',
        estimatedTime: '5-10 min',
        problemDescription: 'Test problem',
        createdBy: mockCustomer,
        assignedTo: mockEngineer,
        createdAt: new Date(),
        claimedAt: new Date(),
        elapsedTime: 0
      };
      ticketStore.create(assignedTicket);

      // When trying to claim an already assigned ticket
      // Then it should throw an error
      await expect(
        ticketManager.claimTicket('TKT-999')
      ).rejects.toThrow('This ticket is already assigned to an engineer');
    });
  });

  describe('markAsFixed', () => {
    it('should mark ticket as fixed when engineer is assigned to it', async () => {
      // Given an engineer and a ticket assigned to them
      const ticketManager = new TicketManager(mockEngineer, ticketStore);
      const assignedTicket = {
        id: 'TKT-999',
        status: 'in-progress' as const,
        summary: 'Test ticket',
        estimatedTime: '5-10 min',
        problemDescription: 'Test problem',
        createdBy: mockCustomer,
        assignedTo: mockEngineer,
        createdAt: new Date(),
        claimedAt: new Date(),
        elapsedTime: 0
      };
      ticketStore.create(assignedTicket);

      // When marking the ticket as fixed
      const beforeTime = new Date();
      const fixedTicket = await ticketManager.markAsFixed('TKT-999');

      // Then the ticket should be marked as awaiting confirmation
      expect(fixedTicket.status).toBe('awaiting-confirmation');
      expect(fixedTicket.markedAsFixedAt).toBeInstanceOf(Date);
      expect(fixedTicket.autoCompleteTimeoutAt).toBeInstanceOf(Date);
      expect(fixedTicket.assignedTo).toEqual(mockEngineer);

      // Verify timeout is set in the future (with some tolerance for timing)
      const timeoutDate = fixedTicket.autoCompleteTimeoutAt!;
      expect(timeoutDate.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());

      // Verify it's set within a reasonable range (should be within next hour)
      const maxExpectedTimeout = new Date(beforeTime.getTime() + 60 * 60 * 1000); // 1 hour
      expect(timeoutDate.getTime()).toBeLessThan(maxExpectedTimeout.getTime());
    });

    it('should throw error when customer tries to mark ticket as fixed', async () => {
      // Given a customer and a ticket in the store
      const ticketManager = new TicketManager(mockCustomer, ticketStore);
      const ticket = {
        id: 'TKT-999',
        status: 'in-progress' as const,
        summary: 'Test ticket',
        estimatedTime: '5-10 min',
        problemDescription: 'Test problem',
        createdBy: mockCustomer,
        assignedTo: mockEngineer,
        createdAt: new Date(),
        claimedAt: new Date(),
        elapsedTime: 0
      };
      ticketStore.create(ticket);

      // When trying to mark as fixed as a customer
      // Then it should throw an error
      await expect(
        ticketManager.markAsFixed('TKT-999')
      ).rejects.toThrow('Only engineers can mark tickets as fixed');
    });

    it('should throw error when ticket is not found', async () => {
      // Given an engineer and no ticket in the store
      const ticketManager = new TicketManager(mockEngineer, ticketStore);

      // When trying to mark a non-existent ticket as fixed
      // Then it should throw an error
      await expect(
        ticketManager.markAsFixed('TKT-999')
      ).rejects.toThrow('Ticket with ID TKT-999 not found');
    });

    it('should throw error when engineer is not assigned to the ticket', async () => {
      // Given an engineer and a ticket assigned to another engineer
      const ticketManager = new TicketManager(anotherEngineer, ticketStore);
      const assignedTicket = {
        id: 'TKT-999',
        status: 'in-progress' as const,
        summary: 'Test ticket',
        estimatedTime: '5-10 min',
        problemDescription: 'Test problem',
        createdBy: mockCustomer,
        assignedTo: mockEngineer, // Different engineer
        createdAt: new Date(),
        claimedAt: new Date(),
        elapsedTime: 0
      };
      ticketStore.create(assignedTicket);

      // When trying to mark as fixed
      // Then it should throw an error
      await expect(
        ticketManager.markAsFixed('TKT-999')
      ).rejects.toThrow('You can only mark tickets assigned to you as fixed');
    });

    it('should throw error when ticket has no assigned engineer', async () => {
      // Given an engineer and an unassigned ticket
      const ticketManager = new TicketManager(mockEngineer, ticketStore);
      const unassignedTicket = {
        id: 'TKT-999',
        status: 'waiting' as const,
        summary: 'Test ticket',
        estimatedTime: '5-10 min',
        problemDescription: 'Test problem',
        createdBy: mockCustomer,
        createdAt: new Date(),
        elapsedTime: 0
      };
      ticketStore.create(unassignedTicket);

      // When trying to mark as fixed
      // Then it should throw an error
      await expect(
        ticketManager.markAsFixed('TKT-999')
      ).rejects.toThrow('You can only mark tickets assigned to you as fixed');
    });
  });

  describe('markAsResolved', () => {
    it('should mark ticket as completed when called', async () => {
      // Given any user and a ticket awaiting confirmation
      const ticketManager = new TicketManager(mockCustomer, ticketStore);
      const awaitingTicket = {
        id: 'TKT-999',
        status: 'awaiting-confirmation' as const,
        summary: 'Test ticket',
        estimatedTime: '5-10 min',
        problemDescription: 'Test problem',
        createdBy: mockCustomer,
        assignedTo: mockEngineer,
        createdAt: new Date(),
        claimedAt: new Date(),
        markedAsFixedAt: new Date(),
        autoCompleteTimeoutAt: new Date(Date.now() + 30 * 60 * 1000),
        elapsedTime: 0
      };
      ticketStore.create(awaitingTicket);

      // When marking the ticket as resolved
      const resolvedTicket = await ticketManager.markAsResolved('TKT-999');

      // Then the ticket should be marked as completed
      expect(resolvedTicket.status).toBe('completed');
      expect(resolvedTicket.resolvedAt).toBeInstanceOf(Date);
    });

    it('should throw error when ticket is not found', async () => {
      // Given any user and no ticket in the store
      const ticketManager = new TicketManager(mockCustomer, ticketStore);

      // When trying to mark a non-existent ticket as resolved
      // Then it should throw an error
      await expect(
        ticketManager.markAsResolved('TKT-999')
      ).rejects.toThrow('Ticket with ID TKT-999 not found');
    });
  });

  describe('autoCompleteTicket', () => {
    it('should auto-complete ticket when status is awaiting-confirmation', async () => {
      // Given any user and a ticket awaiting confirmation
      const ticketManager = new TicketManager(mockEngineer, ticketStore);
      const awaitingTicket = {
        id: 'TKT-999',
        status: 'awaiting-confirmation' as const,
        summary: 'Test ticket',
        estimatedTime: '5-10 min',
        problemDescription: 'Test problem',
        createdBy: mockCustomer,
        assignedTo: mockEngineer,
        createdAt: new Date(),
        claimedAt: new Date(),
        markedAsFixedAt: new Date(),
        autoCompleteTimeoutAt: new Date(Date.now() + 30 * 60 * 1000),
        elapsedTime: 0
      };
      ticketStore.create(awaitingTicket);

      // When auto-completing the ticket
      const autoCompletedTicket = await ticketManager.autoCompleteTicket('TKT-999');

      // Then the ticket should be marked as auto-completed
      expect(autoCompletedTicket.status).toBe('auto-completed');
      expect(autoCompletedTicket.resolvedAt).toBeInstanceOf(Date);
    });

    it('should not auto-complete ticket when status is not awaiting-confirmation', async () => {
      // Given any user and a ticket not awaiting confirmation
      const ticketManager = new TicketManager(mockEngineer, ticketStore);
      const completedTicket = {
        id: 'TKT-999',
        status: 'completed' as const,
        summary: 'Test ticket',
        estimatedTime: '5-10 min',
        problemDescription: 'Test problem',
        createdBy: mockCustomer,
        assignedTo: mockEngineer,
        createdAt: new Date(),
        claimedAt: new Date(),
        resolvedAt: new Date(),
        elapsedTime: 0
      };
      ticketStore.create(completedTicket);

      // When auto-completing the ticket
      const result = await ticketManager.autoCompleteTicket('TKT-999');

      // Then the ticket should remain unchanged
      expect(result.status).toBe('completed');
      expect(result).toEqual(completedTicket);
    });
  });

  describe('User Type Validation', () => {
    it('should correctly identify customer user type', async () => {
      // Given a customer TicketManager
      const ticketManager = new TicketManager(mockCustomer, ticketStore);

      // When performing customer operations
      const ticket = await ticketManager.createTicket('Test problem');

      // Then it should succeed
      expect(ticket).toBeDefined();
      expect(ticket.createdBy).toEqual(mockCustomer);
    });

    it('should correctly identify engineer user type', async () => {
      // Given an engineer TicketManager and a ticket to claim
      const ticketManager = new TicketManager(mockEngineer, ticketStore);
      const unassignedTicket = {
        id: 'TKT-999',
        status: 'waiting' as const,
        summary: 'Test ticket',
        estimatedTime: '5-10 min',
        problemDescription: 'Test problem',
        createdBy: mockCustomer,
        createdAt: new Date(),
        elapsedTime: 0
      };
      ticketStore.create(unassignedTicket);

      // When performing engineer operations (claiming a ticket)
      const claimedTicket = await ticketManager.claimTicket('TKT-999');

      // Then it should succeed
      expect(claimedTicket).toBeDefined();
      expect(claimedTicket.assignedTo).toEqual(mockEngineer);
    });
  });
});