describe('ScreenShare Feature', () => {
  beforeEach(() => {
    // Clear localStorage before each test to ensure clean state
    cy.clearLocalStorage();
    cy.visit('/screenshare');
  });

  it('displays ScreenShare Request modal when "Request Screenshare" button is clicked', () => {
    // given the page loads
    cy.contains('h1', 'ScreenShare Demo').should('be.visible');
    cy.contains('h2', 'Customer Controls').should('be.visible');
    cy.contains('h2', 'Engineer Debug Controls').should('be.visible');

    // when tapping "Request Screenshare"
    cy.contains('button', 'Request Screenshare').click();

    // then the Screenshare Request modal appears with Accept and Reject buttons
    cy.contains('h3', 'Screenshare Request', { timeout: 3000 }).should('be.visible');
    cy.contains('button', 'Accept').should('be.visible');
    cy.contains('button', 'Reject').should('be.visible');

    // verify the modal text content
    cy.contains('is requesting to view your screen').should('be.visible');
  });

  it('closes the modal when Accept button is clicked', () => {
    // given the page loads and request is made
    cy.contains('button', 'Request Screenshare').click();
    cy.contains('h3', 'Screenshare Request', { timeout: 3000 }).should('be.visible');

    // when clicking Accept
    cy.contains('button', 'Accept').click();

    // then the modal should close
    cy.contains('h3', 'Screenshare Request').should('not.exist');
  });

  it('closes the modal when Reject button is clicked', () => {
    // given the page loads and request is made
    cy.contains('button', 'Request Screenshare').click();
    cy.contains('h3', 'Screenshare Request', { timeout: 3000 }).should('be.visible');

    // when clicking Reject
    cy.contains('button', 'Reject').click();

    // then the modal should close
    cy.contains('h3', 'Screenshare Request').should('not.exist');
  });

  it('shows customer call panel when "Start Screenshare" is clicked', () => {
    // given the page loads
    cy.contains('button', 'Start Screenshare').should('be.visible');

    // when clicking Start Screenshare
    cy.contains('button', 'Start Screenshare').click();

    // then the engineer should see incoming call panel
    cy.contains('h3', 'Incoming Call from', { timeout: 3000 }).should('be.visible');
    cy.contains('button', 'Accept').should('be.visible');
    cy.contains('button', 'Reject').should('be.visible');
  });

  it('changes button from "Start Screenshare" to "Stop Screenshare" when active', () => {
    // given the page loads
    cy.contains('button', 'Start Screenshare').should('be.visible');

    // when starting a screenshare and engineer accepts
    cy.contains('button', 'Start Screenshare').click();

    // wait for incoming call panel and accept it
    cy.contains('h3', 'Incoming Call from', { timeout: 3000 }).should('be.visible');
    cy.get('.unjam-bg-blue-50').within(() => {
      cy.contains('button', 'Accept').click();
    });

    // then the button should change to "Stop Screenshare"
    cy.contains('button', 'Stop Screenshare', { timeout: 3000 }).should('be.visible');
    cy.contains('button', 'Start Screenshare').should('not.exist');
  });

  it('shows debug information panel with correct states', () => {
    // given the page loads
    cy.contains('h2', 'Debug Information').should('be.visible');

    // then verify initial states
    cy.contains('WebRTC State:').parent().should('contain', 'initializing');
    cy.contains('Active Request:').parent().should('contain', 'None');
    cy.contains('Active Session:').parent().should('contain', 'None');
    cy.contains('Local Stream:').parent().should('contain', 'None');
    cy.contains('Remote Stream:').parent().should('contain', 'None');
    cy.contains('Call Active:').parent().should('contain', 'No');
  });
});