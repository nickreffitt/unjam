import type { PayoutProvider } from '@common/types';

/**
 * List of countries where Stripe Connect is supported
 * Source: https://stripe.com/global
 * Note: This list should be updated periodically as Stripe expands to new markets
 * Last updated: November 2025
 */
const STRIPE_CONNECT_COUNTRIES = [
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
 * List of countries where Payoneer is supported
 * Source: https://www.payoneer.com/resources/tools/global-payment-capabilities/
 * Note: Payoneer supports 200+ countries. This list represents major markets.
 * For a complete list, refer to Payoneer's official documentation.
 * Last updated: November 2025
 */
const PAYONEER_COUNTRIES = [
  // North America
  'US', 'CA', 'MX',
  // Europe
  'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI',
  'PL', 'CZ', 'HU', 'RO', 'BG', 'GR', 'PT', 'IE', 'HR', 'SK', 'SI', 'LT', 'LV',
  'EE', 'CY', 'MT', 'LU', 'IS',
  // Asia-Pacific
  'AU', 'NZ', 'SG', 'HK', 'JP', 'KR', 'CN', 'IN', 'MY', 'TH', 'ID', 'PH', 'VN',
  'TW', 'BD', 'PK', 'LK',
  // Middle East & Africa
  'AE', 'SA', 'IL', 'TR', 'EG', 'ZA', 'NG', 'KE', 'GH', 'MA', 'TN', 'JO', 'LB',
  'KW', 'QA', 'BH', 'OM',
  // Latin America
  'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'UY', 'PY', 'CR', 'PA', 'GT',
  'DO', 'CU', 'HN', 'NI', 'SV', 'JM', 'TT',
  // Eastern Europe & Central Asia
  'RU', 'UA', 'BY', 'KZ', 'GE', 'AM', 'AZ', 'MD', 'UZ', 'KG', 'TJ', 'TM', 'MN',
  // Additional countries
  'AL', 'BA', 'MK', 'RS', 'ME', 'XK', 'DZ', 'LY', 'SD', 'ET', 'UG', 'TZ', 'ZW',
  'ZM', 'MW', 'MZ', 'AO', 'NA', 'BW', 'SN', 'CI', 'CM', 'CD', 'MU', 'RE', 'SC',
  'MG', 'RW', 'BJ', 'BF', 'TG', 'ML', 'NE', 'TD', 'GN', 'LR', 'SL', 'GM', 'GW',
  'MR', 'CF', 'CG', 'GA', 'GQ', 'ST', 'DJ', 'SO', 'BI', 'KM', 'CV', 'SZ', 'LS',
];

/**
 * Determines which payout provider is available for a given country
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'DE')
 * @returns The payout provider available for the country:
 *   - 'stripe': Stripe Connect is supported (preferred)
 *   - 'payoneer': Only Payoneer is supported
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

  // Fall back to Payoneer
  if (PAYONEER_COUNTRIES.includes(upperCountryCode)) {
    return 'payoneer';
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
 * Checks if Payoneer is supported for a given country
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns true if Payoneer is supported in this country
 */
export function isPayoneerSupported(countryCode: string | undefined): boolean {
  const provider = getPayoutProvider(countryCode);
  return provider === 'stripe' || provider === 'payoneer';
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
    case 'payoneer':
      return 'Payoneer is available for payouts in your country. Stripe Connect is not currently supported.';
    case 'unsupported':
      return "We don't currently support payouts in your country. Please contact support for more information.";
  }
}
