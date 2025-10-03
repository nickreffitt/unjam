import type { EngineerAccount } from '@common/types';
import type { BillingAccountStore } from './BillingAccountStore';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '@common/supabase.types';

/**
 * Supabase implementation of the billing account store
 * Handles CRUD operations for engineer billing accounts
 */
export class BillingAccountStoreSupabase implements BillingAccountStore {
  private readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
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
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRowToEngineerAccount(data);
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
