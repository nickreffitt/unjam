import { serve } from "server"

console.debug("Get ICE Servers function loaded")

const METERED_API_URL = 'https://unjam.metered.live/api/v1/turn/credentials';

const FALLBACK_STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.relay.metered.ca:80' },
];

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

    // Get API key from environment
    const apiKey = Deno.env.get('METERED_CA_API_KEY')

    if (!apiKey) {
      console.warn('[get-ice-servers] No API key found, returning fallback STUN servers')
      return new Response(
        JSON.stringify({ iceServers: FALLBACK_STUN_SERVERS }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
      )
    }

    // Fetch TURN credentials from Metered.ca
    console.debug('[get-ice-servers] Fetching TURN credentials from Metered.ca')

    const response = await fetch(`${METERED_API_URL}?apiKey=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const turnServers = await response.json()

    // Combine STUN servers with TURN servers from API
    const iceServers = [
      ...FALLBACK_STUN_SERVERS,
      ...turnServers,
    ]

    console.debug('[get-ice-servers] Successfully fetched ICE servers', {
      stunServers: FALLBACK_STUN_SERVERS.length,
      turnServers: turnServers.length,
      total: iceServers.length,
    })

    return new Response(
      JSON.stringify({ iceServers }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
    )

  } catch (err) {
    const error = err as Error
    console.error('[get-ice-servers] Error fetching TURN servers, returning fallback STUN servers:', error.message)

    // Return fallback STUN servers on error
    return new Response(
      JSON.stringify({ iceServers: FALLBACK_STUN_SERVERS }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
    )
  }
}

// Only start server if running in Supabase (not imported as module)
if (import.meta.main) {
  console.info('🧊 Get ICE Servers function starting...')
  serve(handler)
}
