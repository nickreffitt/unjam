import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RatingManager } from './RatingManager';
import { type RatingStore } from './store';
import { type RatingChanges } from './store/RatingChanges';
import { type Rating, type CustomerProfile, type EngineerProfile } from '@common/types';

describe('RatingManager', () => {
  let ratingManager: RatingManager;
  let mockRatingStore: RatingStore;
  let mockChanges: RatingChanges;

  const mockCustomer: CustomerProfile = {
    id: 'customer-1',
    name: 'John Doe',
    type: 'customer',
    email: 'john@example.com'
  };

  const mockEngineer: EngineerProfile = {
    id: 'engineer-1',
    name: 'Jane Smith',
    type: 'engineer',
    email: 'jane@example.com'
  };

  beforeEach(() => {
    // Create a mock RatingStore
    mockRatingStore = {
      create: vi.fn(),
      getByTicketId: vi.fn(),
      getByCreator: vi.fn(),
      getByRatedUser: vi.fn(),
      update: vi.fn(),
      clear: vi.fn(),
    };

    // Create a mock RatingChanges
    mockChanges = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    };

    ratingManager = new RatingManager(mockRatingStore, mockChanges);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with a rating store', () => {
      expect(() => new RatingManager(mockRatingStore, mockChanges)).not.toThrow();
    });

    it('should throw error when ratingStore is null', () => {
      expect(() => new RatingManager(null as any, mockChanges)).toThrow(
        'RatingManager: ratingStore is required'
      );
    });
  });

  describe('createRating', () => {
    it('should create a new rating and return it', async () => {
      // given a valid rating will be created
      const expectedRating: Rating = {
        id: 'RATING-123',
        ticketId: 'TKT-123',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 400,
        notes: 'Great service!',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockRatingStore.create as any).mockResolvedValue(expectedRating);

      // when creating a rating
      const result = await ratingManager.createRating(
        'TKT-123',
        mockCustomer,
        mockEngineer,
        400,
        'Great service!'
      );

      // then the rating should be created
      expect(result).toEqual(expectedRating);
      expect(mockRatingStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 'TKT-123',
          createdBy: mockCustomer,
          ratingFor: mockEngineer,
          rating: 400,
          notes: 'Great service!',
        })
      );
    });

    it('should throw error when ticket ID is empty', async () => {
      // when/then creating with empty ticket ID should fail
      await expect(
        ratingManager.createRating('', mockCustomer, mockEngineer, 400)
      ).rejects.toThrow('Ticket ID is required');

      await expect(
        ratingManager.createRating('   ', mockCustomer, mockEngineer, 400)
      ).rejects.toThrow('Ticket ID is required');
    });

    it('should throw error when createdBy is invalid', async () => {
      // when/then creating with invalid createdBy should fail
      await expect(
        ratingManager.createRating('TKT-123', null as any, mockEngineer, 400)
      ).rejects.toThrow('Created by profile is required');

      await expect(
        ratingManager.createRating('TKT-123', { id: '' } as any, mockEngineer, 400)
      ).rejects.toThrow('Created by profile is required');
    });

    it('should throw error when ratingFor is invalid', async () => {
      // when/then creating with invalid ratingFor should fail
      await expect(
        ratingManager.createRating('TKT-123', mockCustomer, null as any, 400)
      ).rejects.toThrow('Rating for profile is required');

      await expect(
        ratingManager.createRating('TKT-123', mockCustomer, { id: '' } as any, 400)
      ).rejects.toThrow('Rating for profile is required');
    });

    it('should throw error when rating is out of range', async () => {
      // when/then creating with invalid rating should fail
      await expect(
        ratingManager.createRating('TKT-123', mockCustomer, mockEngineer, -1)
      ).rejects.toThrow('Rating must be between 0 and 500');

      await expect(
        ratingManager.createRating('TKT-123', mockCustomer, mockEngineer, 501)
      ).rejects.toThrow('Rating must be between 0 and 500');
    });

    it('should handle ratings without notes', async () => {
      // given a rating without notes
      const expectedRating: Rating = {
        id: 'RATING-124',
        ticketId: 'TKT-124',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 350,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockRatingStore.create as any).mockResolvedValue(expectedRating);

      // when creating without notes
      const result = await ratingManager.createRating(
        'TKT-124',
        mockCustomer,
        mockEngineer,
        350
      );

      // then it should work
      expect(result).toEqual(expectedRating);
      expect(mockRatingStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: undefined,
        })
      );
    });

    it('should trim ticket ID and notes', async () => {
      // given a rating with whitespace
      const expectedRating: Rating = {
        id: 'RATING-125',
        ticketId: 'TKT-125',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 400,
        notes: 'Trimmed notes',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockRatingStore.create as any).mockResolvedValue(expectedRating);

      // when creating with whitespace
      await ratingManager.createRating(
        '  TKT-125  ',
        mockCustomer,
        mockEngineer,
        400,
        '  Trimmed notes  '
      );

      // then it should trim
      expect(mockRatingStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 'TKT-125',
          notes: 'Trimmed notes',
        })
      );
    });

    it('should generate unique rating IDs', async () => {
      // given two ratings will be created
      const rating1: Rating = {
        id: 'RATING-1',
        ticketId: 'TKT-1',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 400,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const rating2: Rating = {
        id: 'RATING-2',
        ticketId: 'TKT-2',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 450,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockRatingStore.create as any)
        .mockResolvedValueOnce(rating1)
        .mockResolvedValueOnce(rating2);

      // when creating two ratings
      await ratingManager.createRating('TKT-1', mockCustomer, mockEngineer, 400);
      await ratingManager.createRating('TKT-2', mockCustomer, mockEngineer, 450);

      // then they should have different IDs
      const call1 = (mockRatingStore.create as any).mock.calls[0][0];
      const call2 = (mockRatingStore.create as any).mock.calls[1][0];
      expect(call1.id).not.toBe(call2.id);
    });
  });

  describe('getRatingByTicketId', () => {
    it('should return rating when it exists', async () => {
      // given a rating exists
      const expectedRating: Rating = {
        id: 'RATING-123',
        ticketId: 'TKT-123',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 400,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockRatingStore.getByTicketId as any).mockResolvedValue(expectedRating);

      // when getting rating by ticket ID
      const result = await ratingManager.getRatingByTicketId('TKT-123');

      // then it should be found
      expect(result).toEqual(expectedRating);
      expect(mockRatingStore.getByTicketId).toHaveBeenCalledWith('TKT-123');
    });

    it('should return undefined when rating does not exist', async () => {
      // given no rating exists
      (mockRatingStore.getByTicketId as any).mockResolvedValue(undefined);

      // when getting non-existent rating
      const result = await ratingManager.getRatingByTicketId('TKT-999');

      // then it should return undefined
      expect(result).toBeUndefined();
    });

    it('should throw error when ticket ID is empty', async () => {
      // when/then getting with empty ticket ID should fail
      await expect(ratingManager.getRatingByTicketId('')).rejects.toThrow(
        'Ticket ID is required'
      );
    });

    it('should trim ticket ID', async () => {
      // given a rating exists
      (mockRatingStore.getByTicketId as any).mockResolvedValue(undefined);

      // when getting with whitespace
      await ratingManager.getRatingByTicketId('  TKT-123  ');

      // then it should trim
      expect(mockRatingStore.getByTicketId).toHaveBeenCalledWith('TKT-123');
    });
  });

  describe('getRatingsCreatedBy', () => {
    it('should return all ratings created by a user', async () => {
      // given ratings exist
      const expectedRatings: Rating[] = [
        {
          id: 'RATING-1',
          ticketId: 'TKT-1',
          createdBy: mockCustomer,
          ratingFor: mockEngineer,
          rating: 400,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'RATING-2',
          ticketId: 'TKT-2',
          createdBy: mockCustomer,
          ratingFor: mockEngineer,
          rating: 450,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (mockRatingStore.getByCreator as any).mockResolvedValue(expectedRatings);

      // when getting ratings by creator
      const result = await ratingManager.getRatingsCreatedBy('customer-1');

      // then all ratings should be returned
      expect(result).toEqual(expectedRatings);
      expect(mockRatingStore.getByCreator).toHaveBeenCalledWith('customer-1');
    });

    it('should throw error when profile ID is empty', async () => {
      // when/then getting with empty profile ID should fail
      await expect(ratingManager.getRatingsCreatedBy('')).rejects.toThrow(
        'Profile ID is required'
      );
    });
  });

  describe('getRatingsForUser', () => {
    it('should return all ratings for a user', async () => {
      // given ratings exist for user
      const expectedRatings: Rating[] = [
        {
          id: 'RATING-1',
          ticketId: 'TKT-1',
          createdBy: mockCustomer,
          ratingFor: mockEngineer,
          rating: 400,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'RATING-2',
          ticketId: 'TKT-2',
          createdBy: mockCustomer,
          ratingFor: mockEngineer,
          rating: 450,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (mockRatingStore.getByRatedUser as any).mockResolvedValue(expectedRatings);

      // when getting ratings for user
      const result = await ratingManager.getRatingsForUser('engineer-1');

      // then all ratings should be returned
      expect(result).toEqual(expectedRatings);
      expect(mockRatingStore.getByRatedUser).toHaveBeenCalledWith('engineer-1');
    });

    it('should throw error when profile ID is empty', async () => {
      // when/then getting with empty profile ID should fail
      await expect(ratingManager.getRatingsForUser('')).rejects.toThrow(
        'Profile ID is required'
      );
    });
  });

  describe('updateRating', () => {
    it('should update a rating', async () => {
      // given a rating will be updated
      const updatedRating: Rating = {
        id: 'RATING-123',
        ticketId: 'TKT-123',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 500,
        notes: 'Updated notes',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      };

      (mockRatingStore.update as any).mockResolvedValue(updatedRating);

      // when updating rating
      const result = await ratingManager.updateRating('RATING-123', 500, 'Updated notes');

      // then it should be updated
      expect(result).toEqual(updatedRating);
      expect(mockRatingStore.update).toHaveBeenCalledWith('RATING-123', 500, 'Updated notes');
    });

    it('should throw error when rating ID is empty', async () => {
      // when/then updating with empty ID should fail
      await expect(ratingManager.updateRating('', 400)).rejects.toThrow(
        'Rating ID is required'
      );
    });

    it('should throw error when rating is out of range', async () => {
      // when/then updating with invalid rating should fail
      await expect(ratingManager.updateRating('RATING-123', -1)).rejects.toThrow(
        'Rating must be between 0 and 500'
      );

      await expect(ratingManager.updateRating('RATING-123', 501)).rejects.toThrow(
        'Rating must be between 0 and 500'
      );
    });

    it('should trim rating ID and notes', async () => {
      // given a rating will be updated
      const updatedRating: Rating = {
        id: 'RATING-123',
        ticketId: 'TKT-123',
        createdBy: mockCustomer,
        ratingFor: mockEngineer,
        rating: 400,
        notes: 'Trimmed',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockRatingStore.update as any).mockResolvedValue(updatedRating);

      // when updating with whitespace
      await ratingManager.updateRating('  RATING-123  ', 400, '  Trimmed  ');

      // then it should trim
      expect(mockRatingStore.update).toHaveBeenCalledWith('RATING-123', 400, 'Trimmed');
    });
  });

  describe('getAverageRating', () => {
    it('should calculate average rating correctly', async () => {
      // given multiple ratings exist
      const ratings: Rating[] = [
        {
          id: 'RATING-1',
          ticketId: 'TKT-1',
          createdBy: mockCustomer,
          ratingFor: mockEngineer,
          rating: 300,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'RATING-2',
          ticketId: 'TKT-2',
          createdBy: mockCustomer,
          ratingFor: mockEngineer,
          rating: 400,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'RATING-3',
          ticketId: 'TKT-3',
          createdBy: mockCustomer,
          ratingFor: mockEngineer,
          rating: 500,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (mockRatingStore.getByRatedUser as any).mockResolvedValue(ratings);

      // when getting average rating
      const result = await ratingManager.getAverageRating('engineer-1');

      // then average should be correct (300 + 400 + 500) / 3 = 400
      expect(result).toBe(400);
    });

    it('should return 0 when no ratings exist', async () => {
      // given no ratings exist
      (mockRatingStore.getByRatedUser as any).mockResolvedValue([]);

      // when getting average rating
      const result = await ratingManager.getAverageRating('engineer-1');

      // then it should return 0
      expect(result).toBe(0);
    });

    it('should round to nearest integer', async () => {
      // given ratings that result in decimal average
      const ratings: Rating[] = [
        {
          id: 'RATING-1',
          ticketId: 'TKT-1',
          createdBy: mockCustomer,
          ratingFor: mockEngineer,
          rating: 350,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'RATING-2',
          ticketId: 'TKT-2',
          createdBy: mockCustomer,
          ratingFor: mockEngineer,
          rating: 400,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (mockRatingStore.getByRatedUser as any).mockResolvedValue(ratings);

      // when getting average rating
      const result = await ratingManager.getAverageRating('engineer-1');

      // then it should round (350 + 400) / 2 = 375
      expect(result).toBe(375);
    });

    it('should throw error when profile ID is empty', async () => {
      // when/then getting average with empty profile ID should fail
      await expect(ratingManager.getAverageRating('')).rejects.toThrow(
        'Profile ID is required'
      );
    });
  });
});
