import { serve } from "server"
import { BillingCustomerStoreSupabase } from '@stores/BillingCustomer/index.ts'
import { BillingEngineerStoreSupabase } from '@stores/BillingEngineer/index.ts'
import { BillingLinksServiceStripe } from '@services/BillingLinks/index.ts'
import { BillingEngineerAccountServiceStripe } from '@services/BillingEngineerAccount/index.ts'
import { BillingLinksHandler } from './BillingLinksHandler.ts'
import { createClient } from "supabase";
import Stripe from "stripe";

console.debug("Billing Links function loaded")

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

    const { link_type, payload } = JSON.parse(body)

    if (!link_type || !payload) {
      console.error('[billing-links] Missing link_type or payload in request')
      return new Response(
        JSON.stringify({ error: 'link_type and payload are required' }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
      )
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      console.error(`[billing-links] No Authorization header set`)
      return new Response(
        JSON.stringify({ error: 'No Authorization header set' }),
        { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
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
    const engineerStore = new BillingEngineerStoreSupabase(supabase)
    const linksService = new BillingLinksServiceStripe(stripe)
    const engineerAccountService = new BillingEngineerAccountServiceStripe(stripe)
    const billingLinksHandler = new BillingLinksHandler(customerStore, engineerStore, linksService, engineerAccountService)

    let url: string

    // Route to appropriate handler based on link_type
    switch (link_type) {
      case 'create_portal':
        url = await billingLinksHandler.createPortalLink(payload, origin)
        break
      case 'create_engineer_account':
        url = await billingLinksHandler.createEngineerAccountLink(payload, origin)
        break
      case 'create_engineer_login':
        url = await billingLinksHandler.createEngineerLoginLink(payload)
        break
      default:
        console.error(`[billing-links] Unknown link_type: ${link_type}`)
        return new Response(
          JSON.stringify({ error: `Unknown link_type: ${link_type}` }),
          { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
        )
    }

    return new Response(
      JSON.stringify({ url }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
    )

  } catch (err) {
    const error = err as Error
    console.error('[billing-links] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
    )
  }
}

// Only start server if running in Supabase (not imported as module)
if (import.meta.main) {
  console.info('🔗 Billing Links function starting...')
  serve(handler)
}
