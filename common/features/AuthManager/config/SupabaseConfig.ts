/**
 * Supabase configuration interface
 * Contains the required configuration for connecting to Supabase
 */
export interface SupabaseConfig {
  /** Supabase project URL */
  url: string;
  /** Supabase anonymous (public) key */
  anonKey: string;
  /** Optional redirect URL for OAuth flows (defaults to current origin + /auth/callback) */
  redirectUrl?: string;
}

/**
 * Default Supabase configuration
 * These values should be overridden with actual project values
 */
export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here',
  redirectUrl: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
};

/**
 * Validates Supabase configuration
 * Ensures required fields are present and properly formatted
 *
 * @param config - Supabase configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateSupabaseConfig(config: SupabaseConfig): void {
  if (!config.url) {
    throw new Error('Supabase URL is required');
  }

  if (!config.anonKey) {
    throw new Error('Supabase anonymous key is required');
  }

  if (!config.url.includes('supabase.co') && !config.url.includes('localhost')) {
    console.warn('SupabaseConfig: URL does not appear to be a valid Supabase URL:', config.url);
  }

  if (config.anonKey.includes('your-anon-key-here') || config.url.includes('your-project')) {
    throw new Error('Please update your Supabase configuration with actual project values');
  }
}

/**
 * Creates a validated Supabase configuration
 * Merges provided config with defaults and validates the result
 *
 * @param config - Partial configuration to merge with defaults
 * @returns Validated Supabase configuration
 */
export function createSupabaseConfig(config?: Partial<SupabaseConfig>): SupabaseConfig {
  const mergedConfig: SupabaseConfig = {
    ...DEFAULT_SUPABASE_CONFIG,
    ...config,
  };

  validateSupabaseConfig(mergedConfig);
  return mergedConfig;
}