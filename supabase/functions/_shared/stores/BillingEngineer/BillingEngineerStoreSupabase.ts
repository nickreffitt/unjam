import { type SupabaseClient } from 'supabase'
import type { BillingEngineerStore } from './BillingEngineerStore.ts'
import type { EngineerAccount, EngineerAccountVerificationStatus } from '@types'

/**
 * Supabase implementation of BillingEngineerStore
 */
export class BillingEngineerStoreSupabase implements BillingEngineerStore {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Creates a new billing engineer account record
   * @param account - The engineer account data from the billing provider
   * @returns The created engineer account
   */
  async create(account: EngineerAccount): Promise<EngineerAccount> {
    console.info(`[BillingEngineerStoreSupabase] Creating billing engineer account: ${account.id}`)

    const { data, error } = await this.supabase
      .from('billing_engineers')
      .insert({
        profile_id: account.engineerId,
        stripe_account_id: account.id,
        email: account.email,
        details_submitted: account.detailsSubmitted,
        charges_enabled: account.chargesEnabled,
        payouts_enabled: account.payoutsEnabled,
        verification_status: account.verificationStatus,
        current_deadline: account.currentDeadline ? account.currentDeadline.toISOString() : null,
        disabled_reason: account.disabledReason
      })
      .select()
      .single()

    if (error) {
      console.error(`[BillingEngineerStoreSupabase] Error creating billing engineer account:`, error)
      throw new Error(`Failed to create billing engineer account: ${error.message}`)
    }

    console.info(`[BillingEngineerStoreSupabase] Successfully created billing engineer account for profile ${account.engineerId}`)
    return this.mapToEngineerAccount(data)
  }

  /**
   * Updates an existing billing engineer account record
   * @param account - The updated engineer account data
   */
  async update(account: EngineerAccount): Promise<void> {
    console.info(`[BillingEngineerStoreSupabase] Updating billing engineer account: ${account.id}`)

    const { error } = await this.supabase
      .from('billing_engineers')
      .update({
        email: account.email,
        details_submitted: account.detailsSubmitted,
        charges_enabled: account.chargesEnabled,
        payouts_enabled: account.payoutsEnabled,
        verification_status: account.verificationStatus,
        current_deadline: account.currentDeadline ? account.currentDeadline.toISOString() : null,
        disabled_reason: account.disabledReason
      })
      .eq('stripe_account_id', account.id)

    if (error) {
      console.error(`[BillingEngineerStoreSupabase] Error updating billing engineer account:`, error)
      throw new Error(`Failed to update billing engineer account: ${error.message}`)
    }

    console.info(`[BillingEngineerStoreSupabase] Successfully updated billing engineer account ${account.id}`)
  }

  /**
   * Deletes a billing engineer account record
   * @param accountId - The billing provider's account ID
   */
  async delete(accountId: string): Promise<void> {
    console.info(`[BillingEngineerStoreSupabase] Deleting billing engineer account: ${accountId}`)

    const { error } = await this.supabase
      .from('billing_engineers')
      .delete()
      .eq('stripe_account_id', accountId)

    if (error) {
      console.error(`[BillingEngineerStoreSupabase] Error deleting billing engineer account:`, error)
      throw new Error(`Failed to delete billing engineer account: ${error.message}`)
    }

    console.info(`[BillingEngineerStoreSupabase] Successfully deleted billing engineer account ${accountId}`)
  }

  /**
   * Fetches a billing engineer account by their billing provider ID
   * @param accountId - The billing provider's account ID
   * @returns The engineer account if found, undefined otherwise
   */
  async fetch(accountId: string): Promise<EngineerAccount | undefined> {
    console.info(`[BillingEngineerStoreSupabase] Fetching billing engineer account: ${accountId}`)

    const { data, error } = await this.supabase
      .from('billing_engineers')
      .select('*')
      .eq('stripe_account_id', accountId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        console.info(`[BillingEngineerStoreSupabase] Billing engineer account not found: ${accountId}`)
        return undefined
      }
      console.error(`[BillingEngineerStoreSupabase] Error fetching billing engineer account:`, error)
      throw new Error(`Failed to fetch billing engineer account: ${error.message}`)
    }

    console.info(`[BillingEngineerStoreSupabase] Found billing engineer account for profile ${data.profile_id}`)
    return this.mapToEngineerAccount(data)
  }

  /**
   * Fetches a billing engineer account by their profile ID
   * @param profileId - The engineer profile ID
   * @returns The engineer account if found, undefined otherwise
   */
  async getByProfileId(profileId: string): Promise<EngineerAccount | undefined> {
    console.info(`[BillingEngineerStoreSupabase] Fetching billing engineer account by profile ID: ${profileId}`)

    const { data, error } = await this.supabase
      .from('billing_engineers')
      .select('*')
      .eq('profile_id', profileId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        console.info(`[BillingEngineerStoreSupabase] Billing engineer account not found for profile: ${profileId}`)
        return undefined
      }
      console.error(`[BillingEngineerStoreSupabase] Error fetching billing engineer account by profile:`, error)
      throw new Error(`Failed to fetch billing engineer account by profile: ${error.message}`)
    }

    console.info(`[BillingEngineerStoreSupabase] Found billing engineer account ${data.stripe_account_id} for profile ${profileId}`)
    return this.mapToEngineerAccount(data)
  }

  /**
   * Maps database row to EngineerAccount domain object
   */
  private mapToEngineerAccount(data: any): EngineerAccount {
    return {
      id: data.stripe_account_id,
      engineerId: data.profile_id,
      email: data.email,
      detailsSubmitted: data.details_submitted,
      chargesEnabled: data.charges_enabled,
      payoutsEnabled: data.payouts_enabled,
      verificationStatus: data.verification_status as EngineerAccountVerificationStatus,
      currentDeadline: data.current_deadline ? new Date(data.current_deadline) : null,
      disabledReason: data.disabled_reason
    }
  }
}
