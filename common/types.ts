export type TicketStatus = 'waiting' | 'in-progress' | 'awaiting-confirmation' | 'marked-resolved' | 'completed' | 'auto-completed';
export type UserType = 'customer' | 'engineer';

export interface CustomerProfile {
  id: string;
  name: string;
  type: 'customer';
  email?: string;
}

export interface EngineerProfile {
  id: string;
  name: string;
  type: 'engineer';
  email?: string;
  specialties?: string[];
}

export type UserProfile = CustomerProfile | EngineerProfile;

export interface Ticket {
  id: string;
  status: TicketStatus;
  summary: string;
  estimatedTime: string;
  problemDescription: string;
  createdBy: CustomerProfile;
  assignedTo?: EngineerProfile;
  createdAt: Date;
  claimedAt?: Date;
  abandonedAt?: Date;
  markedAsFixedAt?: Date;
  autoCompleteTimeoutAt?: Date;
  resolvedAt?: Date;
  elapsedTime: number; // in seconds
}

export interface TicketListItem {
  ticket: Ticket;
  summary: string;
  status: TicketStatus;
  time: string;
  actions: string[];
}

export type TicketEventType = 'ticketCreated' | 'ticketUpdated' | 'ticketDeleted' | 'ticketsCleared' | 'ticketsLoaded';

export interface ErrorDisplay {
  title: string;
  message: string;
}