import { serve } from "server"

console.debug("Get ICE Servers function loaded")

export const handler = async (request: Request): Promise<Response> => {
  const origin = request.headers.get('Origin')
  // Allow all origins for WebRTC functionality (both dashboard and extension need access)
  const corsOrigin = origin || '*'

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    // Validate authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      console.error(`[get-ice-servers] No Authorization header set`)
      return new Response(
        JSON.stringify({ error: 'No Authorization header set' }),
        { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
      )
    }

    // Only accept GET requests
    if (request.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
      )
    }

    // Get API key and URL from environment
    const apiKey = Deno.env.get('METERED_CA_API_KEY')
    const apiUrl = Deno.env.get('METERED_CA_URL')

    if (!apiKey || !apiUrl) {
      console.error('[get-ice-servers] Missing API key or URL')
      return new Response(
        JSON.stringify({ error: 'Missing API key or URL configuration' }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
      )
    }

    // Fetch TURN credentials from Metered.ca
    console.debug('[get-ice-servers] Fetching TURN credentials from Metered.ca')

    const response = await fetch(`${apiUrl}?apiKey=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const iceServers = await response.json()

    console.debug('[get-ice-servers] Successfully fetched ICE servers', {
      serverCount: iceServers.length,
    })

    return new Response(
      JSON.stringify({ iceServers }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
    )

  } catch (err) {
    const error = err as Error
    console.error('[get-ice-servers] Error fetching TURN servers:', error.message)

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
    )
  }
}

// Only start server if running in Supabase (not imported as module)
if (import.meta.main) {
  console.info('🧊 Get ICE Servers function starting...')
  serve(handler)
}
