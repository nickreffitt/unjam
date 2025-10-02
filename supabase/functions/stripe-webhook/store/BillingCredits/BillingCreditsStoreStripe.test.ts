import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BillingCreditsStoreStripe } from './BillingCreditsStoreStripe.ts'
import type { CreateCreditGrantParams } from './BillingCreditsStore.ts'
import type Stripe from 'stripe'

// Mock Stripe
vi.mock('stripe', () => {
  const mockStripe = {
    billing: {
      creditGrants: {
        create: vi.fn(),
        list: vi.fn(),
        voidCreditGrant: vi.fn()
      }
    }
  }
  return {
    default: vi.fn(() => mockStripe)
  }
})

describe('BillingCreditsStoreStripe', () => {
  let store: BillingCreditsStoreStripe
  let mockStripeInstance: any

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()

    // Create a new store instance
    store = new BillingCreditsStoreStripe('test_api_key')

    // Get reference to the mocked Stripe instance
    mockStripeInstance = (store as any).stripe
  })

  describe('create', () => {
    it('should create a credit grant successfully', async () => {
      // Given a valid credit grant request
      const params: CreateCreditGrantParams = {
        customerId: 'cus_test123',
        name: 'Test Credit Grant',
        amount: {
          type: 'monetary',
          monetary: {
            value: 5000,
            currency: 'usd'
          }
        },
        category: 'paid',
        applicability_config: {
          scope: {
            price_type: 'metered'
          }
        },
        metadata: {
          test: 'value'
        }
      }

      const mockStripeCreditGrant: Partial<Stripe.Billing.CreditGrant> = {
        id: 'creditgrant_test123',
        customer: 'cus_test123',
        name: 'Test Credit Grant',
        amount: {
          type: 'monetary',
          monetary: {
            value: 5000,
            currency: 'usd'
          }
        },
        category: 'paid',
        metadata: {
          test: 'value'
        }
      }

      mockStripeInstance.billing.creditGrants.create.mockResolvedValue(mockStripeCreditGrant)

      // When creating a credit grant
      const result = await store.create(params)

      // Then the Stripe API should be called correctly
      expect(mockStripeInstance.billing.creditGrants.create).toHaveBeenCalledWith({
        customer: params.customerId,
        name: params.name,
        amount: params.amount,
        category: params.category,
        applicability_config: params.applicability_config,
        effective_at: undefined,
        expires_at: undefined,
        metadata: params.metadata
      })

      // And the result should match the expected credit grant
      expect(result).toEqual({
        id: 'creditgrant_test123',
        customerId: 'cus_test123',
        name: 'Test Credit Grant',
        amount: {
          type: 'monetary',
          monetary: {
            value: 5000,
            currency: 'usd'
          }
        },
        category: 'paid',
        applicability_config: {
          scope: {
            price_type: 'metered'
          }
        },
        effective_at: undefined,
        expires_at: undefined,
        metadata: {
          test: 'value'
        }
      })
    })

    it('should include effective_at and expires_at when provided', async () => {
      // Given a credit grant request with expiration
      const now = Math.floor(Date.now() / 1000)
      const expiresAt = now + 86400 // 24 hours from now

      const params: CreateCreditGrantParams = {
        customerId: 'cus_test123',
        name: 'Promotional Credit',
        amount: {
          type: 'monetary',
          monetary: {
            value: 1000,
            currency: 'usd'
          }
        },
        category: 'promotional',
        applicability_config: {
          scope: {
            price_type: 'metered'
          }
        },
        effective_at: now,
        expires_at: expiresAt
      }

      const mockStripeCreditGrant: Partial<Stripe.Billing.CreditGrant> = {
        id: 'creditgrant_promo123',
        customer: 'cus_test123',
        name: 'Promotional Credit',
        amount: {
          type: 'monetary',
          monetary: {
            value: 1000,
            currency: 'usd'
          }
        },
        category: 'promotional',
        effective_at: now,
        expires_at: expiresAt
      }

      mockStripeInstance.billing.creditGrants.create.mockResolvedValue(mockStripeCreditGrant)

      // When creating the credit grant
      const result = await store.create(params)

      // Then the timestamps should be included
      expect(result.effective_at).toBe(now)
      expect(result.expires_at).toBe(expiresAt)
    })

    it('should throw an error when Stripe API fails', async () => {
      // Given a credit grant request
      const params: CreateCreditGrantParams = {
        customerId: 'cus_test123',
        name: 'Test Credit Grant',
        amount: {
          type: 'monetary',
          monetary: {
            value: 5000,
            currency: 'usd'
          }
        },
        category: 'paid',
        applicability_config: {
          scope: {
            price_type: 'metered'
          }
        }
      }

      // And the Stripe API fails
      mockStripeInstance.billing.creditGrants.create.mockRejectedValue(
        new Error('Stripe API error')
      )

      // When/Then creating should throw an error
      await expect(store.create(params)).rejects.toThrow('Failed to create credit grant: Stripe API error')
    })
  })

  describe('listByCustomer', () => {
    it('should list all credit grants for a customer', async () => {
      // Given a customer with credit grants
      const customerId = 'cus_test123'

      const mockStripeCreditGrants = {
        data: [
          {
            id: 'creditgrant_1',
            customer: customerId,
            name: 'Credit Grant 1',
            amount: {
              type: 'monetary',
              monetary: {
                value: 5000,
                currency: 'usd'
              }
            },
            category: 'paid'
          },
          {
            id: 'creditgrant_2',
            customer: customerId,
            name: 'Credit Grant 2',
            amount: {
              type: 'monetary',
              monetary: {
                value: 2000,
                currency: 'usd'
              }
            },
            category: 'promotional'
          }
        ]
      }

      mockStripeInstance.billing.creditGrants.list.mockResolvedValue(mockStripeCreditGrants)

      // When listing credit grants
      const result = await store.listByCustomer(customerId)

      // Then the Stripe API should be called correctly
      expect(mockStripeInstance.billing.creditGrants.list).toHaveBeenCalledWith({
        customer: customerId,
        limit: 100
      })

      // And the result should contain all credit grants
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('creditgrant_1')
      expect(result[1].id).toBe('creditgrant_2')
    })

    it('should return empty array when customer has no credit grants', async () => {
      // Given a customer with no credit grants
      const customerId = 'cus_test123'

      mockStripeInstance.billing.creditGrants.list.mockResolvedValue({
        data: []
      })

      // When listing credit grants
      const result = await store.listByCustomer(customerId)

      // Then the result should be an empty array
      expect(result).toEqual([])
    })

    it('should throw an error when Stripe API fails', async () => {
      // Given a customer ID
      const customerId = 'cus_test123'

      // And the Stripe API fails
      mockStripeInstance.billing.creditGrants.list.mockRejectedValue(
        new Error('Stripe API error')
      )

      // When/Then listing should throw an error
      await expect(store.listByCustomer(customerId)).rejects.toThrow(
        'Failed to list credit grants: Stripe API error'
      )
    })
  })

  describe('void', () => {
    it('should void a credit grant successfully', async () => {
      // Given a credit grant ID
      const creditGrantId = 'creditgrant_test123'

      mockStripeInstance.billing.creditGrants.voidCreditGrant.mockResolvedValue({})

      // When voiding the credit grant
      await store.void(creditGrantId)

      // Then the Stripe API should be called correctly
      expect(mockStripeInstance.billing.creditGrants.voidCreditGrant).toHaveBeenCalledWith(creditGrantId)
    })

    it('should throw an error when Stripe API fails', async () => {
      // Given a credit grant ID
      const creditGrantId = 'creditgrant_test123'

      // And the Stripe API fails
      mockStripeInstance.billing.creditGrants.voidCreditGrant.mockRejectedValue(
        new Error('Stripe API error')
      )

      // When/Then voiding should throw an error
      await expect(store.void(creditGrantId)).rejects.toThrow(
        'Failed to void credit grant: Stripe API error'
      )
    })
  })
})
