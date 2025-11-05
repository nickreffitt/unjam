import { type SupabaseClient } from 'supabase'
import type { ProfileStore } from './ProfileStore.ts'

/**
 * Supabase implementation of ProfileStore
 */
export class ProfileStoreSupabase implements ProfileStore {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Fetches a profile's email by profile ID
   * @param profileId - The profile ID
   * @returns The email if found, undefined otherwise
   */
  async getEmailByProfileId(profileId: string): Promise<string | undefined> {
    console.info(`[ProfileStoreSupabase] Fetching email for profile ID: ${profileId}`)

    const { data, error } = await this.supabase
      .from('profiles')
      .select('email')
      .eq('id', profileId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        console.info(`[ProfileStoreSupabase] Profile not found: ${profileId}`)
        return undefined
      }
      console.error(`[ProfileStoreSupabase] Error fetching profile email:`, error)
      throw new Error(`Failed to fetch profile email: ${error.message}`)
    }

    if (!data || !data.email) {
      console.info(`[ProfileStoreSupabase] No email found for profile: ${profileId}`)
      return undefined
    }

    console.info(`[ProfileStoreSupabase] Found email for profile ${profileId}`)
    return data.email
  }
}
