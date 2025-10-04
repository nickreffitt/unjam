import type { EngineerAccount } from '@common/types';
import type { BillingAccountStore } from './BillingAccountStore';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Tables } from '@common/supabase.types';
import { BillingAccountEventEmitter } from '../events';

/**
 * Supabase implementation of the billing account store
 * Handles CRUD operations for engineer billing accounts
 */
export class BillingAccountStoreSupabase implements BillingAccountStore {
  private readonly supabase: SupabaseClient;
  private readonly eventEmitter: BillingAccountEventEmitter;
  private realtimeChannel: RealtimeChannel | null = null;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.eventEmitter = new BillingAccountEventEmitter();
  }

  /**
   * Gets an engineer's billing account by their profile ID
   * @param profileId - The engineer's profile ID
   * @returns The engineer's billing account if found, null otherwise
   */
  async getByProfileId(profileId: string): Promise<EngineerAccount | null> {
    const { data, error } = await this.supabase
      .from('billing_engineers')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapRowToEngineerAccount(data);
  }

  /**
   * Starts listening to Postgres changes for billing_engineers table
   * Emits events when accounts are created or updated
   */
  startListening(): void {
    if (this.realtimeChannel) {
      console.warn('BillingAccountStoreSupabase: Already listening to billing_engineers changes');
      return;
    }

    this.realtimeChannel = this.supabase
      .channel('billing_engineers_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'billing_engineers'
        },
        (payload) => {
          const account = this.mapRowToEngineerAccount(payload.new as Tables<'billing_engineers'>);
          console.debug('BillingAccountStoreSupabase: Account created', account);
          this.eventEmitter.emitBillingAccountCreated(account);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'billing_engineers'
        },
        (payload) => {
          const account = this.mapRowToEngineerAccount(payload.new as Tables<'billing_engineers'>);
          console.debug('BillingAccountStoreSupabase: Account updated', account);
          this.eventEmitter.emitBillingAccountUpdated(account);
        }
      )
      .subscribe();

    console.debug('BillingAccountStoreSupabase: Started listening to billing_engineers changes');
  }

  /**
   * Stops listening to Postgres changes
   */
  stopListening(): void {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      console.debug('BillingAccountStoreSupabase: Stopped listening to billing_engineers changes');
    }
  }

  private mapRowToEngineerAccount(row: Tables<'billing_engineers'>): EngineerAccount {
    return {
      id: row.stripe_account_id,
      engineerId: row.profile_id,
      email: row.email,
      detailsSubmitted: row.details_submitted,
      chargesEnabled: row.charges_enabled,
      payoutsEnabled: row.payouts_enabled,
      verificationStatus: row.verification_status,
      currentDeadline: row.current_deadline ? new Date(row.current_deadline) : null,
      disabledReason: row.disabled_reason,
    };
  }
}
