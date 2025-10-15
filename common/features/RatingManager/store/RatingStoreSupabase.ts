import { type SupabaseClient } from '@supabase/supabase-js';
import { type Rating } from '@common/types';
import { type RatingStore } from './RatingStore';
import { RatingSupabaseRowMapper } from '../util/RatingSupabaseRowMapper';
import { type RatingEventEmitter } from '../events';

/**
 * Supabase implementation of the rating store
 * Uses Supabase PostgreSQL database for persistence with row-level security
 */
export class RatingStoreSupabase implements RatingStore {
  private supabaseClient: SupabaseClient;
  private eventEmitter: RatingEventEmitter;
  private readonly tableName: string = 'ratings';

  constructor(supabaseClient: SupabaseClient, eventEmitter: RatingEventEmitter) {
    if (!supabaseClient) {
      throw new Error('RatingStoreSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('RatingStoreSupabase: eventEmitter is required');
    }
    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
    console.debug('RatingStoreSupabase: Initialized');
  }

  /**
   * Creates a new rating
   * @param rating - The rating to create
   * @returns The created rating
   */
  async create(rating: Rating): Promise<Rating> {
    // Validate required fields
    if (!rating.ticketId) {
      throw new Error('ticket_id is required for rating creation');
    }
    if (!rating.createdBy?.id) {
      throw new Error('created_by profile ID is required for rating creation');
    }
    if (!rating.ratingFor?.id) {
      throw new Error('rating_for profile ID is required for rating creation');
    }
    if (rating.rating < 0 || rating.rating > 500) {
      throw new Error('rating must be between 0 and 500');
    }

    console.debug('RatingStoreSupabase: Creating rating for ticket', rating.ticketId);

    const ratingRow = RatingSupabaseRowMapper.mapRatingToRow(rating);

    // Omit the ID field to let the database generate its own UUID
    const { id, ...ratingRowWithoutId } = ratingRow;

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .insert([ratingRowWithoutId])
      .select(`
        *,
        created_by_profile:profiles!ratings_created_by_fkey(*),
        rating_for_profile:profiles!ratings_rating_for_fkey(*)
      `)
      .single();

    if (error) {
      console.error('RatingStoreSupabase: Create failed:', error);
      throw new Error(`Failed to create rating: ${error.message}`);
    }

    const createdRating = RatingSupabaseRowMapper.mapRowToRating(data);
    console.debug('RatingStoreSupabase: Created rating successfully:', createdRating.id);

    // Emit rating created event
    this.eventEmitter.emitRatingCreated(createdRating);

    return createdRating;
  }

  /**
   * Gets a rating by ticket ID
   * @param ticketId - The ticket ID
   * @returns The rating if found, undefined otherwise
   */
  async getByTicketId(ticketId: string): Promise<Rating | undefined> {
    console.debug('RatingStoreSupabase: Getting rating for ticket', ticketId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        created_by_profile:profiles!ratings_created_by_fkey(*),
        rating_for_profile:profiles!ratings_rating_for_fkey(*)
      `)
      .eq('ticket_id', ticketId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        console.debug('RatingStoreSupabase: No rating found for ticket', ticketId);
        return undefined;
      }
      console.error('RatingStoreSupabase: Get by ticket ID failed:', error);
      throw new Error(`Failed to get rating by ticket ID: ${error.message}`);
    }

    const rating = RatingSupabaseRowMapper.mapRowToRating(data);
    console.debug('RatingStoreSupabase: Retrieved rating:', rating.id);
    return rating;
  }

  /**
   * Gets all ratings created by a specific user
   * @param profileId - The profile ID of the user who created the ratings
   * @returns Array of ratings
   */
  async getByCreator(profileId: string): Promise<Rating[]> {
    console.debug('RatingStoreSupabase: Getting ratings created by', profileId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        created_by_profile:profiles!ratings_created_by_fkey(*),
        rating_for_profile:profiles!ratings_rating_for_fkey(*)
      `)
      .eq('created_by', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('RatingStoreSupabase: Get by creator failed:', error);
      throw new Error(`Failed to get ratings by creator: ${error.message}`);
    }

    const ratings = data.map(row => RatingSupabaseRowMapper.mapRowToRating(row));
    console.debug(`RatingStoreSupabase: Retrieved ${ratings.length} ratings created by ${profileId}`);
    return ratings;
  }

  /**
   * Gets all ratings for a specific user (ratings they received)
   * @param profileId - The profile ID of the user being rated
   * @returns Array of ratings
   */
  async getByRatedUser(profileId: string): Promise<Rating[]> {
    console.debug('RatingStoreSupabase: Getting ratings for user', profileId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        created_by_profile:profiles!ratings_created_by_fkey(*),
        rating_for_profile:profiles!ratings_rating_for_fkey(*)
      `)
      .eq('rating_for', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('RatingStoreSupabase: Get by rated user failed:', error);
      throw new Error(`Failed to get ratings for user: ${error.message}`);
    }

    const ratings = data.map(row => RatingSupabaseRowMapper.mapRowToRating(row));
    console.debug(`RatingStoreSupabase: Retrieved ${ratings.length} ratings for user ${profileId}`);
    return ratings;
  }

  /**
   * Updates an existing rating
   * @param id - The rating ID
   * @param rating - The new rating value
   * @param notes - Optional notes
   * @returns The updated rating
   */
  async update(id: string, rating: number, notes?: string): Promise<Rating> {
    if (rating < 0 || rating > 500) {
      throw new Error('rating must be between 0 and 500');
    }

    console.debug('RatingStoreSupabase: Updating rating', id);

    const updateData: any = {
      rating,
      updated_at: new Date().toISOString(),
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        created_by_profile:profiles!ratings_created_by_fkey(*),
        rating_for_profile:profiles!ratings_rating_for_fkey(*)
      `)
      .single();

    if (error) {
      console.error('RatingStoreSupabase: Update failed:', error);
      throw new Error(`Failed to update rating: ${error.message}`);
    }

    const updatedRating = RatingSupabaseRowMapper.mapRowToRating(data);
    console.debug('RatingStoreSupabase: Updated rating successfully:', updatedRating.id);

    // Emit rating updated event
    this.eventEmitter.emitRatingUpdated(updatedRating);

    return updatedRating;
  }

  /**
   * Clears all ratings (mainly for testing purposes)
   * WARNING: This will delete all ratings from the database
   */
  async clear(): Promise<void> {
    console.warn('RatingStoreSupabase: Clearing all ratings');

    const { error } = await this.supabaseClient
      .from(this.tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (error) {
      console.error('RatingStoreSupabase: Clear failed:', error);
      throw new Error(`Failed to clear ratings: ${error.message}`);
    }

    console.debug('RatingStoreSupabase: Cleared all ratings');
  }
}
