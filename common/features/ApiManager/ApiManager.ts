import { type SupabaseClient } from '@supabase/supabase-js';
import type { EngineerProfile, CreditBalanceResponse } from '@common/types';

/**
 * ApiManager handles communication with the backend API
 * Wraps edge function calls with proper authentication and error handling
 */
export class ApiManager {
  private supabaseClient: SupabaseClient;
  private apiUrl: string;

  constructor(supabaseClient: SupabaseClient, apiUrl: string) {
    if (!supabaseClient) {
      throw new Error('ApiManager: supabaseClient is required');
    }
    if (!apiUrl) {
      throw new Error('ApiManager: apiUrl is required');
    }
    this.supabaseClient = supabaseClient;
    this.apiUrl = apiUrl;
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
      const { url } = await this.makeAuthenticatedRequest<{ url: string }>(
        'billing-links',
        {
          link_type: 'create_portal',
          payload: {
            profile_id: profileId
          }
        },
        'Failed to create billing portal link'
      );

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

  /**
   * Creates an engineer account link for onboarding
   * @param engineerProfile - The engineer profile
   * @returns The account link URL where the engineer can complete onboarding
   * @throws Error if the request fails or engineer email is missing
   */
  async createEngineerAccountLink(engineerProfile: EngineerProfile): Promise<string> {
    console.info(`[ApiManager] Creating engineer account link for profile: ${engineerProfile.id}`);

    if (!engineerProfile.email) {
      throw new Error('Engineer email is required to create account link');
    }

    try {
      const { url } = await this.makeAuthenticatedRequest<{ url: string }>(
        'billing-links',
        {
          link_type: 'create_engineer_account',
          payload: {
            engineer_id: engineerProfile.id,
            email: engineerProfile.email
          }
        },
        'Failed to create engineer account link'
      );

      if (!url) {
        throw new Error('No URL returned from engineer account service');
      }

      console.info(`[ApiManager] Successfully created engineer account link`);
      return url;

    } catch (err) {
      const error = err as Error;
      console.error('[ApiManager] Error creating engineer account link:', error.message);
      throw error;
    }
  }

  /**
   * Fetches the credit balance for a given profile
   * @param profileId - The user profile ID
   * @returns The credit balance amount
   * @throws Error if the request fails
   */
  async fetchCreditBalance(profileId: string): Promise<number> {
    console.info(`[ApiManager] Fetching credit balance for profile: ${profileId}`);

    try {
      const { creditBalance } = await this.makeAuthenticatedGetRequest<CreditBalanceResponse>(
        'billing_credits',
        { profile_id: profileId },
        'Failed to fetch credit balance'
      );

      console.info(`[ApiManager] Successfully fetched credit balance: ${creditBalance}`);
      return creditBalance;

    } catch (err) {
      const error = err as Error;
      console.error('[ApiManager] Error fetching credit balance:', error.message);
      throw error;
    }
  }


  /**
   * Makes an authenticated POST request to an edge function
   * @param endpoint - The edge function endpoint (e.g., 'billing-links')
   * @param body - The request body
   * @param errorContext - Context string for error messages
   * @returns The response data
   * @throws Error if authentication fails or request fails
   */
  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    body: unknown,
    errorContext: string
  ): Promise<T> {
    // Get the current session to access the auth token
    const { data: { session }, error: sessionError } = await this.supabaseClient.auth.getSession();

    if (sessionError || !session) {
      throw new Error('No active session found. Please sign in.');
    }

    // Make request to edge function
    const response = await fetch(`${this.apiUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `${errorContext}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Makes an authenticated GET request to an edge function
   * @param endpoint - The edge function endpoint (e.g., 'billing_credits')
   * @param params - Query parameters
   * @param errorContext - Context string for error messages
   * @returns The response data
   * @throws Error if authentication fails or request fails
   */
  private async makeAuthenticatedGetRequest<T>(
    endpoint: string,
    params: Record<string, string>,
    errorContext: string
  ): Promise<T> {
    // Get the current session to access the auth token
    const { data: { session }, error: sessionError } = await this.supabaseClient.auth.getSession();

    if (sessionError || !session) {
      throw new Error('No active session found. Please sign in.');
    }

    // Build query string
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.apiUrl}/${endpoint}?${queryString}`;

    // Make request to edge function
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `${errorContext}: ${response.statusText}`);
    }

    return await response.json();
  }
}
