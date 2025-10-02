#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Import the edge function handlers
const { handler: stripeLinksHandler } = await import('./supabase/functions/stripe-links/index.ts')
const { handler: stripeWebhookHandler } = await import('./supabase/functions/stripe-webhook/index.ts')

const PORT = 8001

serve(async (req) => {
  const url = new URL(req.url)

  // Route to hello-world function
  if (url.pathname === '/stripe-links') {
    return await stripeLinksHandler(req)
  }

  // Route to stripe-webhook function
  if (url.pathname === '/stripe-webhook') {
    return await stripeWebhookHandler(req)
  }

  // Default response for other routes
  return new Response(
    JSON.stringify({
      message: 'Local Edge Function Server',
      availableEndpoints: ['/stripe-links', '/stripe-webhook'],
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