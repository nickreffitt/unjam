import { serve } from "server"
import { BillingCreditsHandler } from './BillingCreditsHandler.ts'
import { createClient } from "supabase";
import Stripe from "stripe";
import { BillingCustomerStoreSupabase } from "@stores/BillingCustomer/index.ts";
import { BillingSubscriptionServiceStripe } from "@services/BillingSubscription/index.ts";
import { BillingCreditsServiceStripe } from "@services/BillingCredits/index.ts";

console.debug("Billing Credits function loaded")

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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      console.error(`[billing-credits] No Authorization header set`)
      return new Response(
        JSON.stringify({ error: 'No Authorization header set' }),
        { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
      )
    }

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
      apiVersion: '2025-09-30.clover'
    })

    const customerStore = new BillingCustomerStoreSupabase(supabase)
    const creditsService = new BillingCreditsServiceStripe(stripe)
    const subscriptionService = new BillingSubscriptionServiceStripe(stripe, creditsService)
    const billingCreditsHandler = new BillingCreditsHandler(customerStore, subscriptionService, creditsService)

    // Handle GET request - fetch credit balance
    if (request.method === 'GET') {
      const url = new URL(request.url)
      const profileId = url.searchParams.get('profile_id')

      if (!profileId) {
        console.error('[billing-credits] Missing profile_id in GET request')
        return new Response(
          JSON.stringify({ error: 'profile_id is required' }),
          { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
        )
      }

      const creditBalance = await billingCreditsHandler.fetchCreditBalance(profileId)

      return new Response(
        JSON.stringify({ creditBalance }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
      )
    }

    // Handle POST request - process credit transfer
    if (request.method === 'POST') {
      const body = await request.text()
      console.info('About to handle request body: ', body)

      const payload = JSON.parse(body)

      if (!payload.profile_id || !payload.ticket_id) {
        console.error('[billing-credits] Missing profile_id or ticket_id in request')
        return new Response(
          JSON.stringify({ error: 'profile_id and ticket_id are required' }),
          { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
        )
      }

      await billingCreditsHandler.processCreditTransfer(payload)

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
      )
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
    )

  } catch (err) {
    const error = err as Error
    console.error('[billing-credits] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
    )
  }
}

// Only start server if running in Supabase (not imported as module)
if (import.meta.main) {
  console.info('💳 Billing Credits function starting...')
  serve(handler)
}
