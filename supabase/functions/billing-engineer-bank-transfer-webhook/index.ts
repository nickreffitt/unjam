import { serve } from "server"
import { createClient } from "supabase"
import { BankTransferEventHandler } from "./BankTransferEventHandler.ts"

// Initialize environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const airwallexWebhookSecret = Deno.env.get('AIRWALLEX_WEBHOOK_SECRET') as string

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Initialize handler with dependencies
const bankTransferEventHandler = new BankTransferEventHandler(airwallexWebhookSecret, supabase)

export const handler = async (request: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-timestamp, x-signature',
      },
    })
  }

  // Only allow POST requests for webhooks
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        message: 'Bank transfer webhooks require POST requests'
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
    // Extract Airwallex webhook headers
    const timestamp = request.headers.get('x-timestamp')
    const signature = request.headers.get('x-signature')

    if (!timestamp) {
      console.error('[billing-engineer-bank-transfer-webhook] Missing x-timestamp header')
      return new Response(
        JSON.stringify({
          error: 'Missing timestamp',
          message: 'x-timestamp header is required'
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

    if (!signature) {
      console.error('[billing-engineer-bank-transfer-webhook] Missing x-signature header')
      return new Response(
        JSON.stringify({
          error: 'Missing signature',
          message: 'x-signature header is required'
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

    // Get the raw request body - IMPORTANT: must use raw body before any parsing
    const body = await request.text()

    console.info('[billing-engineer-bank-transfer-webhook] Received webhook', {
      timestamp,
      bodyLength: body.length
    })

    // Delegate to BankTransferEventHandler to verify signature and process the event
    await bankTransferEventHandler.handleEvent(body, signature, timestamp)

    // Return success response immediately (as per Airwallex best practices)
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
    console.error('[billing-engineer-bank-transfer-webhook] Error processing webhook:', error)

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
  console.info('🎣 billing-engineer-bank-transfer-webhook function starting...')
  serve(handler)
}
