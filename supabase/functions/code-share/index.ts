import { serve } from "server"
import { CodeShareHandler } from './CodeShareHandler.ts'
import { CodeShareOAuthHandler } from './CodeShareOAuthHandler.ts'
import { CodeShareServiceGitHub } from '@services/CodeShare/index.ts'
import { GitHubOAuthService } from '@services/GitHubOAuth/index.ts'
import { GitHubIntegrationStoreSupabase } from '@stores/GitHubIntegration/index.ts'
import { ProjectRepositoryStoreSupabase } from '@stores/ProjectRepository/index.ts'
import { RepositoryCollaboratorStoreSupabase } from '@stores/RepositoryCollaborator/index.ts'
import { createClient } from "supabase"
import { Octokit } from "octokit"

export const handler = async (request: Request): Promise<Response> => {
  const allowedOrigins = ['https://unjam.nickreffitt.com', 'http://localhost:5175']
  const origin = request.headers.get('Origin') || ''
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://unjam.nickreffitt.com'

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
    const body = await request.text()
    const { action_type, payload } = JSON.parse(body)

    if (!action_type || !payload) {
      return new Response(
        JSON.stringify({ error: 'action_type and payload are required' }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
      )
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No Authorization header' }),
        { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
      )
    }

    // Initialize services
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const integrationStore = new GitHubIntegrationStoreSupabase(supabase)
    const repositoryStore = new ProjectRepositoryStoreSupabase(supabase)
    const collaboratorStore = new RepositoryCollaboratorStoreSupabase(supabase)

    let result: any

    // Route to appropriate handler based on action_type
    if (action_type === 'oauth_callback') {
      // OAuth callback doesn't require existing integration
      const githubClientId = Deno.env.get('GH_CLIENT_ID') as string
      const githubClientSecret = Deno.env.get('GH_CLIENT_SECRET') as string

      const oauthService = new GitHubOAuthService(githubClientId, githubClientSecret)
      const oauthHandler = new CodeShareOAuthHandler(integrationStore, oauthService)

      result = await oauthHandler.handleOAuthCallback(payload)
    } else {
      console.debug(`Payload = ${JSON.stringify(payload)}`)
      // These actions require an existing GitHub integration
      const integration = await integrationStore.getByCustomerId(payload.customer_id)

      if (!integration) {
        return new Response(
          JSON.stringify({ error: 'GitHub integration not found. Please authenticate first.' }),
          { status: 403, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
        )
      }

      const octokit = new Octokit({ auth: integration.githubAccessToken })
      const codeShareService = new CodeShareServiceGitHub(octokit)

      // Construct webhook URL and get secret
      const webhookUrl = `${supabaseUrl}/functions/v1/code-share-webhook`
      const webhookSecret = Deno.env.get('GITHUB_WEBHOOK_SIGNING_SECRET') as string

      const handler = new CodeShareHandler(
        repositoryStore,
        collaboratorStore,
        codeShareService,
        webhookUrl,
        webhookSecret
      )

      switch (action_type) {
        case 'validate_repository':
          result = await handler.validateRepository(payload)
          break
        case 'invite_collaborator':
          result = await handler.inviteCollaborator(payload)
          break
        case 'remove_collaborator':
          result = await handler.removeCollaborator(payload)
          break
        default:
          return new Response(
            JSON.stringify({ error: `Unknown action_type: ${action_type}` }),
            { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
          )
      }
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
    )

  } catch (err) {
    const error = err as Error
    console.error('[code-share] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } }
    )
  }
}

if (import.meta.main) {
  console.info('Code Share function starting...')
  serve(handler)
}
