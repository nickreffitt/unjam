import { type SupabaseClient } from '@supabase/supabase-js';
import type { EngineerProfile, CreditBalanceResponse, CustomerSessionResponse, ProductsResponse, CheckoutSessionResponse } from '@common/types';

export interface ICEServersResponse {
  iceServers: RTCIceServer[];
}

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
      const { url } = await this.makeAuthenticatedPostRequest<{ url: string }>(
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
      const { url } = await this.makeAuthenticatedPostRequest<{ url: string }>(
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
   * Creates an engineer login link to access the Express Dashboard
   * @param engineerId - The engineer profile ID
   * @returns The Express Dashboard login URL
   * @throws Error if the request fails or no engineer account exists
   */
  async createEngineerLoginLink(engineerId: string): Promise<string> {
    console.info(`[ApiManager] Creating engineer login link for profile: ${engineerId}`);

    try {
      const { url } = await this.makeAuthenticatedPostRequest<{ url: string }>(
        'billing-links',
        {
          link_type: 'create_engineer_login',
          payload: {
            engineer_id: engineerId
          }
        },
        'Failed to create engineer login link'
      );

      if (!url) {
        throw new Error('No URL returned from engineer login service');
      }

      console.info(`[ApiManager] Successfully created engineer login link`);
      return url;

    } catch (err) {
      const error = err as Error;
      console.error('[ApiManager] Error creating engineer login link:', error.message);
      throw error;
    }
  }

  /**
   * Fetches the credit balance for a given profile
   * @param profileId - The user profile ID
   * @returns The credit balance amount
   * @throws Error if the request fails
   */
  async fetchCreditBalance(profileId: string): Promise<CreditBalanceResponse> {
    console.info(`[ApiManager] Fetching credit balance for profile: ${profileId}`);

    try {
      const creditBalanceResponse = await this.makeAuthenticatedGetRequest<CreditBalanceResponse>(
        'billing_credits/credit_balance',
        { profile_id: profileId },
        'Failed to fetch credit balance'
      );

      console.info(`[ApiManager] Successfully fetched credit balance: ${creditBalanceResponse.creditBalance}, pending credits: ${creditBalanceResponse.pendingCredits}`);
      return creditBalanceResponse;

    } catch (err) {
      const error = err as Error;
      console.error('[ApiManager] Error fetching credit balance:', error.message);
      throw error;
    }
  }

  /**
   * Fetches all active credit purchase products
   * @returns Array of available products with pricing information
   * @throws Error if the request fails
   */
  async fetchProducts(): Promise<ProductsResponse> {
    console.info(`[ApiManager] Fetching products`);

    try {
      const productsResponse = await this.makeAuthenticatedGetRequest<ProductsResponse>(
        'billing_credits/products',
        {},
        'Failed to fetch products'
      );

      console.info(`[ApiManager] Successfully fetched ${productsResponse.products.length} products`);
      return productsResponse;

    } catch (err) {
      const error = err as Error;
      console.error('[ApiManager] Error fetching products:', error.message);
      throw error;
    }
  }

  /**
   * Creates a checkout session for a one-time credit purchase
   * Redirects user to Stripe Checkout to complete the purchase
   * @param profileId - The user profile ID
   * @param priceId - The Stripe price ID of the product to purchase
   * @returns The checkout session URL to redirect the user to
   * @throws Error if the request fails
   */
  async createProductCheckoutSession(profileId: string, priceId: string): Promise<CheckoutSessionResponse> {
    console.info(`[ApiManager] Creating product checkout session for profile: ${profileId}, price: ${priceId}`);

    try {
      const checkoutResponse = await this.makeAuthenticatedPostRequest<CheckoutSessionResponse>(
        'billing_credits/product_checkout',
        { profile_id: profileId, price_id: priceId },
        'Failed to create product checkout session'
      );

      console.info(`[ApiManager] Successfully created product checkout session`);
      return checkoutResponse;

    } catch (err) {
      const error = err as Error;
      console.error('[ApiManager] Error creating product checkout session:', error.message);
      throw error;
    }
  }

  /**
   * Creates a Stripe Customer Session for subscription purchases
   * Used to enable existing customers to use the pricing table with pre-populated data
   * @param profileId - The user profile ID
   * @returns The customer session client secret for the pricing table
   * @throws Error if the request fails
   */
  async createSubscriptionCheckoutSession(profileId: string): Promise<CustomerSessionResponse> {
    console.info(`[ApiManager] Creating subscription checkout session for profile: ${profileId}`);

    try {
      const sessionResponse = await this.makeAuthenticatedPostRequest<CustomerSessionResponse>(
        'billing_credits/subscription_checkout',
        { profile_id: profileId },
        'Failed to create subscription checkout session'
      );

      console.info(`[ApiManager] Successfully created subscription checkout session`);
      return sessionResponse;

    } catch (err) {
      const error = err as Error;
      console.error('[ApiManager] Error creating subscription checkout session:', error.message);
      throw error;
    }
  }

  /**
   * Fetches ICE servers (STUN/TURN) for WebRTC connections
   * @returns The ICE servers configuration
   * @throws Error if the request fails
   */
  async getICEServers(): Promise<ICEServersResponse> {
    console.info(`[ApiManager] Fetching ICE servers`);

    try {
      const response = await this.makeAuthenticatedGetRequest<ICEServersResponse>(
        'get-ice-servers',
        {},
        'Failed to fetch ICE servers'
      );

      console.info(`[ApiManager] Successfully fetched ICE servers: ${response.iceServers.length} servers`);
      return response;

    } catch (err) {
      const error = err as Error;
      console.error('[ApiManager] Error fetching ICE servers:', error.message);
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
  private async makeAuthenticatedPostRequest<T>(
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
