# Engineer Dashboard

This is the engineer dashboard interface for the real-time ticket management system.

## Development

To start the dashboard development server:

```bash
npm run dev:dashboard
```

The dashboard will be available at: http://localhost:5174/

## Features

### Navigation
- **New Tickets**: View and claim available tickets from customers
- **Active Tickets**: Manage tickets currently assigned to you
- **Completed Tickets**: Review your completed ticket history

### Pages

#### New Tickets List (`/new`)
- Shows all tickets with `waiting` status
- Displays elapsed wait time with live updates
- Allows claiming tickets or previewing details

#### Ticket Preview (`/new/:ticketId`)
- Detailed view of a waiting ticket before claiming
- Shows full problem description and auto-captured debug info
- "Claim This Ticket" button to claim the ticket

#### Active Tickets List (`/active`)
- Shows all tickets with `in-progress` status assigned to current engineer
- Displays elapsed active time with live updates
- Quick access to ticket details and chat

#### Active Ticket (`/active/:ticketId`)
- Full ticket management interface
- "Mark as Fixed" button (notifies customer for confirmation)
- "Abandon Task" button (returns ticket to queue)
- Chat interface placeholder (future implementation)

#### Completed Tickets List (`/completed`)
- Shows all tickets with `completed` or `auto-completed` status
- Historical view of resolved tickets

#### Completed Ticket (`/completed/:ticketId`)
- Read-only view of completed ticket
- Shows completion status (completed vs auto-completed)
- Chat history placeholder

## Mock Data

The dashboard currently uses mock data from `../common/mockData.ts`. This includes:

- 2 waiting tickets
- 1 in-progress ticket  
- 5 completed/auto-completed tickets

## Real-time Features

Timer components update elapsed time every second for:
- Waiting tickets (time since creation)
- Active tickets (time since claimed)

## Environment Variables

- `VITE_AUTO_COMPLETE_TIMEOUT_MINUTES`: Timeout in minutes before tickets are auto-completed (default: 30)

## Architecture

The dashboard follows the project's coding standards:
- Shared types in `../common/types.ts`
- Mock data in `../common/mockData.ts`  
- Component organization by feature/page
- React Router for navigation
- Tailwind CSS for styling