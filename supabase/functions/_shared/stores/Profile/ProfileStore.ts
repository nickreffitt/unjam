/**
 * Interface for profile persistence
 */
export interface ProfileStore {
  /**
   * Fetches a profile's email by profile ID
   * @param profileId - The profile ID
   * @returns The email if found, undefined otherwise
   */
  getEmailByProfileId(profileId: string): Promise<string | undefined>
}
