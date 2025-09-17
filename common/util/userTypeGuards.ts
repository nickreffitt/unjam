import { type UserProfile, type CustomerProfile, type EngineerProfile } from '@common/types';

/**
 * Type guard to check if a user profile is a customer profile
 * @param profile - The user profile to check
 * @returns true if the profile is a CustomerProfile
 */
export function isCustomerProfile(profile: UserProfile): profile is CustomerProfile {
  return profile.type === 'customer';
}

/**
 * Type guard to check if a user profile is an engineer profile
 * @param profile - The user profile to check
 * @returns true if the profile is an EngineerProfile
 */
export function isEngineerProfile(profile: UserProfile): profile is EngineerProfile {
  return profile.type === 'engineer';
}