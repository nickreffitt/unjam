import { describe, it, expect, beforeEach } from 'vitest';
import { type UserProfile } from '@common/types';
import { AuthProfileStoreLocal } from './AuthProfileStoreLocal';

describe('AuthProfileStore', () => {
  let store: AuthProfileStoreLocal;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    store = new AuthProfileStoreLocal();
  });

  const createTestEngineerProfile = (): UserProfile => ({
    id: 'prof-eng-123',
    authId: 'auth-123',
    type: 'engineer',
    name: 'John Engineer',
    email: 'john@example.com',
    githubUsername: 'johneng',
    specialties: ['JavaScript', 'React']
  });

  const createTestCustomerProfile = (): UserProfile => ({
    id: 'prof-cust-456',
    authId: 'auth-456',
    type: 'customer',
    name: 'Jane Customer',
    email: 'jane@example.com'
  });

  describe('create', () => {
    it('creates a new engineer profile successfully', () => {
      const profile = createTestEngineerProfile();
      const createdProfile = store.create(profile);

      expect(createdProfile).toEqual(profile);
      expect(store.getByProfileId(profile.id!)).toEqual(profile);
    });

    it('creates a new customer profile successfully', () => {
      const profile = createTestCustomerProfile();
      const createdProfile = store.create(profile);

      expect(createdProfile).toEqual(profile);
      expect(store.getByProfileId(profile.id!)).toEqual(profile);
    });

    it('throws error when creating engineer without GitHub username', () => {
      const profile: UserProfile = {
        id: 'prof-eng-no-github',
        authId: 'auth-no-github',
        type: 'engineer',
        name: 'Engineer No GitHub',
        email: 'no-github@example.com'
      };

      expect(() => store.create(profile)).toThrow('GitHub username is required for engineer profiles');
    });

    it('throws error when creating profile with duplicate profileId', () => {
      const profile = createTestEngineerProfile();
      store.create(profile);

      expect(() => store.create(profile)).toThrow('Profile with ID prof-eng-123 already exists');
    });

    it('throws error when creating profile with duplicate authId', () => {
      const profile1 = createTestEngineerProfile();
      const profile2: UserProfile = {
        ...profile1,
        id: 'different-profile-id',
      };

      store.create(profile1);
      expect(() => store.create(profile2)).toThrow('Profile with auth ID auth-123 already exists');
    });
  });

  describe('getByProfileId', () => {
    it('returns profile when found', () => {
      const profile = createTestEngineerProfile();
      store.create(profile);

      const foundProfile = store.getByProfileId(profile.id);
      expect(foundProfile).toEqual(profile);
    });

    it('returns null when not found', () => {
      const foundProfile = store.getByProfileId('non-existent-id');
      expect(foundProfile).toBeNull();
    });
  });

  describe('getByAuthId', () => {
    it('returns profile when found', () => {
      const profile = createTestEngineerProfile();
      store.create(profile);

      const foundProfile = store.getByAuthId(profile.authId!);
      expect(foundProfile).toEqual(profile);
    });

    it('returns null when not found', () => {
      const foundProfile = store.getByAuthId('non-existent-auth-id');
      expect(foundProfile).toBeNull();
    });
  });

  describe('getByEmail', () => {
    it('returns profile when found with exact match', () => {
      const profile = createTestEngineerProfile();
      store.create(profile);

      const foundProfile = store.getByEmail('john@example.com');
      expect(foundProfile).toEqual(profile);
    });

    it('returns profile when found with case insensitive match', () => {
      const profile = createTestEngineerProfile();
      store.create(profile);

      const foundProfile = store.getByEmail('JOHN@EXAMPLE.COM');
      expect(foundProfile).toEqual(profile);
    });

    it('returns null when not found', () => {
      const foundProfile = store.getByEmail('non-existent@example.com');
      expect(foundProfile).toBeNull();
    });

    it('returns null when email is empty', () => {
      const foundProfile = store.getByEmail('');
      expect(foundProfile).toBeNull();
    });
  });

  describe('update', () => {
    it('updates existing profile successfully', () => {
      const profile = createTestEngineerProfile();
      store.create(profile);

      const updatedProfile = {
        ...profile,
        name: 'Updated Name',
        specialties: ['TypeScript', 'Node.js']
      };

      const result = store.update(profile.id, updatedProfile);
      expect(result).toEqual(updatedProfile);
      expect(store.getByProfileId(profile.id)).toEqual(updatedProfile);
    });

    it('throws error when updating engineer profile to remove GitHub username', () => {
      const profile = createTestEngineerProfile();
      store.create(profile);

      const updatedProfile = {
        ...profile,
        githubUsername: undefined
      };

      expect(() => store.update(profile.id, updatedProfile))
        .toThrow('GitHub username is required for engineer profiles');
    });

    it('throws error when profile not found', () => {
      const profile = createTestEngineerProfile();

      expect(() => store.update('non-existent-id', profile))
        .toThrow('Profile with ID non-existent-id not found');
    });
  });

  describe('getAllByType', () => {
    beforeEach(() => {
      store.create(createTestEngineerProfile());
      store.create(createTestCustomerProfile());
      store.create({
        id: 'prof-eng-456',
        authId: 'auth-eng-456',
        type: 'engineer',
        name: 'Another Engineer',
        email: 'another@example.com',
        githubUsername: 'anothereng'
      });
    });

    it('returns engineers only', () => {
      const engineers = store.getAllByType('engineer', 10);
      expect(engineers).toHaveLength(2);
      expect(engineers.every(p => p.type === 'engineer')).toBe(true);
    });

    it('returns customers only', () => {
      const customers = store.getAllByType('customer', 10);
      expect(customers).toHaveLength(1);
      expect(customers.every(p => p.type === 'customer')).toBe(true);
    });

    it('respects pagination parameters', () => {
      const firstPage = store.getAllByType('engineer', 1, 0);
      const secondPage = store.getAllByType('engineer', 1, 1);

      expect(firstPage).toHaveLength(1);
      expect(secondPage).toHaveLength(1);
      expect(firstPage[0].id).not.toBe(secondPage[0].id);
    });
  });

  describe('getCountByType', () => {
    beforeEach(() => {
      store.create(createTestEngineerProfile());
      store.create(createTestCustomerProfile());
    });

    it('returns correct count for engineers', () => {
      expect(store.getCountByType('engineer')).toBe(1);
    });

    it('returns correct count for customers', () => {
      expect(store.getCountByType('customer')).toBe(1);
    });
  });

  describe('getAll', () => {
    it('returns all profiles', () => {
      const engineerProfile = createTestEngineerProfile();
      const customerProfile = createTestCustomerProfile();

      store.create(engineerProfile);
      store.create(customerProfile);

      const allProfiles = store.getAll();
      expect(allProfiles).toHaveLength(2);
      expect(allProfiles).toContainEqual(engineerProfile);
      expect(allProfiles).toContainEqual(customerProfile);
    });

    it('returns empty array when no profiles exist', () => {
      const allProfiles = store.getAll();
      expect(allProfiles).toEqual([]);
    });
  });

  describe('clear', () => {
    it('removes all profiles', () => {
      store.create(createTestEngineerProfile());
      store.create(createTestCustomerProfile());

      expect(store.getAll()).toHaveLength(2);

      store.clear();

      expect(store.getAll()).toHaveLength(0);
    });
  });

  describe('persistence', () => {
    it('loads profiles from localStorage on initialization', () => {
      const profile = createTestEngineerProfile();
      store.create(profile);

      // Create a new store instance to test loading from storage
      const newStore = new AuthProfileStoreLocal();
      const loadedProfile = newStore.getByProfileId(profile.id);

      expect(loadedProfile).toEqual(profile);
    });

    it('handles corrupted localStorage data gracefully', () => {
      localStorage.setItem('authProfileStore-profiles', 'invalid json');

      // Should not throw and should start with empty array
      const newStore = new AuthProfileStoreLocal();
      expect(newStore.getAll()).toEqual([]);
    });
  });
});