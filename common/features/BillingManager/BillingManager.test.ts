import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BillingManager } from './BillingManager';
import { ApiManager } from '@common/features/ApiManager';
import type { ProductsResponse, CreditBalanceResponse, CheckoutSessionResponse } from '@common/types';

describe('BillingManager', () => {
  let mockApiManager: ApiManager;
  let billingManager: BillingManager;

  beforeEach(() => {
    // Create mock ApiManager with properly initialized mock functions
    mockApiManager = {
      fetchProducts: vi.fn<[], Promise<ProductsResponse>>(),
      createProductCheckoutSession: vi.fn<[string, string], Promise<CheckoutSessionResponse>>(),
      fetchCreditBalance: vi.fn<[string], Promise<CreditBalanceResponse>>()
    } as any;

    billingManager = new BillingManager(mockApiManager);
  });

  describe('fetchProducts', () => {
    it('should successfully fetch products', async () => {
      // Given a successful API response with products
      const mockProductsResponse: ProductsResponse = {
        products: [
          {
            id: 'prod_123',
            name: '10 Credits',
            description: 'Purchase 10 credits',
            priceId: 'price_123',
            price: 5000,
            currency: 'usd',
            creditPrice: 5000,
            marketingFeatures: ['Feature 1', 'Feature 2'],
            isMostPopular: false
          }
        ]
      };
      (mockApiManager.fetchProducts as any).mockResolvedValue(mockProductsResponse);

      // When fetching products
      const result = await billingManager.fetchProducts();

      // Then it should return the products
      expect(result).toEqual(mockProductsResponse);
      expect(mockApiManager.fetchProducts).toHaveBeenCalledOnce();
    });

    it('should throw error when API call fails', async () => {
      // Given a failed API response
      const errorMessage = 'Failed to fetch products';
      (mockApiManager.fetchProducts as any).mockRejectedValue(new Error(errorMessage));

      // When fetching products
      // Then it should throw the error
      await expect(billingManager.fetchProducts()).rejects.toThrow(errorMessage);
    });
  });

  describe('createProductCheckoutSession', () => {
    const profileId = 'profile-123';
    const priceId = 'price_123';

    it('should successfully create checkout session', async () => {
      // Given a successful API response with checkout URL
      const mockCheckoutResponse: CheckoutSessionResponse = {
        checkout_url: 'https://checkout.stripe.com/session/test'
      };
      (mockApiManager.createProductCheckoutSession as any).mockResolvedValue(mockCheckoutResponse);

      // When creating a checkout session
      const result = await billingManager.createProductCheckoutSession(profileId, priceId);

      // Then it should return the checkout response
      expect(result).toEqual(mockCheckoutResponse);
      expect(mockApiManager.createProductCheckoutSession).toHaveBeenCalledWith(profileId, priceId);
    });

    it('should throw error when API call fails', async () => {
      // Given a failed API response
      const errorMessage = 'Failed to create checkout session';
      (mockApiManager.createProductCheckoutSession as any).mockRejectedValue(new Error(errorMessage));

      // When creating a checkout session
      // Then it should throw the error
      await expect(billingManager.createProductCheckoutSession(profileId, priceId))
        .rejects.toThrow(errorMessage);
    });
  });

});

