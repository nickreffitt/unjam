import { serve } from "server"
import { BillingCustomerStoreSupabase } from '@stores/BillingCustomer/BillingCustomerStoreSupabase.ts'
import { BillingLinksServiceStripe } from '@services/BillingLinksServiceStripe.ts'
import { type BillingCustomerStore } from "@stores/BillingCustomer/BillingCustomerStore.ts";
import { type BillingLinksService } from "@services/BillingLinksService.ts";
import { createClient } from "supabase";
import Stripe from "stripe";

console.debug("Stripe Links function loaded")

export const handler = async (request: Request): Promise<Response> => {
  const allowedOrigins = ['https://unjam.nickreffitt.com', 'http://localhost:5175']
  const origin = request.headers.get('Origin') || ''
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://unjam.nickreffitt.com'

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    // Parse request body
    const body = await request.text()
    console.info('About to handle request body: ', body)
    const { profile_id } = JSON.parse(body)
    console.info('Request contains profile_id: ', profile_id)
    if (!profile_id) {
      console.error('[stripe-links] Missing profile_id in request')
      return new Response(
        JSON.stringify({ error: 'profile_id is required' }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
      )
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      console.error(`[stripe-links] No Authorization header set`)
      return new Response(
        JSON.stringify({ error: 'No Authorization header set' }),
        { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
      )
    }

    console.info(`[stripe-links] Creating billing portal session for profile: ${profile_id}`)

    // Initialize services
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    const stripeApiKey = Deno.env.get('STRIPE_API_KEY') as string

    const supabase = createClient(supabaseUrl, supabaseServiceKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )
    const stripe = new Stripe(stripeApiKey, {
      apiVersion: '2025-08-27.basil'
    })

    const billingCustomerStore: BillingCustomerStore = new BillingCustomerStoreSupabase(supabase)
    const billingLinksService: BillingLinksService = new BillingLinksServiceStripe(stripe)

    // Fetch the billing customer by profile ID
    const stripeCustomerId = await billingCustomerStore.getByProfileId(profile_id)

    if (!stripeCustomerId) {
      console.error(`[stripe-links] No billing customer found for profile: ${profile_id}`)
      return new Response(
        JSON.stringify({ error: 'No billing customer found for this profile' }),
        { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
      )
    }

    // Create billing portal session
    const portalUrl = await billingLinksService.createBillingPortalSession(stripeCustomerId)

    console.info(`[stripe-links] Successfully created portal session for profile ${profile_id}`)

    return new Response(
      JSON.stringify({ url: portalUrl }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
    )

  } catch (err) {
    const error = err as Error
    console.error('[stripe-links] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
    )
  }
}

// Only start server if running in Supabase (not imported as module)
if (import.meta.main) {
  console.info('🔗 Stripe Links function starting...')
  serve(handler)
}
