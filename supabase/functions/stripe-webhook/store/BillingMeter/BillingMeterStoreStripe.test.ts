import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BillingMeterStoreStripe } from './BillingMeterStoreStripe.ts'
import type { RecordTicketCompletionParams } from './BillingMeterStore.ts'
import Stripe from 'stripe'

// Mock Stripe
vi.mock('stripe', () => {
  const mockStripe = {
    billing: {
      meterEvents: {
        create: vi.fn()
      }
    }
  }
  return {
    default: vi.fn(() => mockStripe)
  }
})

describe('BillingMeterStoreStripe', () => {
  let store: BillingMeterStoreStripe
  let mockStripeInstance: any

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()

    // Create a new store instance
    store = new BillingMeterStoreStripe('test_api_key', 'ticket_completed')

    // Get reference to the mocked Stripe instance
    mockStripeInstance = (store as any).stripe
  })

  describe('recordTicketCompletion', () => {
    it('should record a ticket completion with default value of 1', async () => {
      // Given a ticket completion request
      const params: RecordTicketCompletionParams = {
        customerId: 'cus_test123',
        ticketId: 'ticket_test123'
      }

      const mockMeterEvent = {
        identifier: 'evt_test123',
        created: Math.floor(Date.now() / 1000)
      }

      mockStripeInstance.billing.meterEvents.create.mockResolvedValue(mockMeterEvent)

      // When recording ticket completion
      await store.recordTicketCompletion(params)

      // Then the Stripe API should be called with correct parameters
      expect(mockStripeInstance.billing.meterEvents.create).toHaveBeenCalledWith({
        event_name: 'ticket_completed',
        payload: {
          stripe_customer_id: 'cus_test123',
          value: '1'
        }
      })
    })

    it('should record a ticket completion with custom value', async () => {
      // Given a ticket completion request with custom value
      const params: RecordTicketCompletionParams = {
        customerId: 'cus_test123',
        ticketId: 'ticket_test123',
        value: 5
      }

      const mockMeterEvent = {
        identifier: 'evt_test123',
        created: Math.floor(Date.now() / 1000)
      }

      mockStripeInstance.billing.meterEvents.create.mockResolvedValue(mockMeterEvent)

      // When recording ticket completion
      await store.recordTicketCompletion(params)

      // Then the value should be included in the payload
      expect(mockStripeInstance.billing.meterEvents.create).toHaveBeenCalledWith({
        event_name: 'ticket_completed',
        payload: {
          stripe_customer_id: 'cus_test123',
          value: '5'
        }
      })
    })

    it('should include timestamp when provided', async () => {
      // Given a ticket completion request with timestamp
      const timestamp = new Date('2025-01-15T10:00:00Z')
      const expectedTimestamp = Math.floor(timestamp.getTime() / 1000)

      const params: RecordTicketCompletionParams = {
        customerId: 'cus_test123',
        ticketId: 'ticket_test123',
        timestamp
      }

      const mockMeterEvent = {
        identifier: 'evt_test123',
        created: expectedTimestamp
      }

      mockStripeInstance.billing.meterEvents.create.mockResolvedValue(mockMeterEvent)

      // When recording ticket completion
      await store.recordTicketCompletion(params)

      // Then the timestamp should be included
      expect(mockStripeInstance.billing.meterEvents.create).toHaveBeenCalledWith({
        event_name: 'ticket_completed',
        payload: {
          stripe_customer_id: 'cus_test123',
          value: '1'
        },
        timestamp: expectedTimestamp
      })
    })

    it('should use custom meter event name if provided', async () => {
      // Given a store with custom meter event name
      const customStore = new BillingMeterStoreStripe('test_api_key', 'custom_event_name')
      const customMockStripeInstance = (customStore as any).stripe

      const params: RecordTicketCompletionParams = {
        customerId: 'cus_test123',
        ticketId: 'ticket_test123'
      }

      const mockMeterEvent = {
        identifier: 'evt_test123',
        created: Math.floor(Date.now() / 1000)
      }

      customMockStripeInstance.billing.meterEvents.create.mockResolvedValue(mockMeterEvent)

      // When recording ticket completion
      await customStore.recordTicketCompletion(params)

      // Then the custom event name should be used
      expect(customMockStripeInstance.billing.meterEvents.create).toHaveBeenCalledWith({
        event_name: 'custom_event_name',
        payload: {
          stripe_customer_id: 'cus_test123',
          value: '1'
        }
      })
    })

    it('should throw an error when Stripe API fails', async () => {
      // Given a ticket completion request
      const params: RecordTicketCompletionParams = {
        customerId: 'cus_test123',
        ticketId: 'ticket_test123'
      }

      // And the Stripe API fails
      mockStripeInstance.billing.meterEvents.create.mockRejectedValue(
        new Error('Stripe API error')
      )

      // When/Then recording should throw an error
      await expect(store.recordTicketCompletion(params)).rejects.toThrow(
        'Failed to record ticket completion: Stripe API error'
      )
    })

    it('should handle multiple ticket completions for the same customer', async () => {
      // Given multiple ticket completions
      const params1: RecordTicketCompletionParams = {
        customerId: 'cus_test123',
        ticketId: 'ticket_001'
      }

      const params2: RecordTicketCompletionParams = {
        customerId: 'cus_test123',
        ticketId: 'ticket_002',
        value: 2
      }

      const mockMeterEvent = {
        identifier: 'evt_test',
        created: Math.floor(Date.now() / 1000)
      }

      mockStripeInstance.billing.meterEvents.create.mockResolvedValue(mockMeterEvent)

      // When recording multiple completions
      await store.recordTicketCompletion(params1)
      await store.recordTicketCompletion(params2)

      // Then both should be recorded
      expect(mockStripeInstance.billing.meterEvents.create).toHaveBeenCalledTimes(2)
      expect(mockStripeInstance.billing.meterEvents.create).toHaveBeenNthCalledWith(1, {
        event_name: 'ticket_completed',
        payload: {
          stripe_customer_id: 'cus_test123',
          value: '1'
        }
      })
      expect(mockStripeInstance.billing.meterEvents.create).toHaveBeenNthCalledWith(2, {
        event_name: 'ticket_completed',
        payload: {
          stripe_customer_id: 'cus_test123',
          value: '2'
        }
      })
    })
  })
})
