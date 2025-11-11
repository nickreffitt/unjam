import { serve } from "server"
import { createClient } from "supabase";
import Stripe from "stripe";
import { BillingEngineerTransferStoreSupabase } from "@stores/BillingEngineerTransfer/index.ts";
import { BillingEngineerStoreSupabase } from "@stores/BillingEngineer/index.ts";
import { BillingEngineerPayoutServiceStripe } from "@services/BillingEngineerPayout/index.ts";
import { BillingBalanceServiceStripe } from "@services/BillingBalance/index.ts";
import { RetryPendingTransfersHandler } from "./RetryPendingTransfersHandler.ts";

console.debug("Retry Pending Transfers processor loaded")

export const handler = async (request: Request): Promise<Response> => {
  try {
    // Validate HTTP method
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed. Use POST.'
        }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Allow': 'POST'
          }
        }
      )
    }

    console.info('⏰ Retry Pending Transfers processor starting...')

    // Get service role key from environment
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    const supabaseUrl = Deno.env.get('SUPABASE_URL')

    if (!supabaseUrl) {
      throw new Error('Supabase URL must be configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Initialize Stripe
    const stripeApiKey = Deno.env.get('STRIPE_API_KEY') as string
    const stripe = new Stripe(stripeApiKey, {
      apiVersion: '2025-09-30.clover'
    })

    // Initialize stores and services
    const transferStore = new BillingEngineerTransferStoreSupabase(supabase)
    const engineerStore = new BillingEngineerStoreSupabase(supabase)
    const payoutService = new BillingEngineerPayoutServiceStripe(stripe)
    const balanceService = new BillingBalanceServiceStripe(stripe)

    // Create handler and process transfers
    const handler = new RetryPendingTransfersHandler(
      transferStore,
      engineerStore,
      payoutService,
      balanceService
    )

    const result = await handler.processPendingTransfers()

    console.info('✅ Retry Pending Transfers processor finished')

    return new Response(
      JSON.stringify({
        success: true,
        ...result
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (err) {
    const error = err as Error
    console.error('[retry-pending-transfers] Unexpected error:', error.message)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Only start server if running in Supabase (not imported as module)
if (import.meta.main) {
  console.info('⏰ Retry Pending Transfers edge function starting...')
  serve(handler)
}
