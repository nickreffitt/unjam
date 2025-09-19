describe('Extension - Chat Functionality', () => {
  beforeEach(() => {
    // Clear localStorage before each test to ensure clean state
    cy.window().then((win) => {
      win.localStorage.clear();
    });

    cy.visit('/ext');
  });

  it('auto-opens chat when ticket is set to in-progress and allows messaging', () => {
    // given tapping Create New Ticket, entering in "Help me" to the text box, tapping Create Ticket
    cy.contains('button', 'Create New Ticket').click();
    cy.get('textarea[placeholder="Please describe the problem you\'re experiencing..."]').type('Help me');
    cy.contains('button', 'Create Ticket').click();

    // verify ticket is created and debug controls are visible
    cy.contains('h3', 'Debug Controls').should('be.visible');
    cy.contains('button', 'Set to In Progress (John)').should('be.visible');

    // verify chat is not visible initially
    cy.get('[data-testid="chat-box"]').should('not.exist');

    // when tapping "Set In Progress (John)" in the debug controls
    cy.contains('button', 'Set to In Progress (John)').click();

    // then the button in the ticket box should be set to "Hide Chat"
    cy.contains('button', 'Hide Chat').should('be.visible');

    // and a chat box appears
    cy.get('[data-testid="chat-box"]').should('be.visible');
    cy.get('[data-testid="chat-header"]').should('exist');

    // and I can type a message to the engineer
    cy.get('[data-testid="chat-input"]').should('be.visible');
    cy.get('[data-testid="chat-input"]').type('Hello engineer, I need help!');
    cy.get('[data-testid="chat-send-button"]').click();

    // verify message appears in chat
    cy.contains('Hello engineer, I need help!').should('be.visible');
    cy.contains('You').should('be.visible'); // Customer message shows "You"
  });

  it('allows manual toggle of chat visibility when ticket is in-progress', () => {
    // given ticket is created and set to in-progress
    cy.contains('button', 'Create New Ticket').click();
    cy.get('textarea[placeholder="Please describe the problem you\'re experiencing..."]').type('Help me');
    cy.contains('button', 'Create Ticket').click();
    cy.contains('button', 'Set to In Progress (John)').click();

    // verify chat is visible and button shows "Hide Chat"
    cy.get('[data-testid="chat-box"]').should('be.visible');
    cy.contains('button', 'Hide Chat').should('be.visible');

    // when clicking "Hide Chat"
    cy.contains('button', 'Hide Chat').click();

    // then chat disappears and button shows "Show Chat"
    cy.get('[data-testid="chat-box"]').should('not.exist');
    cy.contains('button', 'Show Chat').should('be.visible');

    // when clicking "Show Chat"
    cy.contains('button', 'Show Chat').click();

    // then chat reappears and button shows "Hide Chat"
    cy.get('[data-testid="chat-box"]').should('be.visible');
    cy.contains('button', 'Hide Chat').should('be.visible');
  });

  it('does not auto-open chat for non-in-progress ticket statuses', () => {
    // given ticket is created
    cy.contains('button', 'Create New Ticket').click();
    cy.get('textarea[placeholder="Please describe the problem you\'re experiencing..."]').type('Help me');
    cy.contains('button', 'Create Ticket').click();

    // verify debug controls are visible
    cy.contains('h3', 'Debug Controls').should('be.visible');

    // when setting ticket to "Waiting" status
    cy.contains('button', 'Set to Waiting').click();

    // then chat should not be visible
    cy.get('[data-testid="chat-box"]').should('not.exist');

    // when setting ticket to "Awaiting Confirmation" status
    cy.contains('button', 'Set to Awaiting Confirmation').click();

    // then chat should still not be visible
    cy.get('[data-testid="chat-box"]').should('not.exist');

    // when setting ticket to "Completed" status
    cy.contains('button', 'Set to Completed').click();

    // then chat should still not be visible
    cy.get('[data-testid="chat-box"]').should('not.exist');
  });

  it('respects user manual toggle preference over auto-open behavior', () => {
    // given ticket is created and set to in-progress (auto-opens chat)
    cy.contains('button', 'Create New Ticket').click();
    cy.get('textarea[placeholder="Please describe the problem you\'re experiencing..."]').type('Help me');
    cy.contains('button', 'Create Ticket').click();
    cy.contains('button', 'Set to In Progress (John)').click();

    // verify chat auto-opened
    cy.get('[data-testid="chat-box"]').should('be.visible');

    // when user manually hides chat
    cy.contains('button', 'Hide Chat').click();
    cy.get('[data-testid="chat-box"]').should('not.exist');

    // when ticket status changes to waiting then back to in-progress
    cy.contains('button', 'Set to Waiting').click();
    cy.contains('button', 'Set to In Progress (John)').click();

    // then chat should remain hidden (respecting user preference)
    cy.get('[data-testid="chat-box"]').should('not.exist');
    cy.contains('button', 'Show Chat').should('be.visible');
  });

  it('allows sending random engineer messages for testing', () => {
    // given ticket is in-progress with chat visible
    cy.contains('button', 'Create New Ticket').click();
    cy.get('textarea[placeholder="Please describe the problem you\'re experiencing..."]').type('Help me');
    cy.contains('button', 'Create Ticket').click();
    cy.contains('button', 'Set to In Progress (John)').click();

    // verify chat is visible and debug button appears
    cy.get('[data-testid="chat-box"]').should('be.visible');
    cy.contains('button', 'Send Random Engineer Message').should('be.visible');

    // when clicking the debug button to send engineer message
    cy.contains('button', 'Send Random Engineer Message').click();

    // then engineer message should appear in chat
    // Note: We can't predict the exact message content since it's random,
    // but we can verify that John's name appears in the receiver message bubble
    cy.get('.unjam-message-bubble-receiver').should('contain', 'John');
  });

  it('displays customer messages in sender message bubble', () => {
    // given ticket is in-progress with chat visible
    cy.contains('button', 'Create New Ticket').click();
    cy.get('textarea[placeholder="Please describe the problem you\'re experiencing..."]').type('Help me');
    cy.contains('button', 'Create Ticket').click();
    cy.contains('button', 'Set to In Progress (John)').click();

    // verify chat is visible
    cy.get('[data-testid="chat-box"]').should('be.visible');

    // when typing and sending a customer message
    const testMessage = 'This is my test message to the engineer';
    cy.get('[data-testid="chat-input"]').type(testMessage);
    cy.get('[data-testid="chat-send-button"]').click();

    // then customer message should appear in the sender message bubble
    cy.get('.unjam-message-bubble-sender').should('contain', testMessage);
    cy.get('.unjam-message-bubble-sender').should('contain', 'You');
  });

  it('converts URLs to clickable links in messages', () => {
    // given ticket is in-progress with chat visible
    cy.contains('button', 'Create New Ticket').click();
    cy.get('textarea[placeholder="Please describe the problem you\'re experiencing..."]').type('Help me');
    cy.contains('button', 'Create Ticket').click();
    cy.contains('button', 'Set to In Progress (John)').click();

    // verify chat is visible
    cy.get('[data-testid="chat-box"]').should('be.visible');

    // when typing and sending a message with a URL
    const urlMessage = 'Please check this link: https://google.com';
    cy.get('[data-testid="chat-input"]').type(urlMessage);
    cy.get('[data-testid="chat-send-button"]').click();

    // then the URL should be converted to a clickable link within the sender message bubble
    cy.get('.unjam-message-bubble-sender').within(() => {
      cy.get('a[href="https://google.com"]').should('exist');
      cy.get('a[href="https://google.com"]').should('contain', 'https://google.com');
    });
  });

  it('displays typing indicator when engineer is typing', () => {
    // given ticket is in-progress with chat visible
    cy.contains('button', 'Create New Ticket').click();
    cy.get('textarea[placeholder="Please describe the problem you\'re experiencing..."]').type('Help me');
    cy.contains('button', 'Create Ticket').click();
    cy.contains('button', 'Set to In Progress (John)').click();

    // verify chat is visible and debug button appears
    cy.get('[data-testid="chat-box"]').should('be.visible');
    cy.contains('button', 'Trigger Engineer Typing').should('be.visible');

    // verify typing indicator is not initially visible
    cy.get('[data-testid="typing-indicator"]').should('not.exist');

    // when clicking the debug button to trigger engineer typing
    cy.contains('button', 'Trigger Engineer Typing').click();

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
});