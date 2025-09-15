# Tickets Realtime - React Module

## Project Overview

This project is a React module designed to be used in other projects. It provides isolated logic and UI behavior for a real-time ticket management system with two main interfaces:

- **Dashboard**: Engineer interface for managing and responding to tickets
- **Extension**: Customer interface for creating and tracking tickets (implemented as a web page for development purposes)

## System Architecture

### Data Flow
Tickets are stored in a Supabase PostgreSQL database in a `tickets` table. The system uses Supabase's Postgres Changes feature for real-time updates, listening for both inserts and updates across both interfaces.

### User Roles & Capabilities

#### Customer (Extension Interface)
- Create new tickets with problem descriptions
- Mark tickets as complete
- Receive real-time updates when:
  - Ticket is assigned to an engineer (displays engineer name)
  - Engineer marks ticket as complete (prompts for confirmation)
  - Engineer abandons ticket (returns to waiting state)

#### Engineer (Dashboard Interface)
- Claim unassigned tickets from the queue
- View and manage assigned tickets by status:
  - Active tickets currently assigned
  - Completed tickets they've finished
- Access detailed ticket views with:
  - Real-time updates when customer marks ticket complete
  - "Mark as Fixed" button (prompts customer confirmation)
  - "Abandon Ticket" button (returns ticket to queue)

## Technical Stack

- **Frontend**: React
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Real-time Communication**: Supabase Postgres Changes
- **Testing**: Unit and Integration tests

## Coding Standards & Architecture Rules

### Code Organization
- **Separation of Concerns**: Maintain clear abstraction boundaries
- **Folder Structure**:
  - `dashboard/`: Engineer-only code
  - `extension/`: Customer-only code  
  - `common/`: Shared code between both interfaces
- **Abstraction Folders**: Each abstraction gets its own folder containing:
  - Core implementation
  - Test files
  - React hooks
  - Utility functions
  - Context providers

### Development Principles
- **Single Responsibility**: Each method should have one clear purpose
- **Constructor Dependency Injection**: Use for better testability and modularity
- **Data Access**: Abstract all Supabase interactions behind "Store" classes (e.g., `TicketStore`)
  - No direct Supabase client usage outside Store classes
  - **Store Responsibility**: Stores handle ONLY persistence and CRUD operations on domain objects
  - **Manager Responsibility**: Managers handle business logic AND object conversions (e.g., `Ticket` → `TicketListItem`)
  - Stores should have no knowledge of display/presentation objects
- **Persistence Architecture**: Store objects use persistence directly with row-level security (not client-server)
  - Stores connect directly to Supabase with RLS applied
  - No separate API layer - direct database access with security at row level
  - This eliminates traditional client-server architecture complexity
- **Continuous Refactoring**: Remove obsolete code as new features are added

### Testing Requirements
- **Test Coverage**: Write tests for every public method
- **Test Format**: Use Given-When-Then approach with clear purpose statements
- **Test Types**:
  - **Unit Tests**: Isolated component/function testing
  - **Integration Tests**: Tests that connect to real Supabase database
  - **E2E/Acceptance Tests**: Cypress tests that validate user workflows
- **Test Execution**: All tests must pass before completing any development task

### Cypress E2E Testing Standards
- **Test Naming**: Describe what the test validates, not implementation details
  - Good: `it('displays TicketModal when "Create New Ticket" button is clicked')`
  - Avoid: `it('given the page loads, when the button is pressed, the modal appears')`
- **Structure**: Use inline comments to mark Given-When-Then sections:
  ```javascript
  // given the page loads
  cy.contains('button', 'Create New Ticket').should('be.visible');

  // when button clicked
  cy.contains('button', 'Create New Ticket').click();

  // then TicketModal is displayed
  cy.contains('h2', 'Create New Ticket').should('be.visible');
  ```
- **URL Navigation**: Use root path `/` instead of specific routes like `/extension`

### Quality Assurance
- Run tests before finishing any development work
- Fix all failing tests - no exceptions
- Maintain consistent code organization across the project
- Ensure real-time functionality works correctly across both interfaces

## Development Workflow
1. Identify the appropriate folder (`dashboard`, `extension`, or `common`)
2. Create abstraction folder with complete structure
3. Implement core functionality following single responsibility principle
4. Write comprehensive tests (unit and integration as appropriate)
5. Abstract any Supabase calls behind Store classes
6. Run full test suite and fix any failures
7. Refactor and clean up obsolete code

## Real-time Implementation
Use Supabase's Postgres Changes for real-time updates:
- Documentation: https://supabase.com/docs/guides/realtime/postgres-changes
- Listen for both INSERT and UPDATE operations on the tickets table
- Ensure both dashboard and extension interfaces receive appropriate updates
- Instead of using Emoji icons from now on, use Lucide React icons https://lucide.dev/guide/packages/lucide-react