import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BillingCustomerServiceStripe } from './BillingCustomerServiceStripe.ts'
import type Stripe from 'stripe'

describe('BillingCustomerServiceStripe', () => {
  let service: BillingCustomerServiceStripe
  let mockStripe: Stripe
  let createCustomerMock: ReturnType<typeof vi.fn>
  let createCustomerSessionMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Create mock for customers.create
    createCustomerMock = vi.fn(async (params: Stripe.CustomerCreateParams) => {
      return {
        id: 'cus_test123',
        email: params.email,
        name: null,
        metadata: params.metadata
      } as Stripe.Customer
    })

    // Create mock for customerSessions.create
    createCustomerSessionMock = vi.fn(async () => {
      return {
        client_secret: 'cus_session_test_secret123'
      } as Stripe.CustomerSession
    })

    // Create mock Stripe client
    mockStripe = {
      customers: {
        create: createCustomerMock
      },
      customerSessions: {
        create: createCustomerSessionMock
      }
    } as unknown as Stripe

    service = new BillingCustomerServiceStripe(mockStripe)
  })

  describe('createCustomer', () => {
    it('should create a Stripe customer with email and profile_id metadata', async () => {
      // given a profile ID and email
      const profileId = 'profile_123'
      const email = 'test@example.com'

      // when creating a customer
      const result = await service.createCustomer(profileId, email)

      // then it should return a customer object
      expect(result).toEqual({
        id: 'cus_test123',
        email: 'test@example.com',
        name: null
      })
    })

    it('should call stripe.customers.create with correct parameters', async () => {
      // given a profile ID and email
      const profileId = 'profile_456'
      const email = 'customer@example.com'

      // when creating a customer
      await service.createCustomer(profileId, email)

      // then stripe.customers.create should be called with correct params
      expect(createCustomerMock).toHaveBeenCalledWith({
        email: 'customer@example.com',
        metadata: {
          profile_id: 'profile_456'
        }
      })
    })
  })

  describe('createCustomerSession', () => {
    it('should create a customer session and return client secret', async () => {
      // given a customer ID
      const customerId = 'cus_test123'

      // when creating a customer session
      const result = await service.createCustomerSession(customerId)

      // then it should return the client secret
      expect(result).toBe('cus_session_test_secret123')
    })

    it('should call stripe.customerSessions.create with correct parameters', async () => {
      // given a customer ID
      const customerId = 'cus_test456'

      // when creating a customer session
      await service.createCustomerSession(customerId)

      // then stripe.customerSessions.create should be called with correct params
      expect(createCustomerSessionMock).toHaveBeenCalledWith({
        customer: 'cus_test456',
        components: {
          pricing_table: {
            enabled: true
          }
        }
      })
    })
  })
})
