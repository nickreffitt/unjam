describe('Debug Authentication', () => {
  it('should load the dashboard page', () => {
    // Visit page first to set up the window object
    cy.visit('/app');

    // Use local auth for testing
    cy.useLocalAuth();

    // Set up fake authenticated user for testing
    cy.createFakeAuthenticatedUser(
      { email: 'engineer@test.com' },
      { name: 'Test Engineer', type: 'engineer' }
    );

    // Reload the page to pick up the new authentication state
    cy.reload();

    // Wait for page to load
    cy.wait(5000);

    // Check what's actually on the page
    cy.get('body').then(($body) => {
      const bodyText = $body.text();
      cy.log('Page body text:', bodyText);

      // Check for common loading or error states
      if (bodyText.includes('Loading')) {
        cy.log('Page is in loading state');
      } else if (bodyText.includes('Error')) {
        cy.log('Page has an error');
      } else if (bodyText.includes('Engineer Dashboard')) {
        cy.log('Dashboard loaded successfully');
      } else if (bodyText.includes('Sign In') || bodyText.includes('Magic Link')) {
        cy.log('Page is showing authentication form');
      } else {
        cy.log('Unknown page state');
      }
    });

    // Also check for console errors
    cy.window().then((win) => {
      cy.log('Console logs available in browser DevTools');
    });
  });
});