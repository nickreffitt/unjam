describe('Dashboard - Individual Ticket Pages', () => {
  beforeEach(() => {
    // Clear localStorage before each test to ensure clean state
    cy.window().then((win) => {
      win.localStorage.clear();

      // Seed test data directly into localStorage
      const testTickets = [
        {
          id: 'TKT-TEST-001',
          status: 'waiting',
          summary: 'Test ticket 1',
          estimatedTime: '5-10 min',
          problemDescription: 'Test problem description 1',
          createdBy: {
            id: 'CUST-TEST-001',
            name: 'Test Customer',
            type: 'customer',
            email: 'customer@test.com'
          },
          createdAt: new Date().toISOString(),
          elapsedTime: 0
        },
        {
          id: 'TKT-TEST-002',
          status: 'waiting',
          summary: 'Test ticket 2',
          estimatedTime: '10-15 min',
          problemDescription: 'Test problem description 2',
          createdBy: {
            id: 'CUST-TEST-002',
            name: 'Test Customer 2',
            type: 'customer',
            email: 'customer2@test.com'
          },
          createdAt: new Date(Date.now() - 60000).toISOString(),
          elapsedTime: 60
        },
        {
          id: 'TKT-TEST-003',
          status: 'waiting',
          summary: 'Test ticket 3',
          estimatedTime: '15-20 min',
          problemDescription: 'Test problem description 3',
          createdBy: {
            id: 'CUST-TEST-003',
            name: 'Test Customer 3',
            type: 'customer',
            email: 'customer3@test.com'
          },
          createdAt: new Date(Date.now() - 120000).toISOString(),
          elapsedTime: 120,
          abandonedAt: new Date(Date.now() - 30000).toISOString()
        }
      ];

      win.localStorage.setItem('ticketStore-tickets', JSON.stringify(testTickets));
    });

    // Navigate to dashboard
    cy.visit('/app');

    // Navigate to New Tickets and wait for data to load
    cy.contains('New Tickets').click();
    cy.wait(1000); // Wait for tickets to load from localStorage
  });

  it('shows ticket preview when preview icon is tapped from new tickets list', () => {
    // given on the new tickets list (already navigated in beforeEach)

    // when tapping the preview icon
    cy.get('[title="View details"]').first().click();

    // then the preview of the ticket is shown with status "waiting"
    cy.contains('Ticket Details').should('be.visible');
    cy.contains('waiting').should('be.visible');
  });

  it('shows active ticket view when claim button is tapped from new tickets list', () => {
    // given on the new tickets list (already navigated in beforeEach)

    // when tapping the "Claim" button on a ticket
    cy.contains('button', 'Claim').first().click();

    // then it shows the single ticket view in active state
    cy.contains('Ticket Details').should('be.visible');
    cy.contains('In Progress').should('be.visible');
  });

  it('shows active ticket view when claim this ticket button is tapped from preview', () => {
    // given on the ticket preview page with status "waiting" (already on New Tickets from beforeEach)
    cy.get('[title="View details"]').first().click();
    cy.contains('waiting').should('be.visible');

    // when tapping the "Claim This Ticket" button
    cy.contains('button', 'Claim This Ticket').click();

    // then it shows the single ticket view in active state
    cy.contains('Ticket Details').should('be.visible');
    cy.contains('In Progress').should('be.visible');
  });

  it('shows active ticket view when message icon is tapped from active tickets list', () => {
    // given on the active tickets list (first create an active ticket from New Tickets)
    cy.contains('button', 'Claim').first().click();
    cy.wait(1000); // Wait for navigation and ticket update
    cy.contains('Active Tickets').click();
    cy.wait(1000); // Wait for active tickets page to load and refresh

    // when tapping the message icon (find the link with the message icon)
    cy.get('a.unjam-text-orange-600').first().click();

    // then it displays the single ticket view in active state
    cy.contains('Ticket Details').should('be.visible');
    cy.contains('In Progress').should('be.visible');
  });

  it('goes to awaiting confirmation state when mark as fixed is tapped', () => {
    // given in the active ticket view (create active ticket from New Tickets)
    cy.contains('button', 'Claim').first().click();

    // when tapping the button "Mark as fixed"
    cy.contains('button', 'Mark as fixed').click();

    // then it goes into awaiting confirmation state
    cy.contains('Waiting for customer confirmation').should('be.visible');
  });

  it('goes to completed state when customer confirms after marking as fixed', () => {
    // given in the active ticket view and tapping "Mark as fixed" (from New Tickets)
    cy.contains('button', 'Claim').first().click();
    cy.contains('button', 'Mark as fixed').click();
    cy.contains('Waiting for customer confirmation').should('be.visible');

    // when tapping the debug button "customer confirms"
    cy.contains('button', 'Customer Confirms').click();

    // then the ticket goes into completed state
    cy.contains('Completed').should('be.visible');
  });

  it('goes to auto-completed state when timer expires after marking as fixed', () => {
    // given in the active ticket view and tapping "Mark as fixed" (from New Tickets)
    cy.contains('button', 'Claim').first().click();
    cy.contains('button', 'Mark as fixed').click();
    cy.contains('Waiting for customer confirmation').should('be.visible');

    // when tapping the debug button "auto complete timer expires"
    cy.contains('button', 'Timer Expires').click();

    // then the ticket goes to status "Auto Completed"
    cy.contains('Auto Completed').should('be.visible');
  });

  it('goes back to new tickets table when abandon task is tapped', () => {
    // given in the active ticket view (from New Tickets)
    cy.contains('button', 'Claim').first().click();
    cy.contains('Ticket Details').should('be.visible');

    // when tapping the button "Abandon task"
    cy.contains('button', 'Abandon task').click();
    // Handle the confirm dialog
    cy.on('window:confirm', () => true);

    // then goes back to new tickets table
    cy.url().should('include', '/new');
    cy.contains('New Tickets').should('be.visible');
  });
});