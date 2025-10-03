import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiManager } from './ApiManager';
import { type SupabaseClient } from '@supabase/supabase-js';

describe('ApiManager', () => {
  let mockSupabaseClient: SupabaseClient;
  let apiManager: ApiManager;
  const edgeFunctionUrl = 'https://test.supabase.co/functions/v1';

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabaseClient = {
      auth: {
        getSession: vi.fn()
      }
    } as unknown as SupabaseClient;

    apiManager = new ApiManager(mockSupabaseClient, edgeFunctionUrl);

    // Reset fetch mock
    global.fetch = vi.fn();
  });

  describe('constructor', () => {
    it('should throw error when supabaseClient is not provided', () => {
      // Given no supabase client
      // When creating ApiManager
      // Then it should throw an error
      expect(() => new ApiManager(null as any, edgeFunctionUrl))
        .toThrow('ApiManager: supabaseClient is required');
    });

    it('should throw error when edgeFunctionUrl is not provided', () => {
      // Given no edge function URL
      // When creating ApiManager
      // Then it should throw an error
      expect(() => new ApiManager(mockSupabaseClient, ''))
        .toThrow('ApiManager: edgeFunctionUrl is required');
    });

    it('should create instance when all parameters are provided', () => {
      // Given valid parameters
      // When creating ApiManager
      const manager = new ApiManager(mockSupabaseClient, edgeFunctionUrl);

      // Then it should be created successfully
      expect(manager).toBeDefined();
    });
  });

  describe('createBillingPortalLink', () => {
    const profileId = 'profile-123';
    const mockAccessToken = 'mock-access-token';
    const mockPortalUrl = 'https://billing.stripe.com/session/test';

    it('should successfully create billing portal link', async () => {
      // Given a valid session and successful API response
      vi.mocked(mockSupabaseClient.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: mockAccessToken,
            user: {} as any
          } as any
        },
        error: null
      });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: mockPortalUrl })
      } as Response);

      // When creating a billing portal link
      const url = await apiManager.createBillingPortalLink(profileId);

      // Then it should return the portal URL
      expect(url).toBe(mockPortalUrl);

      // And it should call the edge function with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        `${edgeFunctionUrl}/billing-links`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockAccessToken}`
          },
          body: JSON.stringify({ profile_id: profileId })
        }
      );
    });

    it('should throw error when no active session exists', async () => {
      // Given no active session
      vi.mocked(mockSupabaseClient.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      });

      // When creating a billing portal link
      // Then it should throw an error
      await expect(apiManager.createBillingPortalLink(profileId))
        .rejects.toThrow('No active session found. Please sign in.');
    });

    it('should throw error when session retrieval fails', async () => {
      // Given a session error
      vi.mocked(mockSupabaseClient.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: new Error('Session error') as any
      });

      // When creating a billing portal link
      // Then it should throw an error
      await expect(apiManager.createBillingPortalLink(profileId))
        .rejects.toThrow('No active session found. Please sign in.');
    });

    it('should throw error when edge function returns error response', async () => {
      // Given a valid session but failed API response
      vi.mocked(mockSupabaseClient.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: mockAccessToken,
            user: {} as any
          } as any
        },
        error: null
      });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ error: 'No billing customer found for this profile' })
      } as Response);

      // When creating a billing portal link
      // Then it should throw the error from the API
      await expect(apiManager.createBillingPortalLink(profileId))
        .rejects.toThrow('No billing customer found for this profile');
    });

    it('should throw error when edge function returns no URL', async () => {
      // Given a valid session but response without URL
      vi.mocked(mockSupabaseClient.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: mockAccessToken,
            user: {} as any
          } as any
        },
        error: null
      });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: null })
      } as Response);

      // When creating a billing portal link
      // Then it should throw an error
      await expect(apiManager.createBillingPortalLink(profileId))
        .rejects.toThrow('No URL returned from billing portal service');
    });

    it('should handle network errors gracefully', async () => {
      // Given a valid session but network error
      vi.mocked(mockSupabaseClient.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: mockAccessToken,
            user: {} as any
          } as any
        },
        error: null
      });

      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      // When creating a billing portal link
      // Then it should throw the network error
      await expect(apiManager.createBillingPortalLink(profileId))
        .rejects.toThrow('Network error');
    });
  });
});
