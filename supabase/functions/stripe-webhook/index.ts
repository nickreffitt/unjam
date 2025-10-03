import { serve } from "server"
import { createClient } from "supabase"
import Stripe from "stripe"
import { BillingEventHandler } from "./BillingEventHandler.ts"
import { BillingEventConverterLocal, BillingEventConverterStripe } from "@events/index.ts"
import { BillingCustomerStoreSupabase } from "@stores/BillingCustomer/index.ts"
import { BillingSubscriptionStoreSupabase } from "@stores/BillingSubscription/index.ts"
import { BillingSubscriptionServiceStripe } from "@services/BillingSubscription/index.ts"
import { BillingInvoiceStoreSupabase } from "@stores/BillingInvoice/index.ts"
import { BillingCreditsServiceStripe } from "@services/BillingCredits/index.ts"

// Initialize environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const stripeApiKey = Deno.env.get('STRIPE_API_KEY') as string
const enableStripe = Deno.env.get('WEBHOOKS_ENABLE_STRIPE')

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const stripe = new Stripe(stripeApiKey, {
  apiVersion: '2025-09-30.clover'
})

// Initialize stores and services
const customerStore = new BillingCustomerStoreSupabase(supabase)
const subscriptionStore = new BillingSubscriptionStoreSupabase(supabase)
const invoiceStore = new BillingInvoiceStoreSupabase(supabase)
const creditsService = new BillingCreditsServiceStripe(stripe)
const subscriptionService = new BillingSubscriptionServiceStripe(stripe, creditsService)

// Initialize converter based on environment
const converter = enableStripe
  ? new BillingEventConverterStripe(
      stripeApiKey,
      Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET') as string
    )
  : new BillingEventConverterLocal()

// Initialize handler with all dependencies
const billingEventHandler = new BillingEventHandler(
  converter,
  customerStore,
  subscriptionStore,
  subscriptionService,
  invoiceStore
)

export const handler = async (request: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
      },
    })
  }

  // Only allow POST requests for webhooks
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        message: 'Stripe webhooks require POST requests'
      }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }

  try {
    const signature = request.headers.get('Stripe-Signature')

    if (!signature) {
      console.error('[stripe-webhook] Missing Stripe-Signature header')
      return new Response(
        JSON.stringify({
          error: 'Missing signature',
          message: 'Stripe-Signature header is required'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Get the raw request body
    const body = await request.text()

    // Delegate to BillingEventHandler to convert and persist the event
    await billingEventHandler.handleEvent(body, signature)

    // Return success response
    return new Response(
      JSON.stringify({
        received: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('[stripe-webhook] Error processing webhook:', error)

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    const isSignatureError = errorMessage.includes('signature')

    return new Response(
      JSON.stringify({
        error: isSignatureError ? 'Invalid signature' : 'Internal server error',
        message: errorMessage
      }),
      {
        status: isSignatureError ? 400 : 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
}

// Only start server if running in Supabase (not imported as module)
if (import.meta.main) {
  console.info('🎣 Stripe webhook function starting...')
  serve(handler)
}