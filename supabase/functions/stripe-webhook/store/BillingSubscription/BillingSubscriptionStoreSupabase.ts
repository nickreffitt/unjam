import { createClient, type SupabaseClient } from 'supabase'
import type { BillingSubscriptionStore } from './BillingSubscriptionStore.ts'
import type { Subscription } from '@types'

/**
 * Supabase implementation of BillingSubscriptionStore
 */
export class BillingSubscriptionStoreSupabase implements BillingSubscriptionStore {
  private supabase: SupabaseClient

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey)
  }

  /**
   * Creates a new billing subscription record
   * @param subscription - The subscription data from the billing provider
   */
  async create(subscription: Subscription): Promise<void> {
    console.info(`[BillingSubscriptionStoreSupabase] Creating billing subscription: ${subscription.id}`)

    // Insert the billing subscription record
    const { error: insertError } = await this.supabase
      .from('billing_subscriptions')
      .insert({
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customerId,
        status: subscription.status,
        plan_name: subscription.planName,
        credit_price: subscription.creditPrice,
      })

    if (insertError) {
      console.error(`[BillingSubscriptionStoreSupabase] Error creating billing subscription:`, insertError)
      throw new Error(`Failed to create billing subscription: ${insertError.message}`)
    }

    console.info(`[BillingSubscriptionStoreSupabase] Successfully created billing subscription ${subscription.id}`)
  }

  /**
   * Updates an existing billing subscription record
   * @param subscription - The updated subscription data
   */
  async update(subscription: Subscription): Promise<void> {
    console.info(`[BillingSubscriptionStoreSupabase] Updating billing subscription: ${subscription.id}`)

    const { error } = await this.supabase
      .from('billing_subscriptions')
      .update({
        status: subscription.status,
        plan_name: subscription.planName,
        credit_price: subscription.creditPrice,
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error(`[BillingSubscriptionStoreSupabase] Error updating billing subscription:`, error)
      throw new Error(`Failed to update billing subscription: ${error.message}`)
    }

    console.info(`[BillingSubscriptionStoreSupabase] Successfully updated billing subscription ${subscription.id}`)
  }

  /**
   * Deletes a billing subscription record
   * @param subscriptionId - The billing provider's subscription ID
   */
  async delete(subscriptionId: string): Promise<void> {
    console.info(`[BillingSubscriptionStoreSupabase] Deleting billing subscription: ${subscriptionId}`)

    const { error } = await this.supabase
      .from('billing_subscriptions')
      .delete()
      .eq('stripe_subscription_id', subscriptionId)

    if (error) {
      console.error(`[BillingSubscriptionStoreSupabase] Error deleting billing subscription:`, error)
      throw new Error(`Failed to delete billing subscription: ${error.message}`)
    }

    console.info(`[BillingSubscriptionStoreSupabase] Successfully deleted billing subscription ${subscriptionId}`)
  }

  /**
   * Fetches a billing subscription by its billing provider ID
   * @param subscriptionId - The billing provider's subscription ID
   * @returns The subscription if found, undefined otherwise
   */
  async fetch(subscriptionId: string): Promise<Subscription | undefined> {
    console.info(`[BillingSubscriptionStoreSupabase] Fetching billing subscription: ${subscriptionId}`)

    const { data, error } = await this.supabase
      .from('billing_subscriptions')
      .select('stripe_subscription_id, stripe_customer_id, status, plan_name, credit_price, current_period_end')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        console.info(`[BillingSubscriptionStoreSupabase] Billing subscription not found: ${subscriptionId}`)
        return undefined
      }
      console.error(`[BillingSubscriptionStoreSupabase] Error fetching billing subscription:`, error)
      throw new Error(`Failed to fetch billing subscription: ${error.message}`)
    }

    console.info(`[BillingSubscriptionStoreSupabase] Found billing subscription ${subscriptionId}`)
    return {
      id: data.stripe_subscription_id,
      customerId: data.stripe_customer_id,
      status: data.status,
      planName: data.plan_name,
      creditPrice: data.credit_price,
    }
  }
}
