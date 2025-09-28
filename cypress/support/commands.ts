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
  profileId?: string;
  authId?: string;
  name?: string;
  type?: 'customer' | 'engineer';
  email?: string;
  githubUsername?: string;
}

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Creates a fake authenticated user in localStorage for testing
       * This bypasses the authentication flow and directly sets up an authenticated state
       *
       * @param userOptions - Optional user properties to override defaults
       * @param profileOptions - Optional profile properties to override defaults
       *
       * @example
       * cy.createFakeAuthenticatedUser()
       *
       * @example
       * cy.createFakeAuthenticatedUser(
       *   { email: 'test@example.com' },
       *   { name: 'Test Engineer', type: 'engineer' }
       * )
       */
      createFakeAuthenticatedUser(
        userOptions?: FakeUserOptions,
        profileOptions?: FakeUserProfileOptions
      ): Chainable<void>;

      /**
       * Clears all authentication data from localStorage
       * Useful for ensuring a clean slate before tests
       */
      clearAuthData(): Chainable<void>;

      /**
       * Sets the environment to use local storage auth instead of Supabase
       * Should be called before visiting pages that initialize auth
       */
      useLocalAuth(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('createFakeAuthenticatedUser', (userOptions = {}, profileOptions = {}) => {
  const defaultUser = {
    id: 'cypress-user-' + Date.now(),
    email: 'cypress.user@example.com',
    createdAt: new Date(),
    ...userOptions
  };

  const defaultProfile = {
    profileId: 'cypress-profile-' + Date.now(),
    authId: defaultUser.id,
    name: 'Cypress Test User',
    type: 'engineer' as const,
    email: defaultUser.email,
    githubUsername: 'cypress-user',
    ...profileOptions
  };

  // Set up localStorage entries
  cy.window().then((win) => {
    // Set the authenticated user
    win.localStorage.setItem('authUserStore-currentUser', JSON.stringify(defaultUser));

    // Set the user profile
    win.localStorage.setItem('authProfileStore-profiles', JSON.stringify([defaultProfile]));

    // Log what we've set up
    cy.log('Created fake authenticated user:', defaultUser.email);
    cy.log('Created fake user profile:', defaultProfile.name);
  });
});

Cypress.Commands.add('clearAuthData', () => {
  cy.window().then((win) => {
    // Clear all auth-related localStorage entries
    win.localStorage.removeItem('authUserStore-currentUser');
    win.localStorage.removeItem('authProfileStore-profiles');

    // Clear any auth events
    win.localStorage.removeItem('authUserStore-events');
    win.localStorage.removeItem('authEventStore-events');

    cy.log('Cleared all authentication data');
  });
});

Cypress.Commands.add('useLocalAuth', () => {
  // Set environment variable to use local storage auth
  cy.window().then((win) => {
    // We can't actually set import.meta.env at runtime, but we can set a flag
    // that the AuthManagerContext can check
    (win as any).CYPRESS_USE_LOCAL_AUTH = true;
    cy.log('Set flag to use local storage auth');
  });
});

export {};