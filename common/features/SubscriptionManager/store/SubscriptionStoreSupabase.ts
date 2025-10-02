import type { Subscription } from '@common/types';
import type { SubscriptionStore } from './SubscriptionStore';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '@common/supabase.types';

/**
 * Supabase implementation of the subscription store
 * Fetches active subscriptions by querying billing_customers and billing_subscriptions tables
 */
export class SubscriptionStoreSupabase implements SubscriptionStore {
  private readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Gets the active subscription for a given profile ID
   * First fetches the stripe_customer_id from billing_customers,
   * then queries billing_subscriptions using that customer ID
   * @param profileId - The profile ID to find an active subscription for
   * @returns The active subscription if found, null otherwise
   */
  async getActiveSubscriptionForProfile(profileId: string): Promise<Subscription | null> {
    // First, get the stripe_customer_id for this profile
    const { data: customerData, error: customerError } = await this.supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('profile_id', profileId)
      .single();

    if (customerError || !customerData) {
      return null;
    }

    // Then, get the active subscription for this customer using stripe_customer_id
    const { data: subscriptionData, error: subscriptionError } = await this.supabase
      .from('billing_subscriptions')
      .select('*')
      .eq('stripe_customer_id', customerData.stripe_customer_id)
      .in('status', ['active', 'trialing'])
      .single();

    if (subscriptionError || !subscriptionData) {
      return null;
    }

    return this.mapRowToSubscription(subscriptionData);
  }

  private mapRowToSubscription(row: Tables<'billing_subscriptions'>): Subscription {
    return {
      id: row.stripe_subscription_id,
      customerId: row.stripe_customer_id,
      status: row.status,
      planName: row.plan_name,
      creditPrice: row.credit_price,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : new Date(),
    };
  }
}
