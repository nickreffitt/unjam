import { type Rating } from '@common/types';

export interface RatingStore {
  /**
   * Creates a new rating
   * @param rating - The rating to create
   * @returns The created rating
   */
  create(rating: Rating): Promise<Rating>;

  /**
   * Gets a rating by ticket ID
   * @param ticketId - The ticket ID
   * @returns The rating if found, undefined otherwise
   */
  getByTicketId(ticketId: string): Promise<Rating | undefined>;

  /**
   * Gets ratings by multiple ticket IDs (batch fetch)
   * @param ticketIds - Array of ticket IDs
   * @returns Array of ratings for the specified tickets
   */
  getByTicketIds(ticketIds: string[]): Promise<Rating[]>;

  /**
   * Gets all ratings created by a specific user
   * @param profileId - The profile ID of the user who created the ratings
   * @returns Array of ratings
   */
  getByCreator(profileId: string): Promise<Rating[]>;

  /**
   * Gets all ratings for a specific user (ratings they received)
   * @param profileId - The profile ID of the user being rated
   * @returns Array of ratings
   */
  getByRatedUser(profileId: string): Promise<Rating[]>;

  /**
   * Updates an existing rating
   * @param id - The rating ID
   * @param rating - The new rating value
   * @param notes - Optional notes
   * @returns The updated rating
   */
  update(id: string, rating: number, notes?: string): Promise<Rating>;

  /**
   * Clears all ratings (mainly for testing purposes)
   */
  clear(): Promise<void>;
}
