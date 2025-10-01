import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionStore } from './SubscriptionStore';
import { SubscriptionEventEmitterLocal } from '../events/SubscriptionEventEmitterLocal';
import { type Subscription, type SubscriptionStatus } from '@common/types';

describe('SubscriptionStore', () => {
  const customerId = 'customer-123';
  let subscriptionStore: SubscriptionStore;

  const mockSubscription: Subscription = {
    id: 'sub_123',
    customerId,
    status: 'active' as SubscriptionStatus,
    planName: 'Pro Plan',
    creditPrice: 10.0,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z')
  };

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset console mocks
    vi.clearAllMocks();
    // Create new instance with event emitter
    const eventEmitter = new SubscriptionEventEmitterLocal();
    subscriptionStore = new SubscriptionStore(customerId, eventEmitter);
  });

  describe('constructor', () => {
    it('should initialize with empty subscriptions when no stored data exists', () => {
      // given no stored data exists
      // when SubscriptionStore is created
      const subscriptions = subscriptionStore.getAll();

      // then it should return an empty array
      expect(subscriptions).toEqual([]);
    });

    it('should load subscriptions from localStorage if they exist', () => {
      // given subscriptions are stored in localStorage
      const storedSubscriptions = [mockSubscription];
      localStorage.setItem(`subscriptionStore-${customerId}`, JSON.stringify(storedSubscriptions));

      // when a new SubscriptionStore is created
      const eventEmitter = new SubscriptionEventEmitterLocal();
      const newSubscriptionStore = new SubscriptionStore(customerId, eventEmitter);

      // then it should load the stored subscriptions
      const subscriptions = newSubscriptionStore.getAll();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].id).toBe(mockSubscription.id);
      expect(subscriptions[0].planName).toBe(mockSubscription.planName);
    });
  });

  describe('create', () => {
    it('should create a new subscription and return it', () => {
      // given valid subscription data
      // when create is called
      const createdSubscription = subscriptionStore.create(mockSubscription);

      // then it should return the subscription
      expect(createdSubscription).toEqual(mockSubscription);
      const subscriptions = subscriptionStore.getAll();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0]).toEqual(mockSubscription);
    });

    it('should save subscriptions to localStorage', () => {
      // given a subscription is created
      // when create is called
      subscriptionStore.create(mockSubscription);

      // then it should be saved to localStorage
      const stored = localStorage.getItem(`subscriptionStore-${customerId}`);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe(mockSubscription.id);
    });

    it('should handle multiple subscriptions', () => {
      // given multiple subscriptions are created
      const subscription1 = { ...mockSubscription, id: 'sub_1' };
      const subscription2 = { ...mockSubscription, id: 'sub_2', planName: 'Basic Plan' };

      // when create is called for both
      subscriptionStore.create(subscription1);
      subscriptionStore.create(subscription2);

      // then both should be stored
      const subscriptions = subscriptionStore.getAll();
      expect(subscriptions).toHaveLength(2);
      expect(subscriptions[0].id).toBe('sub_1');
      expect(subscriptions[1].id).toBe('sub_2');
    });
  });

  describe('update', () => {
    it('should update an existing subscription', () => {
      // given a subscription exists
      subscriptionStore.create(mockSubscription);

      // when update is called
      const updatedSubscription = {
        ...mockSubscription,
        status: 'past_due' as SubscriptionStatus,
        updatedAt: new Date('2024-01-02T10:00:00Z')
      };
      const result = subscriptionStore.update(updatedSubscription);

      // then it should update the subscription
      expect(result.status).toBe('past_due');
      const subscription = subscriptionStore.get(mockSubscription.id);
      expect(subscription?.status).toBe('past_due');
    });

    it('should save updated subscription to localStorage', () => {
      // given a subscription exists
      subscriptionStore.create(mockSubscription);

      // when update is called
      const updatedSubscription = {
        ...mockSubscription,
        planName: 'Premium Plan'
      };
      subscriptionStore.update(updatedSubscription);

      // then it should be saved to localStorage
      const stored = localStorage.getItem(`subscriptionStore-${customerId}`);
      const parsed = JSON.parse(stored!);
      expect(parsed[0].planName).toBe('Premium Plan');
    });
  });

  describe('delete', () => {
    it('should delete a subscription', () => {
      // given a subscription exists
      subscriptionStore.create(mockSubscription);

      // when delete is called
      subscriptionStore.delete(mockSubscription.id);

      // then the subscription should be removed
      const subscription = subscriptionStore.get(mockSubscription.id);
      expect(subscription).toBeUndefined();
    });

    it('should update localStorage after deletion', () => {
      // given a subscription exists
      subscriptionStore.create(mockSubscription);

      // when delete is called
      subscriptionStore.delete(mockSubscription.id);

      // then localStorage should be updated
      const stored = localStorage.getItem(`subscriptionStore-${customerId}`);
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(0);
    });

    it('should handle deletion of non-existent subscription gracefully', () => {
      // given no subscription exists
      // when delete is called
      subscriptionStore.delete('non-existent-id');

      // then it should not throw an error
      expect(subscriptionStore.getCount()).toBe(0);
    });
  });

  describe('get', () => {
    it('should retrieve a subscription by ID', () => {
      // given a subscription exists
      subscriptionStore.create(mockSubscription);

      // when get is called
      const subscription = subscriptionStore.get(mockSubscription.id);

      // then it should return the subscription
      expect(subscription).toBeDefined();
      expect(subscription?.id).toBe(mockSubscription.id);
      expect(subscription?.planName).toBe(mockSubscription.planName);
    });

    it('should return undefined for non-existent subscription', () => {
      // given no subscription exists with the ID
      // when get is called
      const subscription = subscriptionStore.get('non-existent-id');

      // then it should return undefined
      expect(subscription).toBeUndefined();
    });

    it('should return a copy to prevent external mutations', () => {
      // given a subscription exists
      subscriptionStore.create(mockSubscription);

      // when get is called and the result is modified
      const subscription = subscriptionStore.get(mockSubscription.id);
      if (subscription) {
        subscription.planName = 'Modified Plan';
      }

      // then the stored subscription should remain unchanged
      const storedSubscription = subscriptionStore.get(mockSubscription.id);
      expect(storedSubscription?.planName).toBe(mockSubscription.planName);
    });
  });

  describe('getAll', () => {
    it('should return all subscriptions', () => {
      // given multiple subscriptions exist
      const subscription1 = { ...mockSubscription, id: 'sub_1' };
      const subscription2 = { ...mockSubscription, id: 'sub_2' };
      subscriptionStore.create(subscription1);
      subscriptionStore.create(subscription2);

      // when getAll is called
      const subscriptions = subscriptionStore.getAll();

      // then it should return all subscriptions
      expect(subscriptions).toHaveLength(2);
      expect(subscriptions.map(s => s.id)).toEqual(['sub_1', 'sub_2']);
    });

    it('should return empty array when no subscriptions exist', () => {
      // given no subscriptions exist
      // when getAll is called
      const subscriptions = subscriptionStore.getAll();

      // then it should return an empty array
      expect(subscriptions).toEqual([]);
    });

    it('should return copies to prevent external mutations', () => {
      // given a subscription exists
      subscriptionStore.create(mockSubscription);

      // when getAll is called and the result is modified
      const subscriptions = subscriptionStore.getAll();
      subscriptions[0].planName = 'Modified Plan';

      // then the stored subscription should remain unchanged
      const storedSubscriptions = subscriptionStore.getAll();
      expect(storedSubscriptions[0].planName).toBe(mockSubscription.planName);
    });
  });

  describe('getActive', () => {
    it('should return active subscription', () => {
      // given an active subscription exists
      const activeSubscription = { ...mockSubscription, status: 'active' as SubscriptionStatus };
      subscriptionStore.create(activeSubscription);

      // when getActive is called
      const result = subscriptionStore.getActive();

      // then it should return the active subscription
      expect(result).toBeDefined();
      expect(result?.status).toBe('active');
    });

    it('should return trialing subscription', () => {
      // given a trialing subscription exists
      const trialingSubscription = { ...mockSubscription, status: 'trialing' as SubscriptionStatus };
      subscriptionStore.create(trialingSubscription);

      // when getActive is called
      const result = subscriptionStore.getActive();

      // then it should return the trialing subscription
      expect(result).toBeDefined();
      expect(result?.status).toBe('trialing');
    });

    it('should return undefined when only canceled subscriptions exist', () => {
      // given only canceled subscriptions exist
      const canceledSubscription = { ...mockSubscription, status: 'canceled' as SubscriptionStatus };
      subscriptionStore.create(canceledSubscription);

      // when getActive is called
      const result = subscriptionStore.getActive();

      // then it should return undefined
      expect(result).toBeUndefined();
    });

    it('should return undefined when no subscriptions exist', () => {
      // given no subscriptions exist
      // when getActive is called
      const result = subscriptionStore.getActive();

      // then it should return undefined
      expect(result).toBeUndefined();
    });
  });

  describe('getCount', () => {
    it('should return the number of subscriptions', () => {
      // given multiple subscriptions are created
      subscriptionStore.create({ ...mockSubscription, id: 'sub_1' });
      subscriptionStore.create({ ...mockSubscription, id: 'sub_2' });

      // when getCount is called
      const count = subscriptionStore.getCount();

      // then it should return the correct count
      expect(count).toBe(2);
    });

    it('should return zero when no subscriptions exist', () => {
      // given no subscriptions exist
      // when getCount is called
      const count = subscriptionStore.getCount();

      // then it should return zero
      expect(count).toBe(0);
    });
  });

  describe('reload', () => {
    it('should reload subscriptions from localStorage', () => {
      // given a subscription is created and stored
      subscriptionStore.create(mockSubscription);

      // when reload is called
      subscriptionStore.reload();

      // then the subscription should still be accessible
      const subscription = subscriptionStore.get(mockSubscription.id);
      expect(subscription).toBeDefined();
      expect(subscription?.id).toBe(mockSubscription.id);
    });
  });

  describe('clear', () => {
    it('should clear all subscriptions', () => {
      // given subscriptions exist
      subscriptionStore.create(mockSubscription);
      subscriptionStore.create({ ...mockSubscription, id: 'sub_2' });

      // when clear is called
      subscriptionStore.clear();

      // then all subscriptions should be removed
      expect(subscriptionStore.getCount()).toBe(0);
      expect(subscriptionStore.getAll()).toEqual([]);
    });

    it('should clear subscriptions from localStorage', () => {
      // given subscriptions exist
      subscriptionStore.create(mockSubscription);

      // when clear is called
      subscriptionStore.clear();

      // then localStorage should be cleared
      const stored = localStorage.getItem(`subscriptionStore-${customerId}`);
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(0);
    });
  });
});
