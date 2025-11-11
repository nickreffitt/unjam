import { describe, it, expect } from 'vitest';
import {
  getPayoutProvider,
  isStripeConnectSupported,
  isPayoneerSupported,
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

    it('should return payoneer for Russia (Stripe not supported)', () => {
      // given a Russian country code (not in Stripe list)
      const countryCode = 'RU';

      // when getting the payout provider
      const result = getPayoutProvider(countryCode);

      // then it should return payoneer
      expect(result).toBe('payoneer');
    });

    it('should return payoneer for Argentina (Stripe not supported)', () => {
      // given an Argentinian country code (not in Stripe list)
      const countryCode = 'AR';

      // when getting the payout provider
      const result = getPayoutProvider(countryCode);

      // then it should return payoneer
      expect(result).toBe('payoneer');
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

  describe('isPayoneerSupported', () => {
    it('should return true for Stripe countries (dual support)', () => {
      // given a Stripe-supported country
      const countryCode = 'US';

      // when checking if Payoneer is supported
      const result = isPayoneerSupported(countryCode);

      // then it should return true (Stripe countries also have Payoneer)
      expect(result).toBe(true);
    });

    it('should return true for Payoneer-only countries', () => {
      // given Payoneer-only country codes
      const payoneerCodes = ['RU', 'AR', 'BD', 'KE'];

      // when checking if Payoneer is supported
      const results = payoneerCodes.map(code => isPayoneerSupported(code));

      // then all should return true
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });

    it('should return false for unsupported countries', () => {
      // given an unsupported country code
      const countryCode = 'XX';

      // when checking if Payoneer is supported
      const result = isPayoneerSupported(countryCode);

      // then it should return false
      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      // given undefined
      const countryCode = undefined;

      // when checking if Payoneer is supported
      const result = isPayoneerSupported(countryCode);

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

    it('should return Payoneer message for Payoneer-only countries', () => {
      // given a Payoneer-only country
      const countryCode = 'RU';

      // when getting the payout provider message
      const message = getPayoutProviderMessage(countryCode);

      // then it should mention Payoneer and that Stripe is not supported
      expect(message).toContain('Payoneer');
      expect(message).toContain('not currently supported');
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
