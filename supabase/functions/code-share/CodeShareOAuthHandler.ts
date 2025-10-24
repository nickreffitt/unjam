import type { GitHubIntegrationStore } from '../_shared/stores/GitHubIntegration/index.ts'
import type { GitHubOAuthService } from '../_shared/services/GitHubOAuth/index.ts'

export class CodeShareOAuthHandler {
  private readonly integrationStore: GitHubIntegrationStore
  private readonly oauthService: GitHubOAuthService

  constructor(
    integrationStore: GitHubIntegrationStore,
    oauthService: GitHubOAuthService
  ) {
    this.integrationStore = integrationStore
    this.oauthService = oauthService
  }

  async handleOAuthCallback(payload: {
    code: string;
    customer_id: string
  }): Promise<{ success: boolean }> {
    const { code, customer_id } = payload

    // Exchange code for token
    const tokenData = await this.oauthService.exchangeCodeForToken(code)

    // Get GitHub user info
    const githubUser = await this.oauthService.getAuthenticatedUser(tokenData.access_token)

    // Store integration
    await this.integrationStore.upsert({
      customerId: customer_id,
      githubAccessToken: tokenData.access_token,
      githubUsername: githubUser.login,
      githubUserId: githubUser.id.toString()
    })

    return { success: true }
  }
}
