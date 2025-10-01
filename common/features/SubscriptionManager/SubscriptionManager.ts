import { type SubscriptionStore } from '@common/features/SubscriptionManager/store';

export class SubscriptionManager {
  private readonly subscriptionStore: SubscriptionStore;

  constructor(subscriptionStore: SubscriptionStore) {
    this.subscriptionStore = subscriptionStore;
  }

}
