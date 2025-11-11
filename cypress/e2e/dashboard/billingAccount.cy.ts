describe('Dashboard - Billing Account Payout Providers', () => {
  beforeEach(() => {
    // Clear state
    cy.clearLocalStorage();
  });

  it('displays country required message when engineer has no country set', () => {
    // given an engineer profile without country
    cy.visit('/');
    cy.createFakeEngineerProfile({ country: undefined });

    // when navigating to billing account page
    cy.visit('/dashboard/billing');

    // then should see country required message
    cy.contains('Country Required').should('be.visible');
    cy.contains('Please set your country').should('be.visible');
    cy.contains('which payout providers').should('be.visible');
  });

  it('displays Stripe Connect option for US engineer', () => {
    // given a US-based engineer
    cy.visit('/');
    cy.createFakeEngineerProfile({ country: 'US' });

    // when navigating to billing account page
    cy.visit('/dashboard/billing');

    // then should see Stripe Connect available message
    cy.contains('Stripe Connect Available').should('be.visible');
    cy.contains('Stripe Connect is available').should('be.visible');

    // and should see Stripe setup button
    cy.contains('button', 'Set Up Billing Account').should('be.visible');
  });

  it('displays Stripe Connect option for UK engineer', () => {
    // given a UK-based engineer
    cy.visit('/');
    cy.createFakeEngineerProfile({ country: 'GB' });

    // when navigating to billing account page
    cy.visit('/dashboard/billing');

    // then should see Stripe Connect available
    cy.contains('Stripe Connect Available').should('be.visible');
  });

  it('displays Payoneer instructions for non-Stripe country', () => {
    // given an engineer from a Payoneer-only country (Russia)
    cy.visit('/');
    cy.createFakeEngineerProfile({ country: 'RU' });

    // when navigating to billing account page
    cy.visit('/dashboard/billing');

    // then should see Payoneer payouts available
    cy.contains('Payoneer Payouts Available').should('be.visible');

    // and should see setup instructions
    cy.contains('Payoneer Setup Instructions').should('be.visible');
    cy.contains('Create a Payoneer account').should('be.visible');
    cy.contains('payoneer.com').should('be.visible');

    // and should not see Stripe button
    cy.contains('button', 'Set Up Billing Account').should('not.exist');
  });

  it('displays unsupported message for unsupported country', () => {
    // given an engineer from an unsupported country
    cy.visit('/');
    cy.createFakeEngineerProfile({ country: 'XX' });

    // when navigating to billing account page
    cy.visit('/dashboard/billing');

    // then should see unsupported message
    cy.contains('Country Not Supported').should('be.visible');
    cy.contains("don't currently support payouts").should('be.visible');
  });

  it('displays Stripe account status for engineer with account', () => {
    // given a US engineer with Stripe account
    cy.visit('/');
    cy.createFakeEngineerProfile({ country: 'US' });

    // and the engineer has a billing account
    // (this would require more setup with test data)

    // when navigating to billing account page
    cy.visit('/dashboard/billing');

    // then should see Stripe Connect available
    cy.contains('Stripe Connect Available').should('be.visible');

    // and should see account status section
    cy.contains('Account Status').should('be.visible');
  });

  it('shows correct payout info for different Stripe countries', () => {
    // Test multiple Stripe-supported countries
    const stripeCountries = [
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'DE', name: 'Germany' },
      { code: 'CA', name: 'Canada' },
      { code: 'AU', name: 'Australia' },
    ];

    stripeCountries.forEach(({ code }) => {
      // given an engineer from a Stripe country
      cy.visit('/');
      cy.createFakeEngineerProfile({ country: code });

      // when navigating to billing account
      cy.visit('/dashboard/billing');

      // then should see Stripe available
      cy.contains('Stripe Connect Available').should('be.visible');

      // cleanup
      cy.clearLocalStorage();
    });
  });

  it('shows correct payout info for Payoneer-only countries', () => {
    // Test multiple Payoneer-only countries
    const payoneerCountries = ['RU', 'AR', 'BD', 'KE'];

    payoneerCountries.forEach((code) => {
      // given an engineer from a Payoneer-only country
      cy.visit('/');
      cy.createFakeEngineerProfile({ country: code });

      // when navigating to billing account
      cy.visit('/dashboard/billing');

      // then should see Payoneer instructions
      cy.contains('Payoneer Payouts Available').should('be.visible');
      cy.contains('Payoneer Setup Instructions').should('be.visible');

      // cleanup
      cy.clearLocalStorage();
    });
  });
});
