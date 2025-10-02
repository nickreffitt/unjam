import { type SupabaseClient } from '@supabase/supabase-js';

/**
 * ApiManager handles communication with Supabase Edge Functions
 * Wraps edge function calls with proper authentication and error handling
 */
export class ApiManager {
  private supabaseClient: SupabaseClient;
  private edgeFunctionUrl: string;

  constructor(supabaseClient: SupabaseClient, edgeFunctionUrl: string) {
    if (!supabaseClient) {
      throw new Error('ApiManager: supabaseClient is required');
    }
    if (!edgeFunctionUrl) {
      throw new Error('ApiManager: edgeFunctionUrl is required');
    }
    this.supabaseClient = supabaseClient;
    this.edgeFunctionUrl = edgeFunctionUrl;
  }

  /**
   * Creates a billing portal link for the given profile
   * @param profileId - The user profile ID
   * @returns The billing portal URL where the user can manage their subscription
   * @throws Error if the request fails or no billing customer exists
   */
  async createBillingPortalLink(profileId: string): Promise<string> {
    console.info(`[ApiManager] Creating billing portal link for profile: ${profileId}`);

    try {
      // Get the current session to access the auth token
      const { data: { session }, error: sessionError } = await this.supabaseClient.auth.getSession();

      if (sessionError || !session) {
        throw new Error('No active session found. Please sign in.');
      }

      // Make request to stripe-links edge function
      const response = await fetch(`${this.edgeFunctionUrl}/stripe-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ profile_id: profileId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create billing portal link: ${response.statusText}`);
      }

      const { url } = await response.json();

      if (!url) {
        throw new Error('No URL returned from billing portal service');
      }

      console.info(`[ApiManager] Successfully created billing portal link`);
      return url;

    } catch (err) {
      const error = err as Error;
      console.error('[ApiManager] Error creating billing portal link:', error.message);
      throw error;
    }
  }
}
