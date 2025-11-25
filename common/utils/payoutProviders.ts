import type { PayoutProvider } from '@common/types';

/**
 * List of countries where Stripe Connect is supported
 * Source: https://stripe.com/global
 * Note: This list should be updated periodically as Stripe expands to new markets
 * Last updated: November 2025
 */
export const STRIPE_CONNECT_COUNTRIES = [
  'US', // United States
  'GB', // United Kingdom
  'CA', // Canada
  'AU', // Australia
  'AT', // Austria
  'BE', // Belgium
  'BG', // Bulgaria
  'HR', // Croatia
  'CY', // Cyprus
  'CZ', // Czech Republic
  'DK', // Denmark
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GI', // Gibraltar
  'GR', // Greece
  'HK', // Hong Kong
  'HU', // Hungary
  'IE', // Ireland
  'IT', // Italy
  'JP', // Japan
  'LV', // Latvia
  'LI', // Liechtenstein
  'LT', // Lithuania
  'LU', // Luxembourg
  'MT', // Malta
  'MX', // Mexico
  'NL', // Netherlands
  'NZ', // New Zealand
  'NO', // Norway
  'PL', // Poland
  'PT', // Portugal
  'RO', // Romania
  'SG', // Singapore
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
  'SE', // Sweden
  'CH', // Switzerland
  'AE', // United Arab Emirates
  'BR', // Brazil
  'IN', // India
  'MY', // Malaysia
  'TH', // Thailand
  'ID', // Indonesia
  'PH', // Philippines
];

/**
 * List of countries where Wise supports sending money (for engineer payouts)
 * Source: https://wise.com/help/articles/2571942/what-countriesregions-can-i-send-to
 * Note: This list represents countries where Wise can send payments to
 * Last updated: January 2025
 */
export const BANK_TRANSFER_COUNTRIES = [
  // Europe
  'AT', // Austria
  'BE', // Belgium
  'BG', // Bulgaria
  'HR', // Croatia
  'CY', // Cyprus
  'CZ', // Czech Republic
  'DK', // Denmark
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GR', // Greece
  'HU', // Hungary
  'IE', // Ireland
  'IT', // Italy
  'LV', // Latvia
  'LI', // Liechtenstein
  'LT', // Lithuania
  'LU', // Luxembourg
  'MT', // Malta
  'NL', // Netherlands
  'NO', // Norway
  'PL', // Poland
  'PT', // Portugal
  'RO', // Romania
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
  'SE', // Sweden
  'CH', // Switzerland
  'GB', // United Kingdom
  'UA', // Ukraine
  'TR', // Turkey

  // Americas
  'AR', // Argentina
  'BR', // Brazil
  'CA', // Canada
  'CL', // Chile
  'CO', // Colombia
  'CR', // Costa Rica
  'GT', // Guatemala
  'MX', // Mexico
  'US', // United States
  'UY', // Uruguay

  // Asia-Pacific
  'AU', // Australia
  'BD', // Bangladesh
  'CN', // China
  'GE', // Georgia
  'HK', // Hong Kong
  'IN', // India
  'ID', // Indonesia
  'JP', // Japan
  'MY', // Malaysia
  'NP', // Nepal
  'NZ', // New Zealand
  'PK', // Pakistan
  'PH', // Philippines
  'SG', // Singapore
  'KR', // South Korea
  'LK', // Sri Lanka
  'TH', // Thailand
  'VN', // Vietnam

  // Middle East & Africa
  'EG', // Egypt
  'GH', // Ghana
  'IL', // Israel
  'KE', // Kenya
  'MA', // Morocco
  'NG', // Nigeria
  'ZA', // South Africa
  'TZ', // Tanzania
  'UG', // Uganda
  'AE', // United Arab Emirates
  'ZM', // Zambia
];

/**
 * Determines which payout provider is available for a given country
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'DE')
 * @returns The payout provider available for the country:
 *   - 'stripe': Stripe Connect is supported (preferred)
 *   - 'wise': Only Wise is supported
 *   - 'unsupported': Neither provider supports this country
 */
export function getPayoutProvider(countryCode: string | undefined): PayoutProvider {
  if (!countryCode) {
    return 'unsupported';
  }

  const upperCountryCode = countryCode.toUpperCase();

  // Prefer Stripe Connect if available
  if (STRIPE_CONNECT_COUNTRIES.includes(upperCountryCode)) {
    return 'stripe';
  }

  // Fall back to Wise
  if (BANK_TRANSFER_COUNTRIES.includes(upperCountryCode)) {
    return 'bank_transfer';
  }

  // Country not supported by either provider
  return 'unsupported';
}

/**
 * Checks if Stripe Connect is supported for a given country
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns true if Stripe Connect is supported in this country
 */
export function isStripeConnectSupported(countryCode: string | undefined): boolean {
  return getPayoutProvider(countryCode) === 'stripe';
}

/**
 * Checks if Wise is supported for a given country
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns true if Payoneer is supported in this country
 */
export function isBankTransferSupported(countryCode: string | undefined): boolean {
  return getPayoutProvider(countryCode) === 'bank_transfer';
}

/**
 * Gets a human-readable message for the payout provider availability
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns A descriptive message about payout availability
 */
export function getPayoutProviderMessage(countryCode: string | undefined): string {
  const provider = getPayoutProvider(countryCode);

  switch (provider) {
    case 'stripe':
      return 'Stripe Connect is available for payouts in your country.';
    case 'bank_transfer':
      return 'Bank Transfer is available for payouts in your country.';
    case 'unsupported':
      return "We don't currently support payouts in your country. Please contact support for more information.";
  }
}
