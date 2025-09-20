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

export type ChatEventType = 'chatMessageSent' | 'chatMessagesRead' | 'chatReloaded' | 'chatSenderIsTyping';

export interface ErrorDisplay {
  title: string;
  message: string;
}

export interface ChatMessage {
  id: string;
  ticketId: string;
  sender: UserProfile;
  receiver: UserProfile;
  content: string;
  createdAt: Date;
  isRead?: boolean;
}

export type ScreenShareStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'active' | 'ended';

export interface ScreenShareRequest {
  id: string;
  ticketId: string;
  requestedBy: UserProfile; // Engineer who requested
  requestedFrom: UserProfile; // Customer who will share
  status: ScreenShareStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date; // Request expires after 10 seconds
  autoAccept?: boolean; // True if engineer initiated and should auto-accept
}

export type SessionStatus = 'initializing' | 'active' | 'ended' | 'error' | 'disconnected';

export interface ScreenShareSession {
  id: string;
  ticketId: string;
  requestId: string; // Links to the ScreenShareRequest that initiated this session
  publisher: UserProfile; // Customer sharing their screen
  subscriber: UserProfile; // Engineer viewing the screen
  status: SessionStatus;
  streamId?: string; // Optional ID for the media stream
  errorMessage?: string; // Error details if status is 'error'
  startedAt: Date;
  endedAt?: Date;
  lastActivityAt: Date;
}

export type WebRTCState =
  | 'initializing'
  | 'connecting'
  | 'connected'
  | 'streaming'
  | 'disconnected'
  | 'failed'
  | 'closed';

export interface WebRTCError {
  type: 'connection' | 'media' | 'ice' | 'signaling' | 'configuration';
  message: string;
  details?: any;
}

export interface WebRTCSignal {
  id: string;
  sessionId: string;
  from: UserProfile;
  to: UserProfile;
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
  createdAt: Date;
  processed?: boolean;
}

export type WebRTCEventType =
  | 'webrtcStateChanged'
  | 'webrtcError'
  | 'webrtcRemoteStream'
  | 'webrtcIceCandidate'
  | 'webrtcOfferCreated'
  | 'webrtcAnswerCreated';