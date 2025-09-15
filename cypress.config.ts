import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5175',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: false,
    screenshotOnRunFailure: true,
    env: {
      NODE_ENV: 'development'
    },
    setupNodeEvents(on, config) {
      // Set environment variables for development mode during tests
      process.env.NODE_ENV = 'development';
      config.env.NODE_ENV = 'development';
      return config;
    }
  },
});