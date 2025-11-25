import { describe, it, expect } from 'vitest';
import {
  getPayoutProvider,
  isStripeConnectSupported,
  isBankTransferSupported,
  getPayoutProviderMessage
} from './payoutProviders';

describe('payoutProviders', () => {
  describe('getPayoutProvider', () => {
    it('should return stripe for US', () => {
      // given a US country code
      const countryCode = 'US';

      // when getting the payout provider
      const result = getPayoutProvider(countryCode);

      // then it should return stripe
      expect(result).toBe('stripe');
    });

    it('should return stripe for UK', () => {
      // given a UK country code
      const countryCode = 'GB';

      // when getting the payout provider
      const result = getPayoutProvider(countryCode);

      // then it should return stripe
      expect(result).toBe('stripe');
    });

    it('should return stripe for Germany', () => {
      // given a German country code
      const countryCode = 'DE';

      // when getting the payout provider
      const result = getPayoutProvider(countryCode);

      // then it should return stripe
      expect(result).toBe('stripe');
    });

    it('should return bank_transfer for Argentina (Stripe not supported)', () => {
      // given an Argentinian country code (not in Stripe list but in Wise list)
      const countryCode = 'AR';

      // when getting the payout provider
      const result = getPayoutProvider(countryCode);

      // then it should return bank_transfer
      expect(result).toBe('bank_transfer');
    });

    it('should return bank_transfer for Bangladesh (Stripe not supported)', () => {
      // given a Bangladesh country code (not in Stripe list but in Wise list)
      const countryCode = 'BD';

      // when getting the payout provider
      const result = getPayoutProvider(countryCode);

      // then it should return bank_transfer
      expect(result).toBe('bank_transfer');
    });

    it('should return unsupported for country not in either list', () => {
      // given a country code not in any list
      const countryCode = 'XX';

      // when getting the payout provider
      const result = getPayoutProvider(countryCode);

      // then it should return unsupported
      expect(result).toBe('unsupported');
    });

    it('should return unsupported for undefined country code', () => {
      // given an undefined country code
      const countryCode = undefined;

      // when getting the payout provider
      const result = getPayoutProvider(countryCode);

      // then it should return unsupported
      expect(result).toBe('unsupported');
    });

    it('should handle lowercase country codes', () => {
      // given a lowercase country code
      const countryCode = 'us';

      // when getting the payout provider
      const result = getPayoutProvider(countryCode);

      // then it should return stripe (case insensitive)
      expect(result).toBe('stripe');
    });

    it('should handle mixed case country codes', () => {
      // given a mixed case country code
      const countryCode = 'Gb';

      // when getting the payout provider
      const result = getPayoutProvider(countryCode);

      // then it should return stripe (case insensitive)
      expect(result).toBe('stripe');
    });
  });

  describe('isStripeConnectSupported', () => {
    it('should return true for Stripe-supported countries', () => {
      // given Stripe-supported country codes
      const stripeCodes = ['US', 'GB', 'DE', 'FR', 'CA', 'AU', 'SG', 'JP'];

      // when checking if Stripe Connect is supported
      const results = stripeCodes.map(code => isStripeConnectSupported(code));

      // then all should return true
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });

    it('should return false for non-Stripe countries', () => {
      // given non-Stripe country codes
      const nonStripeCodes = ['RU', 'AR', 'XX'];

      // when checking if Stripe Connect is supported
      const results = nonStripeCodes.map(code => isStripeConnectSupported(code));

      // then all should return false
      results.forEach(result => {
        expect(result).toBe(false);
      });
    });

    it('should return false for undefined', () => {
      // given undefined
      const countryCode = undefined;

      // when checking if Stripe Connect is supported
      const result = isStripeConnectSupported(countryCode);

      // then it should return false
      expect(result).toBe(false);
    });
  });

  describe('isBankTransferSupported', () => {
    it('should return false for Stripe countries (no bank transfer needed)', () => {
      // given a Stripe-supported country
      const countryCode = 'US';

      // when checking if bank transfer is supported
      const result = isBankTransferSupported(countryCode);

      // then it should return false (Stripe is preferred)
      expect(result).toBe(false);
    });

    it('should return true for bank transfer countries', () => {
      // given bank transfer country codes (not in Stripe list)
      const bankTransferCodes = ['AR', 'BD', 'KE', 'UA'];

      // when checking if bank transfer is supported
      const results = bankTransferCodes.map(code => isBankTransferSupported(code));

      // then all should return true
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });

    it('should return false for unsupported countries', () => {
      // given an unsupported country code
      const countryCode = 'XX';

      // when checking if bank transfer is supported
      const result = isBankTransferSupported(countryCode);

      // then it should return false
      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      // given undefined
      const countryCode = undefined;

      // when checking if bank transfer is supported
      const result = isBankTransferSupported(countryCode);

      // then it should return false
      expect(result).toBe(false);
    });
  });

  describe('getPayoutProviderMessage', () => {
    it('should return Stripe message for Stripe countries', () => {
      // given a Stripe-supported country
      const countryCode = 'US';

      // when getting the payout provider message
      const message = getPayoutProviderMessage(countryCode);

      // then it should mention Stripe Connect
      expect(message).toContain('Stripe Connect');
      expect(message).toContain('available');
    });

    it('should return Bank Transfer message for bank transfer countries', () => {
      // given a bank transfer country (not in Stripe list)
      const countryCode = 'AR';

      // when getting the payout provider message
      const message = getPayoutProviderMessage(countryCode);

      // then it should mention Bank Transfer
      expect(message).toContain('Bank Transfer');
      expect(message).toContain('available');
    });

    it('should return unsupported message for unsupported countries', () => {
      // given an unsupported country
      const countryCode = 'XX';

      // when getting the payout provider message
      const message = getPayoutProviderMessage(countryCode);

      // then it should indicate no support
      expect(message).toContain("don't currently support");
      expect(message).toContain('your country');
    });

    it('should return unsupported message for undefined', () => {
      // given undefined
      const countryCode = undefined;

      // when getting the payout provider message
      const message = getPayoutProviderMessage(countryCode);

      // then it should indicate no support
      expect(message).toContain("don't currently support");
    });
  });
});
