describe('Dashboard - Chat Functionality', () => {
  beforeEach(() => {
    // Set a larger viewport to ensure all elements are visible
    cy.viewport(1400, 900);

    // Clear localStorage before each test to ensure clean state
    cy.window().then((win) => {
      win.localStorage.clear();

      // Seed test data with one ticket
      const testTicket = {
        id: 'TKT-TEST-001',
        status: 'waiting',
        summary: 'Test chat ticket',
        estimatedTime: '5-10 min',
        problemDescription: 'Test problem for chat functionality',
        createdBy: {
          id: 'CUST-TEST-001',
          name: 'Test Customer',
          type: 'customer',
          email: 'customer@test.com'
        },
        createdAt: new Date().toISOString(),
        elapsedTime: 0
      };

      win.localStorage.setItem('ticketStore-tickets', JSON.stringify([testTicket]));
    });

    // Navigate to dashboard and claim the ticket
    cy.visit('/app');
    cy.contains('New Tickets').click();
    cy.wait(1000); // Wait for tickets to load
    cy.contains('button', 'Claim').click();
    cy.wait(2000); // Wait for navigation and ticket update

    // Verify we're on the active ticket page
    cy.url().should('include', '/active/');
  });

  it('displays chat box for active ticket and allows messaging', () => {
    // given ticket is claimed and active
    cy.contains('Ticket Details').should('be.visible');
    cy.contains('In Progress').should('be.visible');

    // then chat box should be visible
    cy.get('[data-testid="chat-input"]').should('be.visible');

    // when typing and sending a message
    const testMessage = 'Hello customer, I can help you with this issue';
    cy.get('[data-testid="chat-input"]').type(testMessage);
    cy.get('[data-testid="chat-send-button"]').click();

    // then engineer message should appear in chat
    cy.contains(testMessage).should('be.visible');
    cy.contains('You').should('be.visible'); // Engineer message shows "You"
  });

  it('allows sending random customer messages for testing', () => {
    // given ticket is active with chat visible
    cy.contains('In Progress').should('be.visible');

    // when clicking the debug button to send random customer message
    cy.contains('button', 'Random Message').click();

    // then customer message should appear in chat
    // Note: We can't predict the exact message content since it's random,
    // but we can verify that Test Customer's name appears in the receiver message bubble
    cy.get('.unjam-message-bubble-receiver').should('contain', 'Test Customer');
  });

  it('displays customer typing indicator when triggered', () => {
    // given ticket is active with chat visible
    cy.contains('In Progress').should('be.visible');
    cy.contains('button', 'Trigger Typing').should('be.visible');

    // verify typing indicator is not initially visible
    cy.get('[data-testid="typing-indicator"]').should('not.exist');

    // when clicking the debug button to trigger customer typing
    cy.contains('button', 'Trigger Typing').click();

    // then typing indicator should appear in chat
    cy.get('[data-testid="typing-indicator"]').should('be.visible');

    // verify the typing indicator has animated dots
    cy.get('[data-testid="typing-indicator"]').within(() => {
      // Check for three animated dots
      cy.get('.unjam-animate-pulse').should('have.length', 3);
    });

    // typing indicator should disappear after 6 seconds
    cy.wait(6100); // Wait slightly more than 6 seconds
    cy.get('[data-testid="typing-indicator"]').should('not.exist');
  });

  it('displays engineer messages in sender message bubble', () => {
    // given ticket is active with chat visible
    cy.contains('In Progress').should('be.visible');

    // when typing and sending an engineer message
    const testMessage = 'Let me check this issue for you';
    cy.get('[data-testid="chat-input"]').type(testMessage);
    cy.get('[data-testid="chat-send-button"]').click();

    // then engineer message should appear in the sender message bubble
    cy.get('.unjam-message-bubble-sender').should('contain', testMessage);
    cy.get('.unjam-message-bubble-sender').should('contain', 'You');
  });

  it('converts URLs to clickable links in messages', () => {
    // given ticket is active with chat visible
    cy.contains('In Progress').should('be.visible');

    // when typing and sending a message with a URL
    const urlMessage = 'Please check this documentation: https://docs.example.com';
    cy.get('[data-testid="chat-input"]').type(urlMessage);
    cy.get('[data-testid="chat-send-button"]').click();

    // then the URL should be converted to a clickable link within the sender message bubble
    cy.get('.unjam-message-bubble-sender').within(() => {
      cy.get('a[href="https://docs.example.com"]').should('exist');
      cy.get('a[href="https://docs.example.com"]').should('contain', 'https://docs.example.com');
    });
  });

  it('shows debug controls for chat functionality when ticket is in-progress', () => {
    // given ticket is active
    cy.contains('In Progress').should('be.visible');

    // then debug controls should be visible
    cy.contains('button', 'Random Message').should('be.visible');
    cy.contains('button', 'Trigger Typing').should('be.visible');

    // verify button tooltips
    cy.get('button[title="Send random customer message (for testing)"]').should('exist');
    cy.get('button[title="Trigger customer typing indicator (for testing)"]').should('exist');
  });

  it('hides chat debug controls when ticket is in awaiting-confirmation state', () => {
    // given ticket is active
    cy.contains('In Progress').should('be.visible');
    cy.contains('button', 'Random Message').should('be.visible');

    // when marking ticket as fixed
    cy.contains('button', 'Mark as fixed').click();
    cy.contains('Waiting for customer confirmation').should('be.visible');

    // then chat debug controls should not be visible
    cy.contains('button', 'Random Message').should('not.exist');
    cy.contains('button', 'Trigger Typing').should('not.exist');

    // but other debug controls should be visible
    cy.contains('button', 'Customer Confirms').should('be.visible');
    cy.contains('button', 'Timer Expires').should('be.visible');
  });
});