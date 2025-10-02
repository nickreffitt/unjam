import { type SupabaseClient } from 'supabase'
import type { BillingCustomerStore } from './BillingCustomerStore.ts'
import type { Customer } from '@types'

/**
 * Supabase implementation of BillingCustomerStore
 */
export class BillingCustomerStoreSupabase implements BillingCustomerStore {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Creates a new billing customer record
   * Looks up the profile by email address and links it to the billing customer
   * @param customer - The customer data from the billing provider
   * @returns The profile ID associated with this customer
   */
  async create(customer: Customer): Promise<string> {
    console.info(`[BillingCustomerStoreSupabase] Creating billing customer: ${customer.id}`)

    // Look up the profile by email
    if (!customer.email) {
      throw new Error('Customer email is required to create billing customer')
    }

    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('email', customer.email)
      .single()

    if (profileError || !profile) {
      console.error(`[BillingCustomerStoreSupabase] Profile not found for email: ${customer.email}`, profileError)
      throw new Error(`Profile not found for email: ${customer.email}`)
    }

    console.info(`[BillingCustomerStoreSupabase] Found profile ${profile.id} for email ${customer.email}`)

    // Insert the billing customer record
    const { error: insertError } = await this.supabase
      .from('billing_customers')
      .insert({
        profile_id: profile.id,
        stripe_customer_id: customer.id,
        email: customer.email,
        name: customer.name
      })

    if (insertError) {
      console.error(`[BillingCustomerStoreSupabase] Error creating billing customer:`, insertError)
      throw new Error(`Failed to create billing customer: ${insertError.message}`)
    }

    console.info(`[BillingCustomerStoreSupabase] Successfully created billing customer for profile ${profile.id}`)
    return profile.id
  }

  /**
   * Updates an existing billing customer record
   * @param customer - The updated customer data
   */
  async update(customer: Customer): Promise<void> {
    console.info(`[BillingCustomerStoreSupabase] Updating billing customer: ${customer.id}`)

    const { error } = await this.supabase
      .from('billing_customers')
      .update({
        email: customer.email,
        name: customer.name
      })
      .eq('stripe_customer_id', customer.id)

    if (error) {
      console.error(`[BillingCustomerStoreSupabase] Error updating billing customer:`, error)
      throw new Error(`Failed to update billing customer: ${error.message}`)
    }

    console.info(`[BillingCustomerStoreSupabase] Successfully updated billing customer ${customer.id}`)
  }

  /**
   * Deletes a billing customer record
   * @param customerId - The billing provider's customer ID
   */
  async delete(customerId: string): Promise<void> {
    console.info(`[BillingCustomerStoreSupabase] Deleting billing customer: ${customerId}`)

    const { error } = await this.supabase
      .from('billing_customers')
      .delete()
      .eq('stripe_customer_id', customerId)

    if (error) {
      console.error(`[BillingCustomerStoreSupabase] Error deleting billing customer:`, error)
      throw new Error(`Failed to delete billing customer: ${error.message}`)
    }

    console.info(`[BillingCustomerStoreSupabase] Successfully deleted billing customer ${customerId}`)
  }

  /**
   * Fetches a billing customer by their billing provider ID
   * @param customerId - The billing provider's customer ID
   * @returns The profile ID if found, undefined otherwise
   */
  async fetch(customerId: string): Promise<string | undefined> {
    console.info(`[BillingCustomerStoreSupabase] Fetching billing customer: ${customerId}`)

    const { data, error } = await this.supabase
      .from('billing_customers')
      .select('profile_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        console.info(`[BillingCustomerStoreSupabase] Billing customer not found: ${customerId}`)
        return undefined
      }
      console.error(`[BillingCustomerStoreSupabase] Error fetching billing customer:`, error)
      throw new Error(`Failed to fetch billing customer: ${error.message}`)
    }

    console.info(`[BillingCustomerStoreSupabase] Found billing customer with profile ${data.profile_id}`)
    return data.profile_id
  }

  /**
   * Fetches a billing customer by their profile ID
   * @param profileId - The profile ID
   * @returns The stripe customer ID if found, undefined otherwise
   */
  async getByProfileId(profileId: string): Promise<string | undefined> {
    console.info(`[BillingCustomerStoreSupabase] Fetching billing customer by profile ID: ${profileId}`)

    const { data, error } = await this.supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('profile_id', profileId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        console.info(`[BillingCustomerStoreSupabase] Billing customer not found for profile: ${profileId}`)
        return undefined
      }
      console.error(`[BillingCustomerStoreSupabase] Error fetching billing customer by profile:`, error)
      throw new Error(`Failed to fetch billing customer by profile: ${error.message}`)
    }

    console.info(`[BillingCustomerStoreSupabase] Found billing customer ${data.stripe_customer_id} for profile ${profileId}`)
    return data.stripe_customer_id
  }
}
