import { serve } from "server"
import { BillingCreditsHandler } from './BillingCreditsHandler.ts'
import { createClient } from "supabase";
import Stripe from "stripe";
import { BillingCustomerStoreSupabase } from "@stores/BillingCustomer/index.ts";
import { ProfileStoreSupabase } from "@stores/Profile/index.ts";
import { TicketStoreSupabase } from "@stores/Ticket/index.ts";
import { BillingSubscriptionServiceStripe } from "@services/BillingSubscription/index.ts";
import { BillingCreditsServiceStripe } from "@services/BillingCredits/index.ts";
import { BillingCustomerServiceStripe } from "@services/BillingCustomer/index.ts";
import { BillingLinksServiceStripe } from "@services/BillingLinks/index.ts";
import { BillingProductServiceStripe } from "@services/BillingProduct/index.ts";
import type { CreditBalanceRequest, CustomerSessionRequest, ProductsRequest, CheckoutSessionRequest } from "@types";
import { getExtensionCorsOrigin } from "@config/cors.ts";

console.debug("Billing Credits function loaded")

export const handler = async (request: Request): Promise<Response> => {
  const origin = request.headers.get('Origin')
  const corsOrigin = getExtensionCorsOrigin(origin)

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

    // Initialize stores
    const customerStore = new BillingCustomerStoreSupabase(supabase)
    const profileStore = new ProfileStoreSupabase(supabase)
    const ticketStore = new TicketStoreSupabase(supabase)

    // Initialize services
    const creditsService = new BillingCreditsServiceStripe(stripe) // Uses 'ticket_completed' meter by default
    const subscriptionService = new BillingSubscriptionServiceStripe(stripe)
    const customerService = new BillingCustomerServiceStripe(stripe)
    const linksService = new BillingLinksServiceStripe(stripe)
    const productService = new BillingProductServiceStripe(stripe)

    // Initialize handler with all dependencies
    const billingCreditsHandler = new BillingCreditsHandler(
      customerStore,
      profileStore,
      subscriptionService,
      creditsService,
      customerService,
      productService,
      linksService,
      ticketStore
    )

    // Handle GET request
    if (request.method === 'GET') {
      const url = new URL(request.url)
      const path = url.pathname

      // GET /billing_credits/products - fetch products
      if (path.endsWith('/products')) {
        console.info('[billing-credits] Fetching products')
        const productsRequest: ProductsRequest = {}
        const response = await billingCreditsHandler.fetchProducts(productsRequest)

        return new Response(
          JSON.stringify(response),
          { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
        )
      }

      // GET /billing_credits/credit_balance?profile_id=... - fetch credit balance
      if (path.endsWith('/credit_balance')) {
        const profileId = url.searchParams.get('profile_id')

        if (!profileId) {
          console.error('[billing-credits] Missing profile_id in credit_balance request')
          return new Response(
            JSON.stringify({ error: 'profile_id is required' }),
            { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
          )
        }

        const balanceRequest: CreditBalanceRequest = { profile_id: profileId }
        const response = await billingCreditsHandler.fetchCreditBalance(balanceRequest)

        return new Response(
          JSON.stringify(response),
          { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
        )
      }

      // No matching GET endpoint
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
      )
    }

    // Handle POST request
    if (request.method === 'POST') {
      const url = new URL(request.url)
      const path = url.pathname
      const body = await request.json()

      // POST /billing_credits/product_checkout - create checkout session for one-time credit purchase
      if (path.endsWith('/product_checkout')) {
        const { profile_id, price_id } = body

        if (!profile_id || !price_id) {
          console.error('[billing-credits] Missing profile_id or price_id in product_checkout request')
          return new Response(
            JSON.stringify({ error: 'profile_id and price_id are required' }),
            { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
          )
        }

        const checkoutRequest: CheckoutSessionRequest = { profile_id, price_id }
        const response = await billingCreditsHandler.createCheckoutSession(checkoutRequest, origin)

        return new Response(
          JSON.stringify(response),
          { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
        )
      }

      // POST /billing_credits/subscription_checkout - create customer session for subscription pricing table
      if (path.endsWith('/subscription_checkout')) {
        const { profile_id } = body

        if (!profile_id) {
          console.error('[billing-credits] Missing profile_id in subscription_checkout request')
          return new Response(
            JSON.stringify({ error: 'profile_id is required' }),
            { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
          )
        }

        const sessionRequest: CustomerSessionRequest = { profile_id }
        const response = await billingCreditsHandler.createCustomerSession(sessionRequest)

        return new Response(
          JSON.stringify(response),
          { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
        )
      }

      // No matching POST endpoint
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
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
