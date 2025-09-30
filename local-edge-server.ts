#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Import the edge function handlers
const { handler: helloWorldHandler } = await import('./supabase/functions/hello-world/index.ts')
const { handler: stripeWebhookHandler } = await import('./supabase/functions/stripe-webhook/index.ts')

const PORT = 8001

console.log(`🚀 Local edge function server running on http://localhost:${PORT}`)
console.log(`📡 Hello World function available at http://localhost:${PORT}/hello-world`)
console.log(`🎣 Stripe webhook function available at http://localhost:${PORT}/stripe-webhook`)
console.log(`\n📋 Test with:`)
console.log(`   curl -X POST http://localhost:${PORT}/hello-world \\`)
console.log(`        -H "Content-Type: application/json" \\`)
console.log(`        -d '{"name": "Developer"}'`)
console.log(`\n   curl -X POST http://localhost:${PORT}/stripe-webhook \\`)
console.log(`        -H "Content-Type: application/json" \\`)
console.log(`        -H "Stripe-Signature: test" \\`)
console.log(`        -d '{"test": "webhook"}'`)

serve(async (req) => {
  const url = new URL(req.url)

  // Route to hello-world function
  if (url.pathname === '/hello-world') {
    return await helloWorldHandler(req)
  }

  // Route to stripe-webhook function
  if (url.pathname === '/stripe-webhook') {
    return await stripeWebhookHandler(req)
  }

  // Default response for other routes
  return new Response(
    JSON.stringify({
      message: 'Local Edge Function Server',
      availableEndpoints: ['/hello-world', '/stripe-webhook'],
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