export type TicketStatus = 'waiting' | 'in-progress' | 'awaiting-confirmation' | 'marked-resolved' | 'completed' | 'auto-completed';
export type UserType = 'customer' | 'engineer';
export type AuthUserStatus = 'loading' | 'not-signed-in' | 'requires-profile' | 'signed-in';
export interface AuthUser {
  status: AuthUserStatus, 
  user?: User,
  profile?: UserProfile
}

export interface User {
  id: string;
  createdAt: Date;
  email?: string;
  confirmedAt?: Date;
  lastSignInAt?: Date;
  displayName?: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  type: 'customer';
  email?: string;
  authId?: string;         // The auth system ID (e.g., Supabase Auth user ID)
  extensionInstalledAt?: Date;
  extensionInstalledVersion?: string;
}

export interface EngineerProfile {
  id: string;
  name: string;
  type: 'engineer';
  email?: string;
  specialties?: string[];
  githubUsername?: string;
  authId?: string;         // The auth system ID (e.g., Supabase Auth user ID)
  user?: User;             // 1:1 mapping with User from auth system
  extensionInstalledAt?: Date;
  extensionInstalledVersion?: string;
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

export type TicketEventType = 'ticketCreated' | 'ticketUpdated' | 'ticketClaimed' | 'ticketDeleted' | 'ticketsCleared' | 'ticketsLoaded';

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

export type ScreenShareStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'active' | 'ended';

export interface ScreenShareRequest {
  id: string;
  ticketId: string;
  sender: UserProfile; 
  receiver: UserProfile;
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
  ticketId: string;
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

// Billing types
export type CustomerState = 'created' | 'updated' | 'deleted';

export interface Customer {
  id: string;
  email: string | null;
  name?: string | null;
}

export interface CustomerEvent {
  state: CustomerState;
  customer: Customer;
}

export type SubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

export interface Subscription {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  planName: string;
  planAmount: number;
  creditPrice: number;
  cancelAtPeriodEnd: boolean;
  currentPeriod: {
    start: Date | null;
    end: Date | null;
  },
}

export type SubscriptionState = 'created' | 'updated' | 'deleted';

export interface SubscriptionEvent {
  state: SubscriptionState;
  subscription: Subscription;
}

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';

export interface Invoice {
  id: string;
  customerId: string;
  subscriptionId: string;
  status: InvoiceStatus;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
}

export type InvoiceState = 'paid' | 'failed';

export interface InvoiceEvent {
  state: InvoiceState;
  invoice: Invoice;
}

export interface CheckoutSession {
  id: string;
  customerId: string;
}

export interface CheckoutSessionEvent {
  checkoutSession: CheckoutSession;
}

export type CreditGrantCategory = 'paid' | 'promotional';

export interface CreditGrantAmount {
  type: 'monetary';
  monetary: {
    value: number;
    currency: string;
  };
}

export interface CreditGrantApplicabilityConfig {
  scope: {
    price_type: 'metered';
  };
}

export interface CreditGrant {
  id: string;
  customerId: string;
  name: string;
  amount: CreditGrantAmount;
  category: CreditGrantCategory;
  applicability_config: CreditGrantApplicabilityConfig;
  effective_at?: number;
  expires_at?: number;
  metadata?: Record<string, string>;
}

/**
 * Verification status for engineer billing accounts
 */
export type EngineerAccountVerificationStatus =
  | 'active'              // No outstanding requirements, account fully operational
  | 'eventually_due'      // Has future requirements but not urgent, can still work
  | 'currently_due'       // Has requirements due by deadline, can still work but action needed
  | 'past_due'            // Requirements overdue, capabilities may be disabled
  | 'pending_verification' // Waiting for async verification results
  | 'disabled'            // Account disabled, cannot process payments

export interface EngineerAccount {
  id: string;
  engineerId: string;
  email: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  verificationStatus: EngineerAccountVerificationStatus;
  currentDeadline: Date | null;
  disabledReason: string | null;
}

export type EngineerState = 'created' | 'updated' | 'deleted';

export interface EngineerAccountEvent {
  state: EngineerState;
  account: EngineerAccount;
}

export type BillingEvent = CustomerEvent | SubscriptionEvent | InvoiceEvent | CheckoutSessionEvent;
export type BillingEngineerEvent = EngineerAccountEvent;

// Billing Credits API types
export interface CreditBalanceRequest {
  profile_id: string;
}

export interface CreditBalanceResponse {
  creditBalance: number;
}

export interface CreditTransferRequest {
  profile_id: string;
  ticket_id: string;
}

export interface CreditTransferResponse {
  success: boolean;
}

export type EngineerTransferStatus = 'pending' | 'completed' | 'failed';

export interface EngineerTransfer {
  id: string;
  ticketId: string;
  engineerId: string;
  customerId: string;
  stripeTransferId: string | null;
  amount: number; // Engineer payout amount in cents
  creditsUsed: number; // Number of credits consumed (1-2, based on hours)
  creditValue: number; // Customer credit value in cents (creditPrice × creditsUsed)
  platformProfit: number; // Unjam profit = creditValue - amount
  status: EngineerTransferStatus;
  errorMessage?: string | null;
  createdAt: Date;
}