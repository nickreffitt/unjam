import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { EngineerAccount } from '@common/types';
import { BillingAccountStoreSupabase } from './BillingAccountStoreSupabase';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('BillingAccountStore Integration Tests', () => {
  let store: BillingAccountStoreSupabase;
  let supabase: SupabaseClient;
  let testProfileId: string;
  let testStripeAccountId: string;

  beforeAll(async () => {
    // Initialize Supabase client with service role key for testing
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    supabase = createClient(supabaseUrl, supabaseKey);

    store = new BillingAccountStoreSupabase(supabase);

    // Create a test engineer profile to use for billing account tests
    const { data: profileData } = await supabase
      .from('profiles')
      .insert({
        id: `test-engineer-${Date.now()}`,
        auth_id: `test-auth-${Date.now()}`,
        type: 'engineer',
        name: 'Test Engineer',
        email: 'test-engineer@example.com',
        github_username: 'testeng',
      })
      .select()
      .single();

    if (profileData) {
      testProfileId = profileData.id;
      testStripeAccountId = `acct_test${Date.now()}`;

      // Create a billing_engineers record
      await supabase
        .from('billing_engineers')
        .insert({
          profile_id: testProfileId,
          stripe_account_id: testStripeAccountId,
          email: 'test-engineer@example.com',
          details_submitted: true,
          charges_enabled: true,
          payouts_enabled: true,
          verification_status: 'active',
        });
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testStripeAccountId) {
      await supabase.from('billing_engineers').delete().eq('stripe_account_id', testStripeAccountId);
    }
    if (testProfileId) {
      await supabase.from('profiles').delete().eq('id', testProfileId);
    }
  });

  describe('getByProfileId', () => {
    it('returns account when found', async () => {
      // when getting account by profile ID
      const foundAccount = await store.getByProfileId(testProfileId);

      // then the account should be found
      expect(foundAccount).not.toBeNull();
    });

    it('returns null when not found', async () => {
      // when getting account for non-existent profile
      const foundAccount = await store.getByProfileId('non-existent-profile-id');

      // then null should be returned
      expect(foundAccount).toBeNull();
    });
  });
});
