export type TicketStatus = 'waiting' | 'in-progress' | 'marked-resolved' | 'completed' | 'auto-completed';

export interface Ticket {
  id: string;
  status: TicketStatus;
  summary: string;
  estimatedTime: string;
  problemDescription: string;
  engineerName?: string;
  createdAt: Date;
  claimedAt?: Date;
  abandonedAt?: Date;
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