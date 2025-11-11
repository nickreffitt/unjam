import { serve } from "server"
import { createClient } from "supabase";
import Stripe from "stripe";
import { TicketConsumer } from "./TicketConsumer.ts";
import { PaymentHandler } from "./PaymentHandler.ts";
import { BillingCustomerStoreSupabase } from "@stores/BillingCustomer/index.ts";
import { BillingEngineerStoreSupabase } from "@stores/BillingEngineer/index.ts";
import { BillingEngineerTransferStoreSupabase } from "@stores/BillingEngineerTransfer/index.ts";
import { TicketStoreSupabase } from "@stores/Ticket/index.ts";
import { BillingSubscriptionServiceStripe } from "@services/BillingSubscription/index.ts";
import { BillingCreditsServiceStripe } from "@services/BillingCredits/index.ts";
import { BillingMeterServiceStripe } from "@services/BillingMeter/index.ts";
import { BillingEngineerPayoutServiceStripe } from "@services/BillingEngineerPayout/index.ts";
import { BillingBalanceServiceStripe } from "@services/BillingBalance/index.ts";

console.debug("Ticket Payment queue processor loaded")

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

    console.info('⏰ Ticket Payment queue processor starting...')

    // Get service role key from environment
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

    // Initialize Supabase client with service role key for queue access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')

    if (!supabaseUrl) {
      const error = 'Supabase URL must be configured'
      console.error('[ticket-payment] Configuration error:', error)
      throw new Error(error)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Initialize Stripe
    const stripeApiKey = Deno.env.get('STRIPE_API_KEY') as string
    const stripe = new Stripe(stripeApiKey, {
      apiVersion: '2025-09-30.clover'
    })

    // Initialize stores
    const customerStore = new BillingCustomerStoreSupabase(supabase)
    const engineerStore = new BillingEngineerStoreSupabase(supabase)
    const transferStore = new BillingEngineerTransferStoreSupabase(supabase)
    const ticketStore = new TicketStoreSupabase(supabase)

    // Initialize services
    const subscriptionService = new BillingSubscriptionServiceStripe(stripe)
    const creditsService = new BillingCreditsServiceStripe(stripe)
    const meterService = new BillingMeterServiceStripe(stripe)
    const payoutService = new BillingEngineerPayoutServiceStripe(stripe)
    const balanceService = new BillingBalanceServiceStripe(stripe)

    // Initialize payment handler
    const paymentHandler = new PaymentHandler(
      customerStore,
      engineerStore,
      transferStore,
      ticketStore,
      subscriptionService,
      creditsService,
      meterService,
      payoutService,
      balanceService
    )

    const queueName = 'ticket_payments'
    const queueErrorName = 'ticket_payments_errors'
    const retrySleepSeconds = Number(Deno.env.get('TICKET_PAYMENT_QUEUE_RETRY_SECONDS'))
    const maxRetries = Number(Deno.env.get('TICKET_PAYMENT_QUEUE_MAX_RETRIES'))

    // Create consumer and process all ready messages
    const consumer = new TicketConsumer(supabase, paymentHandler, queueName, queueErrorName, retrySleepSeconds, maxRetries)
    const result = await consumer.processAllReadyMessages()

    console.info('✅ Ticket Payment queue processor finished')

    return new Response(
      JSON.stringify({
        success: true,
        processed: result.processed,
        errors: result.errors
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (err) {
    const error = err as Error
    console.error('[ticket-payment] Unexpected error:', error.message)
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
  console.info('⏰ Ticket Auto-Complete edge function starting...')
  serve(handler)
}
