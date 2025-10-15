import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RatingStoreSupabase } from './RatingStoreSupabase';
import { type Rating, type CustomerProfile, type EngineerProfile } from '@common/types';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

describe('RatingStore (Integration)', () => {
  let supabaseClient: SupabaseClient;
  let ratingStore: RatingStoreSupabase;

  const mockCustomer: CustomerProfile = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'John Doe',
    type: 'customer',
    email: 'john@example.com'
  };

  const mockEngineer: EngineerProfile = {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Jane Smith',
    type: 'engineer',
    email: 'jane@example.com'
  };

  const ticketId = 'TKT-TEST-123';

  beforeAll(async () => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    ratingStore = new RatingStoreSupabase(supabaseClient);

    // Clear any existing test data
    await ratingStore.clear();
  });

  afterAll(async () => {
    // Clean up test data
    await ratingStore.clear();
  });

  describe('constructor', () => {
    it('should initialize with valid supabase client', () => {
      expect(() => new RatingStoreSupabase(supabaseClient)).not.toThrow();
    });

    it('should throw error when supabaseClient is null', () => {
      expect(() => new RatingStoreSupabase(null as any)).toThrow(
        'RatingStoreSupabase: supabaseClient is required'
      );
    });
  });

  describe('create', () => {
    it('should create a new rating and return it with generated ID', async () => {
      // given a valid rating object
      const rating: Rating = {
        id: 'RATING-1',
        ticketId,
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 450,
        notes: 'Great job!',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // when creating the rating
      const createdRating = await ratingStore.create(rating);

      // then it should be created successfully
      expect(createdRating).toBeDefined();
      expect(createdRating.ticketId).toBe(ticketId);
      expect(createdRating.createdBy.id).toBe(mockCustomer.id);
      expect(createdRating.ratingFor.id).toBe(mockEngineer.id);
      expect(createdRating.rating).toBe(450);
      expect(createdRating.notes).toBe('Great job!');
      expect(createdRating.createdAt).toBeInstanceOf(Date);
      expect(createdRating.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when ticket_id is missing', async () => {
      // given a rating without ticket_id
      const rating: Rating = {
        id: 'RATING-2',
        ticketId: '',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 400,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // when/then creating should fail
      await expect(ratingStore.create(rating)).rejects.toThrow(
        'ticket_id is required for rating creation'
      );
    });

    it('should throw error when rating is out of range', async () => {
      // given a rating with invalid value
      const rating: Rating = {
        id: 'RATING-3',
        ticketId,
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 600,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // when/then creating should fail
      await expect(ratingStore.create(rating)).rejects.toThrow(
        'rating must be between 0 and 500'
      );
    });

    it('should handle ratings without notes', async () => {
      // given a rating without notes
      const rating: Rating = {
        id: 'RATING-4',
        ticketId: 'TKT-TEST-456',
        createdBy: mockEngineer,
        ratingFor: mockCustomer,
        rating: 300,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // when creating the rating
      const createdRating = await ratingStore.create(rating);

      // then notes should be undefined
      expect(createdRating.notes).toBeUndefined();
    });
  });

  describe('getByTicketId', () => {
    beforeAll(async () => {
      await ratingStore.clear();

      // Create a test rating
      const rating: Rating = {
        id: 'RATING-5',
        ticketId: 'TKT-FIND-123',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 400,
        notes: 'Good work',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await ratingStore.create(rating);
    });

    it('should return rating when it exists', async () => {
      // when getting rating by ticket ID
      const rating = await ratingStore.getByTicketId('TKT-FIND-123');

      // then it should be found
      expect(rating).toBeDefined();
      expect(rating?.ticketId).toBe('TKT-FIND-123');
      expect(rating?.rating).toBe(400);
    });

    it('should return undefined when rating does not exist', async () => {
      // when getting non-existent rating
      const rating = await ratingStore.getByTicketId('TKT-NONEXISTENT');

      // then it should return undefined
      expect(rating).toBeUndefined();
    });
  });

  describe('getByCreator', () => {
    beforeAll(async () => {
      await ratingStore.clear();

      // Create multiple ratings by the same creator
      const rating1: Rating = {
        id: 'RATING-6',
        ticketId: 'TKT-CREATOR-1',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 350,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const rating2: Rating = {
        id: 'RATING-7',
        ticketId: 'TKT-CREATOR-2',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 450,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await ratingStore.create(rating1);
      await ratingStore.create(rating2);
    });

    it('should return all ratings created by a user', async () => {
      // when getting ratings by creator
      const ratings = await ratingStore.getByCreator(mockCustomer.id);

      // then all ratings should be returned
      expect(ratings.length).toBeGreaterThanOrEqual(2);
      expect(ratings.every(r => r.createdBy.id === mockCustomer.id)).toBe(true);
    });

    it('should return empty array when user has not created any ratings', async () => {
      // when getting ratings for non-existent creator
      const ratings = await ratingStore.getByCreator('00000000-0000-0000-0000-999999999999');

      // then empty array should be returned
      expect(ratings).toEqual([]);
    });
  });

  describe('getByRatedUser', () => {
    beforeAll(async () => {
      await ratingStore.clear();

      // Create multiple ratings for the same user
      const rating1: Rating = {
        id: 'RATING-8',
        ticketId: 'TKT-RATED-1',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 400,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const rating2: Rating = {
        id: 'RATING-9',
        ticketId: 'TKT-RATED-2',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 500,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await ratingStore.create(rating1);
      await ratingStore.create(rating2);
    });

    it('should return all ratings for a user', async () => {
      // when getting ratings for user
      const ratings = await ratingStore.getByRatedUser(mockEngineer.id);

      // then all ratings should be returned
      expect(ratings.length).toBeGreaterThanOrEqual(2);
      expect(ratings.every(r => r.ratingFor.id === mockEngineer.id)).toBe(true);
    });

    it('should return empty array when user has no ratings', async () => {
      // when getting ratings for user with no ratings
      const ratings = await ratingStore.getByRatedUser('00000000-0000-0000-0000-999999999999');

      // then empty array should be returned
      expect(ratings).toEqual([]);
    });
  });

  describe('update', () => {
    let testRatingId: string;

    beforeAll(async () => {
      await ratingStore.clear();

      // Create a rating to update
      const rating: Rating = {
        id: 'RATING-10',
        ticketId: 'TKT-UPDATE-1',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 300,
        notes: 'Initial notes',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const created = await ratingStore.create(rating);
      testRatingId = created.id;
    });

    it('should update rating value and notes', async () => {
      // when updating rating
      const updated = await ratingStore.update(testRatingId, 450, 'Updated notes');

      // then rating should be updated
      expect(updated.rating).toBe(450);
      expect(updated.notes).toBe('Updated notes');
      expect(updated.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when rating is out of range', async () => {
      // when/then updating with invalid rating should fail
      await expect(ratingStore.update(testRatingId, 600)).rejects.toThrow(
        'rating must be between 0 and 500'
      );
    });
  });

  describe('clear', () => {
    it('should remove all ratings', async () => {
      // given some ratings exist
      const rating: Rating = {
        id: 'RATING-11',
        ticketId: 'TKT-CLEAR-1',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 400,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await ratingStore.create(rating);

      // when clearing
      await ratingStore.clear();

      // then all ratings should be removed
      const ratings = await ratingStore.getByCreator(mockCustomer.id);
      expect(ratings).toEqual([]);
    });
  });
});
