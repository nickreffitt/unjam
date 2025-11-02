// Custom Cypress commands for the tickets-realtime application

/**
 * Interface for fake user creation options
 */
interface FakeUserOptions {
  id?: string;
  email?: string;
  createdAt?: Date;
}

/**
 * Interface for fake user profile creation options
 */
interface FakeUserProfileOptions {
  authId?: string;
  name?: string;
  type?: 'customer' | 'engineer';
  email?: string;
  githubUsername?: string;
}

declare global {
  namespace Cypress {
    interface Chainable {
      loginFakeUser(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginFakeUser', () => {
    // Visit the app root, which will redirect to auth (VITE_USE_LOCAL_AUTH=true is set in .env)
    cy.visit('/');

    // Complete the engineer sign-up flow
    // 1. Enter test engineer's email
    cy.get('#email', { timeout: 10000 }).should('be.visible').type('engineer@test.com');

    // 2. Click "Send magic link"
    cy.contains('button', 'Send magic link').click();

    // 3. Should redirect to Complete Your Profile page
    cy.contains('Complete Your Profile', { timeout: 10000 }).should('be.visible');

    // 4. Select "Engineer" radio button
    cy.get('input[value="engineer"]').click();
    cy.wait(500); // Wait for form to update

    // 5. Enter fake full name
    cy.get('#name').type('Test Engineer');

    // 6. Enter fake github username
    cy.get('#githubUsername').should('be.visible').type('testengineer');

    // 7. Click "Complete Profile"
    cy.contains('button', 'Complete Profile').click();

    // Wait for profile creation success and redirect
    cy.url({ timeout: 15000 }).should('include', '/new');
});

export {};