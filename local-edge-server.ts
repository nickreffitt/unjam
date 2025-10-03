#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Import the edge function handlers
const { handler: billingLinksHandler } = await import('./supabase/functions/billing-links/index.ts')
const { handler: customerBillingWebhookHandler } = await import('./supabase/functions/customer-billing-webhook/index.ts')

const PORT = 8001

serve(async (req) => {
  const url = new URL(req.url)

  // Route to hello-world function
  if (url.pathname === '/billing-links') {
    return await billingLinksHandler(req)
  }

  // Route to customer-billing-webhook function
  if (url.pathname === '/customer-billing-webhook') {
    return await customerBillingWebhookHandler(req)
  }

  // Default response for other routes
  return new Response(
    JSON.stringify({
      message: 'Local Edge Function Server',
      availableEndpoints: ['/billing-links', '/customer-billing-webhook'],
      timestamp: new Date().toISOString()
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  )
}, { port: PORT })