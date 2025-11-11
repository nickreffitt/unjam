describe('Dashboard - Engineer Profile Creation with Country', () => {
  beforeEach(() => {
    // Clear state and visit app
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('requires country selection for engineer profile creation', () => {
    // given the user navigates to profile creation page and selects engineer
    cy.contains('Engineer').click();

    // when filling out the form without country
    cy.get('input[name="name"]').type('John Engineer');
    cy.get('input[name="githubUsername"]').type('johndev');

    // then country dropdown should be visible
    cy.contains('Country').should('be.visible');

    // and form should not submit without country selection
    cy.contains('button', 'Complete Profile').click();

    // form should still be visible (validation failed)
    cy.contains('Country').should('be.visible');
  });

  it('allows engineer to select country from dropdown', () => {
    // given the engineer profile form is displayed
    cy.contains('Engineer').click();
    cy.get('input[name="name"]').type('John Engineer');
    cy.get('input[name="githubUsername"]').type('johndev');

    // when clicking the country dropdown
    cy.contains('Select your country').click();

    // then dropdown menu should appear with search
    cy.get('input[placeholder="Search countries..."]').should('be.visible');

    // and countries should be visible
    cy.contains('United States').should('be.visible');
  });

  it('allows searching for countries in dropdown', () => {
    // given the country dropdown is open
    cy.contains('Engineer').click();
    cy.contains('Select your country').click();

    // when typing in the search box
    cy.get('input[placeholder="Search countries..."]').type('United');

    // then matching countries should be visible
    cy.contains('United States').should('be.visible');
    cy.contains('United Kingdom').should('be.visible');

    // and non-matching countries should not appear
    cy.contains('Germany').should('not.exist');
  });

  it('creates engineer profile with selected country', () => {
    // given filling out the engineer profile form
    cy.contains('Engineer').click();
    cy.get('input[name="name"]').type('John Engineer');

    // when selecting a country
    cy.contains('Select your country').click();
    cy.contains('United States').click();

    // then selected country should display
    cy.contains('United States').should('be.visible');

    // and when completing the form with github username
    cy.get('input[name="githubUsername"]').type('johndev');

    // and submitting
    cy.contains('button', 'Complete Profile').click();

    // then profile should be created successfully
    // (would navigate away from profile creation page)
    cy.contains('Engineer').should('not.exist');
  });

  it('displays country selection helper text for engineers', () => {
    // given viewing the engineer profile form
    cy.contains('Engineer').click();

    // when viewing the country field
    cy.contains('Country').should('be.visible');

    // then helper text about payout options should be visible
    cy.contains('determines which payout options').should('be.visible');
  });

  it('does not require country for customer profile', () => {
    // given selecting customer profile type
    cy.contains('Customer').click();

    // when viewing the form
    cy.get('input[name="name"]').should('be.visible');

    // then country field should not be visible
    cy.contains('Select your country').should('not.exist');

    // and can submit with just name
    cy.get('input[name="name"]').type('Jane Customer');
    cy.contains('button', 'Complete Profile').click();

    // profile created successfully
    cy.contains('Customer').should('not.exist');
  });

  it('updates dropdown selection when clicking different countries', () => {
    // given the country dropdown is open
    cy.contains('Engineer').click();
    cy.contains('Select your country').click();

    // when selecting United States
    cy.contains('United States').click();

    // then US should be displayed
    cy.contains('United States').should('be.visible');

    // when opening dropdown again and selecting UK
    cy.contains('United States').click();
    cy.get('input[placeholder="Search countries..."]').type('United Kingdom');
    cy.contains('United Kingdom').click();

    // then UK should be displayed
    cy.contains('United Kingdom').should('be.visible');
  });

  it('closes country dropdown when clicking outside', () => {
    // given the country dropdown is open
    cy.contains('Engineer').click();
    cy.contains('Select your country').click();
    cy.get('input[placeholder="Search countries..."]').should('be.visible');

    // when clicking outside the dropdown
    cy.get('body').click(0, 0);

    // then dropdown should close
    cy.get('input[placeholder="Search countries..."]').should('not.exist');
  });
});
