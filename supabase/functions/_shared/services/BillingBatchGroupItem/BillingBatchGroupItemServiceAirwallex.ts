import type { AddBatchItemRequest, BatchTransferResponse, BatchTransferItemsResponse } from '@types'
import type { BillingBatchGroupItemService } from './BillingBatchGroupItemService.ts'

/**
 * Airwallex implementation of BillingBatchGroupItemService
 * Handles adding items to Airwallex batch transfers via API
 */
export class BillingBatchGroupItemServiceAirwallex implements BillingBatchGroupItemService {
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
   * Adds items to an Airwallex batch transfer
   * @param batchId - The Airwallex batch transfer ID
   * @param items - Array of items to add to the batch
   * @returns The updated batch transfer response from Airwallex
   */
  async addItemsToBatch(batchId: string, items: AddBatchItemRequest[]): Promise<BatchTransferResponse> {
    console.info(`[BillingBatchGroupItemServiceAirwallex] Adding ${items.length} items to batch: ${batchId}`)

    if (items.length === 0) {
      throw new Error('No items provided to add to batch')
    }

    if (items.length > 100) {
      throw new Error('Cannot add more than 100 items at a time')
    }

    const accessToken = await this.getAccessToken()

    const requestBody = {
      items: items.map(item => ({
        beneficiary_id: item.beneficiaryId,
        source_currency: item.sourceCurrency,
        transfer_currency: item.transferCurrency,
        transfer_amount: item.transferAmount,
        transfer_method: item.transferMethod,
        reason: item.reason,
        reference: item.reference,
        request_id: item.requestId
      }))
    }

    const response = await fetch(`${this.apiUrl}/api/v1/batch_transfers/${batchId}/add_items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[BillingBatchGroupItemServiceAirwallex] Failed to add items to batch: ${response.status} - ${errorText}`)
      throw new Error(`Failed to add items to batch: ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()
    console.info(`[BillingBatchGroupItemServiceAirwallex] Successfully added ${items.length} items to batch`)

    return responseData as BatchTransferResponse
  }

  /**
   * Gets all items in an Airwallex batch transfer
   * @param batchId - The Airwallex batch transfer ID
   * @returns The batch transfer items response with individual item IDs
   */
  async getBatchItems(batchId: string): Promise<BatchTransferItemsResponse> {
    console.info(`[BillingBatchGroupItemServiceAirwallex] Getting items for batch: ${batchId}`)

    const accessToken = await this.getAccessToken()

    const response = await fetch(`${this.apiUrl}/api/v1/batch_transfers/${batchId}/items`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[BillingBatchGroupItemServiceAirwallex] Failed to get batch items: ${response.status} - ${errorText}`)
      throw new Error(`Failed to get batch items: ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()
    console.info(`[BillingBatchGroupItemServiceAirwallex] Successfully retrieved ${responseData.items?.length || 0} batch items`)

    return responseData as BatchTransferItemsResponse
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
      console.error(`[BillingBatchGroupItemServiceAirwallex] Authentication failed: ${authResponse.status} - ${errorText}`)
      throw new Error(`Failed to authenticate: ${authResponse.status} - ${errorText}`)
    }

    const authData = await authResponse.json()
    console.info(`[BillingBatchGroupItemServiceAirwallex] Successfully authenticated`)
    return authData.token
  }
}
