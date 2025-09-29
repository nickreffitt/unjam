#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Set environment variable to indicate local development
Deno.env.set('ENVIRONMENT', 'local')

// Import the edge function handler
const { handler: helloWorldHandler } = await import('./supabase/functions/hello-world/index.ts')

const PORT = 8001

console.log(`🚀 Local edge function server running on http://localhost:${PORT}`)
console.log(`📡 Hello World function available at http://localhost:${PORT}/hello-world`)
console.log(`\n📋 Test with:`)
console.log(`   curl -X POST http://localhost:${PORT}/hello-world \\`)
console.log(`        -H "Content-Type: application/json" \\`)
console.log(`        -d '{"name": "Developer"}'`)

serve(async (req) => {
  const url = new URL(req.url)

  // Route to hello-world function
  if (url.pathname === '/hello-world') {
    return await helloWorldHandler(req)
  }

  // Default response for other routes
  return new Response(
    JSON.stringify({
      message: 'Local Edge Function Server',
      availableEndpoints: ['/hello-world'],
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