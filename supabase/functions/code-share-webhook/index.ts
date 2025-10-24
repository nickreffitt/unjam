import { serve } from "server"
import { createClient } from "supabase"
import { GitHubWebhookHandler } from "./GitHubWebhookHandler.ts"
import { GitHubWebhookEventConverterGitHub } from "@events/index.ts"
import { ProjectRepositoryStoreSupabase } from "@stores/ProjectRepository/index.ts"
import { RepositoryCollaboratorStoreSupabase } from "@stores/RepositoryCollaborator/index.ts"

// Initialize environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const githubWebhookSecret = Deno.env.get('GITHUB_WEBHOOK_SIGNING_SECRET') as string

console.info('[code-share-webhook] Function initialized', {
  hasSupabaseUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  hasWebhookSecret: !!githubWebhookSecret,
  webhookSecretLength: githubWebhookSecret?.length
})

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Initialize stores
const repositoryStore = new ProjectRepositoryStoreSupabase(supabase)
const collaboratorStore = new RepositoryCollaboratorStoreSupabase(supabase)

// Initialize converter and handler
const converter = new GitHubWebhookEventConverterGitHub(githubWebhookSecret)
const webhookHandler = new GitHubWebhookHandler(
  converter,
  repositoryStore,
  collaboratorStore
)

export const handler = async (request: Request): Promise<Response> => {
  console.info('[code-share-webhook] Handler invoked', {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  })

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Hub-Signature-256, X-GitHub-Event',
      },
    })
  }

  // Only allow POST requests for webhooks
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        message: 'GitHub webhooks require POST requests'
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
    const signature = request.headers.get('X-Hub-Signature-256')
    const githubEvent = request.headers.get('X-GitHub-Event')

    console.info('[code-share-webhook] Received webhook request', {
      event: githubEvent,
      hasSignature: !!signature,
      signaturePrefix: signature?.substring(0, 15) + '...',
      hasWebhookSecret: !!githubWebhookSecret,
      secretPrefix: githubWebhookSecret?.substring(0, 8) + '...'
    })

    if (!signature) {
      console.error('[code-share-webhook] Missing X-Hub-Signature-256 header')
      return new Response(
        JSON.stringify({
          error: 'Missing signature',
          message: 'X-Hub-Signature-256 header is required'
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

    if (!githubEvent) {
      console.error('[code-share-webhook] Missing X-GitHub-Event header')
      return new Response(
        JSON.stringify({
          error: 'Missing event type',
          message: 'X-GitHub-Event header is required'
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

    // Get the raw request body
    const body = await request.text()

    console.info('[code-share-webhook] Processing webhook', {
      bodyLength: body.length,
      bodyPreview: body.substring(0, 100) + '...'
    })

    // Handle ping events (GitHub webhook verification)
    if (githubEvent === 'ping') {
      console.info('[code-share-webhook] Received ping event - webhook configured successfully')
      return new Response(
        JSON.stringify({
          message: 'pong',
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
    }

    // Delegate to GitHubWebhookHandler to process the event
    await webhookHandler.handleEvent(body, signature, githubEvent)

    // Return success response
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
    console.error('[code-share-webhook] Error processing webhook:', error)

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    const isSignatureError = errorMessage.includes('signature')
    const isUnsupportedEvent = errorMessage.includes('Unsupported') || errorMessage.includes('Unhandled')

    return new Response(
      JSON.stringify({
        error: isSignatureError ? 'Invalid signature' : isUnsupportedEvent ? 'Unsupported event' : 'Internal server error',
        message: errorMessage
      }),
      {
        status: isSignatureError ? 401 : isUnsupportedEvent ? 200 : 500,
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
  console.info('>� code-share-webhook function starting...')
  serve(handler)
}
