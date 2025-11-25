import { type SupabaseClient } from 'supabase'
import type { BillingEngineerBankTransferAccountStore } from './BillingEngineerBankTransferAccountStore.ts'
import type { BankTransferRecipient } from '@types'

/**
 * Supabase implementation of BillingEngineerBankTransferAccountStore
 */
export class BillingEngineerBankTransferAccountStoreSupabase implements BillingEngineerBankTransferAccountStore {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Creates a new billing engineer bank transfer account record
   * @param profileId - The engineer profile ID
   * @param recipient - The bank transfer recipient data
   * @returns The created bank transfer recipient
   */
  async create(profileId: string, recipient: BankTransferRecipient): Promise<BankTransferRecipient> {
    console.info(`[BillingEngineerBankTransferAccountStoreSupabase] Creating bank transfer account for profile: ${profileId}`)

    const { data, error } = await this.supabase
      .from('billing_engineer_bank_transfer_accounts')
      .insert({
        profile_id: profileId,
        external_recipient_id: recipient.external_id,
        name: recipient.name,
        country: recipient.country,
        summary: recipient.summary,
        hash: recipient.hash,
        active: recipient.active
      })
      .select()
      .single()

    if (error) {
      console.error(`[BillingEngineerBankTransferAccountStoreSupabase] Error creating bank transfer account:`, error)
      throw new Error(`Failed to create bank transfer account: ${error.message}`)
    }

    console.info(`[BillingEngineerBankTransferAccountStoreSupabase] Successfully created bank transfer account for profile ${profileId}`)
    return this.mapToBankTransferRecipient(data)
  }

  /**
   * Deletes a billing engineer bank transfer account record
   * @param externalId - The external recipient ID
   */
  async delete(externalId: string): Promise<void> {
    console.info(`[BillingEngineerBankTransferAccountStoreSupabase] Deleting bank transfer account: ${externalId}`)

    const { error } = await this.supabase
      .from('billing_engineer_bank_transfer_accounts')
      .delete()
      .eq('external_recipient_id', externalId)

    if (error) {
      console.error(`[BillingEngineerBankTransferAccountStoreSupabase] Error deleting bank transfer account:`, error)
      throw new Error(`Failed to delete bank transfer account: ${error.message}`)
    }

    console.info(`[BillingEngineerBankTransferAccountStoreSupabase] Successfully deleted bank transfer account ${externalId}`)
  }

  /**
   * Fetches a billing engineer bank transfer account by their profile ID
   * @param profileId - The engineer profile ID
   * @returns The bank transfer recipient if found, undefined otherwise
   */
  async getByProfileId(profileId: string): Promise<BankTransferRecipient | undefined> {
    console.info(`[BillingEngineerBankTransferAccountStoreSupabase] Fetching bank transfer account by profile ID: ${profileId}`)

    const { data, error } = await this.supabase
      .from('billing_engineer_bank_transfer_accounts')
      .select('*')
      .eq('profile_id', profileId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        console.info(`[BillingEngineerBankTransferAccountStoreSupabase] Bank transfer account not found for profile: ${profileId}`)
        return undefined
      }
      console.error(`[BillingEngineerBankTransferAccountStoreSupabase] Error fetching bank transfer account by profile:`, error)
      throw new Error(`Failed to fetch bank transfer account by profile: ${error.message}`)
    }

    console.info(`[BillingEngineerBankTransferAccountStoreSupabase] Found bank transfer account ${data.external_recipient_id} for profile ${profileId}`)
    return this.mapToBankTransferRecipient(data)
  }

  /**
   * Maps database row to BankTransferRecipient domain object
   */
  private mapToBankTransferRecipient(data: any): BankTransferRecipient {
    return {
      id: data.id,
      external_id: data.external_recipient_id,
      name: data.name,
      country: data.country,
      summary: data.summary,
      hash: data.hash,
      active: data.active
    }
  }
}
