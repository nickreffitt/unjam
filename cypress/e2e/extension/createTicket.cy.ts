describe('Extension - Create New Ticket', () => {
  beforeEach(() => {
    // Clear localStorage before each test to ensure clean state
    cy.window().then((win) => {
      win.localStorage.clear();
    });

    cy.visit('/ext');
  });

  it('displays TicketModal when "Create New Ticket" button is clicked', () => {
    // given given the page loads
    cy.contains('button', 'Create New Ticket').should('be.visible');

    // when button clicked
    cy.contains('button', 'Create New Ticket').click();

    // TicketModal is displayed
    cy.contains('h2', 'Create New Ticket').should('be.visible');
    cy.get('textarea[placeholder="Please describe the problem you\'re experiencing..."]').should('be.visible');
    cy.contains('button', 'Create Ticket').should('be.visible');
    cy.contains('button', 'Cancel').should('be.visible');
  });

  it('enables Create Ticket button when text is entered', () => {
    // given tapping Create New Ticket, the modal appears and the Create Ticket button is disabled
    cy.contains('button', 'Create New Ticket').click();
    cy.contains('button', 'Create Ticket').should('be.disabled');

    // when entering into the text box the following "Help me"
    cy.get('textarea[placeholder="Please describe the problem you\'re experiencing..."]').type('Help me');

    // then check the Create Ticket button is enabled so it can be tapped by the user
    cy.contains('button', 'Create Ticket').should('be.enabled');
  });

  it('displays TicketBox with waiting status after creating ticket', () => {
    // given tapping create ticket, adding to the text box "Help me"
    cy.contains('button', 'Create New Ticket').click();
    cy.get('textarea[placeholder="Please describe the problem you\'re experiencing..."]').type('Help me');

    // when tapping Create Ticket
    cy.contains('button', 'Create Ticket').click();

    // then the TicketBox appears in the bottom right of the screen with the text "Waiting for engineer..." displayed
    cy.get('.unjam-fixed.unjam-bottom-4.unjam-right-4').should('be.visible');
    cy.contains('Waiting for engineer...').should('be.visible');
  });

  it('closes modal when X button is clicked', () => {
    // given tapping Create New Ticket and the modal displays
    cy.contains('button', 'Create New Ticket').click();
    cy.contains('h2', 'Create New Ticket').should('be.visible');

    // when tapping the x button in the top right of the modal
    cy.get('button').contains('×').click();

    // then the modal disappears and the button's text is still Create New Ticket
    cy.contains('h2', 'Create New Ticket').should('not.exist');
    cy.contains('button', 'Create New Ticket').should('be.visible');
  });

  it('closes modal when Cancel button is clicked', () => {
    // given tapping Create New Ticket and the modal displays
    cy.contains('button', 'Create New Ticket').click();
    cy.contains('h2', 'Create New Ticket').should('be.visible');

    // when tapping the Cancel button in the modal
    cy.contains('button', 'Cancel').click();

    // then the modal disappears and the button's text is still Create New Ticket
    cy.contains('h2', 'Create New Ticket').should('not.exist');
    cy.contains('button', 'Create New Ticket').should('be.visible');
  });

  it('changes button to Show Active Ticket after creating ticket', () => {
    // given tapping Create New Ticket, entering "Help me" in the text box
    cy.contains('button', 'Create New Ticket').click();
    cy.get('textarea[placeholder="Please describe the problem you\'re experiencing..."]').type('Help me');

    // when tapping Create Ticket
    cy.contains('button', 'Create Ticket').click();

    // then the button changes from "Create New Ticket" to "Show Active Ticket",
    // and tapping that does NOT display the TicketModal
    cy.contains('button', 'Show Active Ticket').should('be.visible');
    cy.contains('button', 'Create New Ticket').should('not.exist');

    cy.contains('button', 'Show Active Ticket').click();
    cy.contains('h2', 'Create New Ticket').should('not.exist');
    // Verify the TicketBox is shown instead
    cy.get('.unjam-fixed.unjam-bottom-4.unjam-right-4').should('be.visible');
  });
});