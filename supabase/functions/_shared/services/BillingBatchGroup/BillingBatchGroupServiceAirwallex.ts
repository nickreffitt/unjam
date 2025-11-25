import type { BatchTransferResponse } from '@types'
import type { BillingBatchGroupService } from './BillingBatchGroupService.ts'

/**
 * Airwallex implementation of BillingBatchGroupService
 * Handles batch transfer group creation, retrieval, and submission via Airwallex API
 */
export class BillingBatchGroupServiceAirwallex implements BillingBatchGroupService {
  private readonly apiUrl: string
  private readonly clientId: string
  private readonly apiKey: string

  constructor(
    apiUrl: string,
    clientId: string,
    apiKey: string
  ) {
    this.apiUrl = apiUrl
    this.clientId = clientId
    this.apiKey = apiKey
  }

  /**
   * Creates a new batch transfer group via Airwallex API
   * @returns The Airwallex API response with batch transfer details
   */
  async createBatchGroup(): Promise<BatchTransferResponse> {
    console.info(`[BillingBatchGroupServiceAirwallex] Creating new batch group`)

    const accessToken = await this.getAccessToken()
    const requestId = crypto.randomUUID()

    const requestBody = {
      request_id: requestId,
      name: `Unjam Payout Batch - ${new Date().toISOString().split('T')[0]}`
    }

    const response = await fetch(`${this.apiUrl}/api/v1/batch_transfers/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[BillingBatchGroupServiceAirwallex] Failed to create batch group: ${response.status} - ${errorText}`)
      throw new Error(`Failed to create batch group: ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()
    console.info(`[BillingBatchGroupServiceAirwallex] Successfully created batch group: ${responseData.id}`)

    return responseData as BatchTransferResponse
  }

  /**
   * Gets batch group details from Airwallex API
   * @param externalBatchGroupId - The Airwallex batch transfer ID
   * @returns The Airwallex API response with batch transfer details
   */
  async getBatchGroup(externalBatchGroupId: string): Promise<BatchTransferResponse> {
    console.info(`[BillingBatchGroupServiceAirwallex] Getting batch group: ${externalBatchGroupId}`)

    const accessToken = await this.getAccessToken()

    const response = await fetch(`${this.apiUrl}/api/v1/batch_transfers/${externalBatchGroupId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[BillingBatchGroupServiceAirwallex] Failed to get batch group: ${response.status} - ${errorText}`)
      throw new Error(`Failed to get batch group: ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()
    console.info(`[BillingBatchGroupServiceAirwallex] Successfully retrieved batch group: ${responseData.id}`)

    return responseData as BatchTransferResponse
  }

  /**
   * Submits a batch group for processing via Airwallex API
   * This marks the batch as ready for funding and payout
   * @param externalBatchGroupId - The Airwallex batch transfer ID
   * @returns The Airwallex API response with updated batch transfer details
   */
  async submitBatchGroup(externalBatchGroupId: string): Promise<BatchTransferResponse> {
    console.info(`[BillingBatchGroupServiceAirwallex] Submitting batch group: ${externalBatchGroupId}`)

    const accessToken = await this.getAccessToken()

    const response = await fetch(`${this.apiUrl}/api/v1/batch_transfers/${externalBatchGroupId}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[BillingBatchGroupServiceAirwallex] Failed to submit batch group: ${response.status} - ${errorText}`)
      throw new Error(`Failed to submit batch group: ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()
    console.info(`[BillingBatchGroupServiceAirwallex] Successfully submitted batch group: ${responseData.id}, new status: ${responseData.status}`)

    return responseData as BatchTransferResponse
  }

  /**
   * Authenticates with Airwallex API and returns an access token
   */
  private async getAccessToken(): Promise<string> {
    const authResponse = await fetch(`${this.apiUrl}/api/v1/authentication/login`, {
      method: 'POST',
      headers: {
        'x-client-id': this.clientId,
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error(`[BillingBatchGroupServiceAirwallex] Authentication failed: ${authResponse.status} - ${errorText}`)
      throw new Error(`Failed to authenticate: ${authResponse.status} - ${errorText}`)
    }

    const authData = await authResponse.json()
    console.info(`[BillingBatchGroupServiceAirwallex] Successfully authenticated`)
    return authData.token
  }
}
