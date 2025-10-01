import { type SubscriptionEventEmitter } from '@common/features/SubscriptionManager/events';

export class SubscriptionStore {
  private readonly eventEmitter: SubscriptionEventEmitter;

  constructor(eventEmitter: SubscriptionEventEmitter) {
    this.eventEmitter = eventEmitter;
  }
}
