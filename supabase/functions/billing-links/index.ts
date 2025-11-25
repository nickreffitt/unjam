import { serve } from "server"
import { BillingCustomerStoreSupabase } from '@stores/BillingCustomer/index.ts'
import { BillingEngineerStoreSupabase } from '@stores/BillingEngineer/index.ts'
import { BillingEngineerBankTransferAccountStoreSupabase } from '@stores/BillingEngineerBankTransferAccount/index.ts'
import { BillingLinksServiceStripe } from '@services/BillingLinks/index.ts'
import { BillingEngineerAccountServiceStripe } from '@services/BillingEngineerAccount/index.ts'
import { BillingEngineerBankTransferAccountServiceAirwallex } from '@services/BillingEngineerBankTransferAccount/index.ts'
import { BillingLinksHandler } from './BillingLinksHandler.ts'
import { createClient } from "supabase";
import Stripe from "stripe";
import { getDashboardCorsOrigin } from "@config/cors.ts";

console.debug("Billing Links function loaded")

export const handler = async (request: Request): Promise<Response> => {
  const origin = request.headers.get('Origin')
  const corsOrigin = getDashboardCorsOrigin(origin)

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
    const airWallexURL = Deno.env.get('AIRWALLEX_URL') as string
    const airWallexClientId = Deno.env.get('AIRWALLEX_CLIENT_ID') as string
    const airWallexApiKey = Deno.env.get('AIRWALLEX_API_KEY') as string

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
    const bankTransferAccountStore = new BillingEngineerBankTransferAccountStoreSupabase(supabase)
    const linksService = new BillingLinksServiceStripe(stripe)
    const engineerAccountService = new BillingEngineerAccountServiceStripe(stripe)
    const bankTransferAccountService = new BillingEngineerBankTransferAccountServiceAirwallex(airWallexURL, airWallexClientId, airWallexApiKey)
    const billingLinksHandler = new BillingLinksHandler(
      customerStore,
      engineerStore,
      linksService,
      engineerAccountService,
      bankTransferAccountService,
      bankTransferAccountStore
    )

    // Route to appropriate handler based on link_type
    switch (link_type) {
      case 'create_portal': {
        const url = await billingLinksHandler.createPortalLink(payload, origin)
        return new Response(
          JSON.stringify({ url }),
          { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
        )
      }
      case 'create_engineer_account': {
        const url = await billingLinksHandler.createEngineerAccountLink(payload, origin)
        return new Response(
          JSON.stringify({ url }),
          { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
        )
      }
      case 'create_engineer_login': {
        const url = await billingLinksHandler.createEngineerLoginLink(payload)
        return new Response(
          JSON.stringify({ url }),
          { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
        )
      }
      case 'create_engineer_beneficiary_auth_code': {
        const authCodeResponse = await billingLinksHandler.createEngineerBeneficiaryAuthCode(payload)
        return new Response(
          JSON.stringify(authCodeResponse),
          { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
        )
      }
      case 'create_engineer_beneficiary': {
        const beneficiary = await billingLinksHandler.createEngineerBeneficiary(payload)
        return new Response(
          JSON.stringify(beneficiary),
          { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
        )
      }
      case 'delete_engineer_beneficiary': {
        await billingLinksHandler.deleteEngineerBeneficiary(payload)
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
        )
      }
      default:
        console.error(`[billing-links] Unknown link_type: ${link_type}`)
        return new Response(
          JSON.stringify({ error: `Unknown link_type: ${link_type}` }),
          { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
        )
    }

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
