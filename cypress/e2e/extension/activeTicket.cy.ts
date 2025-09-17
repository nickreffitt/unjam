describe('Extension - Active Ticket States', () => {
  beforeEach(() => {
    // Clear localStorage before each test to ensure clean state
    cy.window().then((win) => {
      win.localStorage.clear();
    });

    cy.visit('/ext');

    // Create a ticket with "Help me" for every test
    cy.contains('button', 'Create New Ticket').click();
    cy.get('textarea[placeholder="Please describe the problem you\'re experiencing..."]').type('Help me');
    cy.contains('button', 'Create Ticket').click();

    // Verify TicketBox is visible
    cy.get('.unjam-fixed.unjam-bottom-4.unjam-right-4').should('be.visible');
  });

  it('displays timer starting at 0:00 and increments after 1 second', () => {
    // given the TicketBox displays "Waiting for engineer..."
    cy.contains('Waiting for engineer...').should('be.visible');

    // when the box is first presented to the user it starts at "0:00"
    cy.contains('0:00').should('be.visible');

    // then after 1 second it counts up a second and displays "0:01"
    cy.wait(1000);
    cy.contains('0:01').should('be.visible');
  });

  it('resets timer and shows engineer name when assigned', () => {
    // given displaying "Waiting for engineer..."
    cy.contains('Waiting for engineer...').should('be.visible');

    // Let timer run for a bit to ensure it resets
    cy.wait(2000);
    cy.contains('0:02').should('be.visible');

    // when tapping the debug control "Set to In Progress (John)"
    cy.contains('button', 'Set to In Progress (John)').click();

    // then timer starts at 0:00 again and there is text that reads "John is working on your issue"
    cy.contains('0:00').should('be.visible');
    cy.contains('John is working on your issue').should('be.visible');

    // and after 1 second it counts up a second and displays "0:01"
    cy.wait(1000);
    cy.contains('0:01').should('be.visible');
  });

  it('shows active ticket again when reopened after closing', () => {
    // given tapping Set to In Progress (John)
    cy.contains('button', 'Set to In Progress (John)').click();
    cy.contains('John is working on your issue').should('be.visible');

    // when tapping x to close the TicketBox
    cy.get('.unjam-fixed.unjam-bottom-4.unjam-right-4').within(() => {
      cy.get('button').first().click(); // Click the first button which is the close button
    });
    cy.get('.unjam-fixed.unjam-bottom-4.unjam-right-4').should('not.exist');

    // then tap "Show Active Ticket" and the TicketBox appears again with "John is working on your issue" text displayed
    cy.contains('button', 'Show Active Ticket').click();
    cy.get('.unjam-fixed.unjam-bottom-4.unjam-right-4').should('be.visible');
    cy.contains('John is working on your issue').should('be.visible');
  });

  it('marks ticket as fixed and changes button to Create New Ticket', () => {
    // given tapping Set to In Progress (John)
    cy.contains('button', 'Set to In Progress (John)').click();
    cy.contains('John is working on your issue').should('be.visible');

    // when tapping "This is fixed"
    cy.contains('button', 'This is fixed').click();

    // then the ticket displays "Rate your experience" text and the button changes from "Show Active Ticket" to "Create New Ticket"
    cy.contains('Rate your experience').should('be.visible');
    cy.contains('button', 'Create New Ticket').should('be.visible');
    cy.contains('button', 'Show Active Ticket').should('not.exist');
  });

  it('shows confirmation prompt when marked as resolved', () => {
    // given tapping Set to In Progress (John)
    cy.contains('button', 'Set to In Progress (John)').click();
    cy.contains('John is working on your issue').should('be.visible');

    // when tapping "Set to Awaiting Confirmation"
    cy.contains('button', 'Set to Awaiting Confirmation').click();

    // then the text "Issue resolved! Please confirm" is displayed
    cy.contains('Issue resolved! Please confirm').should('be.visible');
  });

  it('confirms resolved ticket and shows rating', () => {
    // given tapping Set to In Progress (John)
    cy.contains('button', 'Set to In Progress (John)').click();
    cy.contains('John is working on your issue').should('be.visible');

    // when tapping "Set to Awaiting Confirmation" and tapping "Yes, it's fixed!"
    cy.contains('button', 'Set to Awaiting Confirmation').click();
    cy.contains('button', "Yes, it's fixed!").click();

    // then the text "Rate your experience" is displayed and the button changes from "Show Active Ticket" to "Create New Ticket"
    cy.contains('Rate your experience').should('be.visible');
    cy.contains('button', 'Create New Ticket').should('be.visible');
    cy.contains('button', 'Show Active Ticket').should('not.exist');
  });
});