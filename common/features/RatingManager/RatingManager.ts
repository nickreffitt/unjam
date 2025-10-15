import { type Rating, type UserProfile } from '@common/types';
import { type RatingStore } from './store';
import { type RatingChanges } from './store/RatingChanges';

export class RatingManager {
  private readonly ratingStore: RatingStore;
  private readonly changes: RatingChanges;

  constructor(ratingStore: RatingStore, changes: RatingChanges) {
    if (!ratingStore) {
      throw new Error('RatingManager: ratingStore is required');
    }
    if (!changes) {
      throw new Error('RatingManager: changes is required');
    }
    this.ratingStore = ratingStore;
    this.changes = changes;

    this.changes.start();
  }

  /**
   * Creates a new rating for a ticket
   * @param ticketId - The ticket ID
   * @param createdBy - The user creating the rating
   * @param ratingFor - The user being rated
   * @param rating - The rating value (0-500)
   * @param notes - Optional notes
   * @returns The created rating
   */
  async createRating(
    ticketId: string,
    createdBy: UserProfile,
    ratingFor: UserProfile,
    rating: number,
    notes?: string
  ): Promise<Rating> {
    // Validate parameters
    if (!ticketId || ticketId.trim().length === 0) {
      throw new Error('Ticket ID is required');
    }
    if (!createdBy?.id) {
      throw new Error('Created by profile is required');
    }
    if (!ratingFor?.id) {
      throw new Error('Rating for profile is required');
    }
    if (rating < 0 || rating > 500) {
      throw new Error('Rating must be between 0 and 500');
    }

    // Create the rating object
    const ratingObject: Rating = {
      id: `RATING-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      ticketId: ticketId.trim(),
      createdBy,
      ratingFor,
      rating,
      notes: notes?.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store the rating
    const createdRating = await this.ratingStore.create(ratingObject);

    console.debug(
      `RatingManager: Rating created by ${createdBy.name} for ${ratingFor.name} on ticket ${ticketId}`
    );

    return createdRating;
  }

  /**
   * Gets a rating by ticket ID
   * @param ticketId - The ticket ID
   * @returns The rating if found, undefined otherwise
   */
  async getRatingByTicketId(ticketId: string): Promise<Rating | undefined> {
    if (!ticketId || ticketId.trim().length === 0) {
      throw new Error('Ticket ID is required');
    }

    const rating = await this.ratingStore.getByTicketId(ticketId.trim());

    console.debug(
      rating
        ? `RatingManager: Found rating for ticket ${ticketId}`
        : `RatingManager: No rating found for ticket ${ticketId}`
    );

    return rating;
  }

  /**
   * Gets all ratings created by a specific user
   * @param profileId - The profile ID of the user who created the ratings
   * @returns Array of ratings
   */
  async getRatingsCreatedBy(profileId: string): Promise<Rating[]> {
    if (!profileId || profileId.trim().length === 0) {
      throw new Error('Profile ID is required');
    }

    const ratings = await this.ratingStore.getByCreator(profileId.trim());

    console.debug(
      `RatingManager: Retrieved ${ratings.length} ratings created by ${profileId}`
    );

    return ratings;
  }

  /**
   * Gets all ratings for a specific user (ratings they received)
   * @param profileId - The profile ID of the user being rated
   * @returns Array of ratings
   */
  async getRatingsForUser(profileId: string): Promise<Rating[]> {
    if (!profileId || profileId.trim().length === 0) {
      throw new Error('Profile ID is required');
    }

    const ratings = await this.ratingStore.getByRatedUser(profileId.trim());

    console.debug(
      `RatingManager: Retrieved ${ratings.length} ratings for user ${profileId}`
    );

    return ratings;
  }

  /**
   * Updates an existing rating
   * @param id - The rating ID
   * @param rating - The new rating value (0-500)
   * @param notes - Optional notes
   * @returns The updated rating
   */
  async updateRating(id: string, rating: number, notes?: string): Promise<Rating> {
    if (!id || id.trim().length === 0) {
      throw new Error('Rating ID is required');
    }
    if (rating < 0 || rating > 500) {
      throw new Error('Rating must be between 0 and 500');
    }

    const updatedRating = await this.ratingStore.update(id.trim(), rating, notes?.trim());

    console.debug(`RatingManager: Updated rating ${id}`);

    return updatedRating;
  }

  /**
   * Calculates the average rating for a user
   * @param profileId - The profile ID of the user
   * @returns The average rating value (0-500) or 0 if no ratings exist
   */
  async getAverageRating(profileId: string): Promise<number> {
    if (!profileId || profileId.trim().length === 0) {
      throw new Error('Profile ID is required');
    }

    const ratings = await this.ratingStore.getByRatedUser(profileId.trim());

    if (ratings.length === 0) {
      return 0;
    }

    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const average = Math.round(sum / ratings.length);

    console.debug(
      `RatingManager: Average rating for ${profileId} is ${average} (based on ${ratings.length} ratings)`
    );

    return average;
  }

  /**
   * Stops listening for changes and cleans up resources
   * Should be called when the manager is no longer needed
   */
  destroy(): void {
    this.changes.stop();
    console.debug('RatingManager: Stopped listening for changes');
  }
}
