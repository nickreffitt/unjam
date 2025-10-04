import type { BillingEngineerEventConverter } from '@events/BillingEngineerEventConverter.ts'
import type { BillingEngineerStore } from '@stores/BillingEngineer/index.ts'
import type { EngineerAccountEvent } from '@types'

/**
 * BillingEventHandler orchestrates the conversion and persistence of billing engineer events
 * Uses dependency injection for converter and stores
 */
export class BillingEventHandler {
  private readonly converter: BillingEngineerEventConverter
  private readonly engineerStore: BillingEngineerStore

  constructor(
    converter: BillingEngineerEventConverter,
    engineerStore: BillingEngineerStore
  ) {
    this.converter = converter
    this.engineerStore = engineerStore
  }

  /**
   * Handles a billing event by converting and persisting it
   * @param body - The raw request body as a string
   * @param signature - The signature header for verification
   * @returns Promise that resolves on success or rejects with error
   */
  async handleEvent(body: string, signature: string): Promise<void> {
    console.info('[BillingEventHandler] Handling billing engineer event')

    // Convert the event using the converter
    const billingEngineerEvent = await this.converter.convertEvent(body, signature)

    // Persist the event to the appropriate store based on event type
    if ('account' in billingEngineerEvent) {
      await this.handleEngineerAccountEvent(billingEngineerEvent as EngineerAccountEvent)
    } else {
      throw new Error('Unknown billing engineer event type')
    }

    console.info('[BillingEventHandler] Successfully handled billing engineer event')
  }

  /**
   * Handles engineer account events (created, updated, deleted)
   */
  private async handleEngineerAccountEvent(event: EngineerAccountEvent): Promise<void> {
    console.info(`[BillingEventHandler] Handling engineer account event: ${event.state}`)

    switch (event.state) {
      case 'created':
        await this.engineerStore.create(event.account)
        break
      case 'updated':
        await this.engineerStore.update(event.account)
        break
      case 'deleted':
        await this.engineerStore.delete(event.account.id)
        break
      default:
        throw new Error(`Unknown engineer account event state: ${event.state}`)
    }
  }
}
