import type { BankTransferRecipient } from '@common/types';
import type { BillingBankTransferAccountStore } from './BillingBankTransferAccountStore';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase implementation of the billing bank transfer account store
 * Handles CRUD operations for engineer bank transfer recipient accounts
 */
export class BillingBankTransferAccountStoreSupabase implements BillingBankTransferAccountStore {
  private readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Gets an engineer's bank transfer recipient account by their profile ID
   * @param profileId - The engineer's profile ID
   * @returns The engineer's bank transfer recipient if found, null otherwise
   */
  async getByProfileId(profileId: string): Promise<BankTransferRecipient | null> {
    const { data, error } = await this.supabase
      .from('billing_engineer_bank_transfer_accounts')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      external_id: data.external_recipient_id,
      name: data.name,
      country: data.country,
      summary: data.summary,
      hash: data.hash,
      active: data.active
    };
  }

  /**
   * Creates a new bank transfer recipient account for an engineer
   * @param profileId - The engineer's profile ID
   * @param beneficiary - The beneficiary account information
   * @returns Promise that resolves when creation is complete
   * @throws Error if creation fails
   */
  async create(profileId: string, beneficiary: BankTransferRecipient): Promise<void> {
    const { error } = await this.supabase
      .from('billing_engineer_bank_transfer_accounts')
      .insert({
        profile_id: profileId,
        external_recipient_id: beneficiary.id,
        name: beneficiary.name,
        country: beneficiary.country,
        summary: beneficiary.summary || null,
        hash: beneficiary.hash || null,
        active: beneficiary.active
      });

    if (error) {
      console.error('[BillingBankTransferAccountStoreSupabase] Error creating bank transfer account:', error);
      throw new Error(`Failed to create bank transfer account: ${error.message}`);
    }
  }
}
