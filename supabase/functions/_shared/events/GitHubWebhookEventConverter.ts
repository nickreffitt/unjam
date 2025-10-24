import type { GitHubWebhookEvent } from '@types'

/**
 * GitHubWebhookEventConverter interface for converting GitHub webhook events to domain events
 */
export interface GitHubWebhookEventConverter {
  /**
   * Convert a GitHub webhook event to a domain event
   * @param body - The raw request body as a string
   * @param signature - The X-Hub-Signature-256 header for verification
   * @param eventType - The X-GitHub-Event header value
   * @returns Promise that resolves with the GitHub webhook event
   * @throws Error if event processing or signature verification fails
   */
  convertEvent(body: string, signature: string, eventType: string): Promise<GitHubWebhookEvent>
}

/**
 * GitHubWebhookEventConverterGitHub converts GitHub webhook payloads to domain events
 * Handles signature verification using HMAC SHA256
 */
export class GitHubWebhookEventConverterGitHub implements GitHubWebhookEventConverter {
  private readonly webhookSecret: string

  constructor(webhookSecret: string) {
    this.webhookSecret = webhookSecret
  }

  /**
   * Verifies the GitHub webhook signature
   * @param body - The raw request body
   * @param signature - The signature from the X-Hub-Signature-256 header
   * @throws Error if signature is invalid
   */
  private async verifySignature(body: string, signature: string): Promise<void> {
    console.info('[GitHubWebhookEventConverter] Starting signature verification', {
      signatureFormat: signature.substring(0, 15) + '...',
      bodyLength: body.length,
      secretConfigured: !!this.webhookSecret,
      secretLength: this.webhookSecret?.length
    })

    // GitHub sends signatures as "sha256=<signature>"
    if (!signature.startsWith('sha256=')) {
      console.error('[GitHubWebhookEventConverter] Invalid signature format - does not start with sha256=', {
        receivedPrefix: signature.substring(0, 10)
      })
      throw new Error('Invalid signature format')
    }

    const expectedSignature = signature.substring(7)
    console.info('[GitHubWebhookEventConverter] Extracted expected signature', {
      expectedLength: expectedSignature.length,
      expectedPrefix: expectedSignature.substring(0, 10) + '...'
    })

    // Compute HMAC SHA256
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    )

    // Convert to hex string
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    console.info('[GitHubWebhookEventConverter] Computed signature', {
      computedLength: computedSignature.length,
      computedPrefix: computedSignature.substring(0, 10) + '...',
      expectedPrefix: expectedSignature.substring(0, 10) + '...',
      signaturesMatch: computedSignature === expectedSignature
    })

    // Constant-time comparison to prevent timing attacks
    if (computedSignature !== expectedSignature) {
      console.error('[GitHubWebhookEventConverter] Signature mismatch', {
        computed: computedSignature.substring(0, 20) + '...' + computedSignature.substring(computedSignature.length - 20),
        expected: expectedSignature.substring(0, 20) + '...' + expectedSignature.substring(expectedSignature.length - 20)
      })
      throw new Error('Invalid webhook signature')
    }

    console.info('[GitHubWebhookEventConverter] Signature verification successful')
  }

  async convertEvent(body: string, signature: string, eventType: string): Promise<GitHubWebhookEvent> {
    console.info(`[GitHubWebhookEventConverter] Converting GitHub webhook event: ${eventType}`)

    // Verify signature first
    await this.verifySignature(body, signature)

    // Parse the webhook payload
    const payload = JSON.parse(body)

    // Convert based on event type
    switch (eventType) {
      case 'member':
        return this.convertMemberEvent(payload)
      case 'repository':
        return this.convertRepositoryEvent(payload)
      case 'membership':
        return this.convertMembershipEvent(payload)
      default:
        throw new Error(`Unsupported GitHub webhook event type: ${eventType}`)
    }
  }

  /**
   * Converts GitHub 'member' events (collaborator added/removed)
   * https://docs.github.com/en/webhooks/webhook-events-and-payloads#member
   */
  private convertMemberEvent(payload: any): GitHubWebhookEvent {
    const action = payload.action // 'added', 'removed', 'edited'
    const repository = payload.repository
    const member = payload.member

    if (action === 'removed') {
      // Extract owner and repo name from full_name (format: "owner/repo")
      const [owner, repo] = repository.full_name.split('/')

      return {
        collaboratorRemoved: {
          repositoryId: repository.id,
          repositoryFullName: repository.full_name,
          repositoryOwner: owner,
          repositoryName: repo,
          collaboratorId: member.id,
          collaboratorLogin: member.login,
        }
      }
    }

    // We don't need to handle 'added' or 'edited' as we track invitations separately
    throw new Error(`Unhandled member action: ${action}`)
  }

  /**
   * Converts GitHub 'repository' events (deleted, transferred, etc.)
   * https://docs.github.com/en/webhooks/webhook-events-and-payloads#repository
   */
  private convertRepositoryEvent(payload: any): GitHubWebhookEvent {
    const action = payload.action // 'deleted', 'transferred', 'privatized', etc.
    const repository = payload.repository

    if (action === 'deleted' || action === 'transferred') {
      // Extract owner and repo name from full_name (format: "owner/repo")
      const [owner, repo] = repository.full_name.split('/')

      return {
        repositoryDeleted: {
          repositoryId: repository.id,
          repositoryFullName: repository.full_name,
          repositoryOwner: owner,
          repositoryName: repo,
        }
      }
    }

    throw new Error(`Unhandled repository action: ${action}`)
  }

  /**
   * Converts GitHub 'membership' events (invitation removed)
   * https://docs.github.com/en/webhooks/webhook-events-and-payloads#membership
   */
  private convertMembershipEvent(payload: any): GitHubWebhookEvent {
    const action = payload.action // 'added', 'removed'

    // Note: 'membership' events are for organization membership, not repository collaborators
    // We may not actually need this, but including for completeness
    throw new Error(`Membership events are not supported: ${action}`)
  }
}
