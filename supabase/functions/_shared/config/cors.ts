/**
 * Shared CORS configuration for edge functions that need to be called from the extension
 * These origins should match the host_permissions in wxt.config.ts for extension-accessible endpoints
 */
export const EXTENSION_ALLOWED_ORIGINS = [
  'https://unjam.nickreffitt.com',
  'http://localhost:5175',
  'https://lovable.dev',
  'https://replit.com',
  'https://app.base44.com',
  'https://bolt.new',
  'https://v0.app'
] as const;

/**
 * Gets the appropriate CORS origin for extension-accessible endpoints
 * Supports wildcard domains like *.lovable.dev and *.lovableproject.com
 * Returns the request origin if it's allowed, otherwise returns the default origin
 */
export function getExtensionCorsOrigin(requestOrigin: string | null): string {
  if (!requestOrigin) {
    return EXTENSION_ALLOWED_ORIGINS[0];
  }

  // Check for exact match
  if (EXTENSION_ALLOWED_ORIGINS.includes(requestOrigin as any)) {
    return requestOrigin;
  }

  // Check for wildcard matches for domains where the extension can be injected
  if (requestOrigin.endsWith('.lovableproject.com') || requestOrigin.endsWith('.lovable.dev')) {
    return requestOrigin;
  }

  return EXTENSION_ALLOWED_ORIGINS[0];
}

/**
 * Dashboard-only CORS origins (no extension support needed)
 */
export const DASHBOARD_ALLOWED_ORIGINS = [
  'https://unjam.nickreffitt.com',
  'http://localhost:5175',
] as const;

/**
 * Gets the appropriate CORS origin for dashboard-only endpoints
 */
export function getDashboardCorsOrigin(requestOrigin: string | null): string {
  if (!requestOrigin) {
    return DASHBOARD_ALLOWED_ORIGINS[0];
  }

  if (DASHBOARD_ALLOWED_ORIGINS.includes(requestOrigin as any)) {
    return requestOrigin;
  }

  return DASHBOARD_ALLOWED_ORIGINS[0];
}
