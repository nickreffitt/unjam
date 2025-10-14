import React, { useState } from 'react';
import { useSubscriptionManager } from '../../contexts/SubscriptionManagerContext';
import type { Subscription } from '@common/types';

interface ManageSubscriptionProps {
  subscription: Subscription;
  creditBalance: number | null;
}

const ManageSubscription: React.FC<ManageSubscriptionProps> = ({
  subscription,
  creditBalance,
}) => {
  const { subscriptionManager, userProfile } = useSubscriptionManager();
  const [isLoading, setIsLoading] = useState(false);

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const portalUrl = await subscriptionManager.createBillingPortalLink(userProfile.id);
      window.open(portalUrl, '_blank');
    } catch (error) {
      console.error('[ManageSubscription] Error creating billing portal link:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="unjam-h-full unjam-flex unjam-items-center unjam-justify-center unjam-p-4">
      <div className="unjam-max-w-2xl unjam-w-full unjam-bg-white unjam-rounded-lg unjam-shadow-lg unjam-p-8">
        <h2 className="unjam-text-2xl unjam-font-bold unjam-mb-6">Your Subscription</h2>

        <div className="unjam-space-y-4 unjam-mb-6">
          <div>
            <span className="unjam-text-gray-600">Plan:</span>
            <span className="unjam-ml-2 unjam-font-semibold">{subscription.planName}</span>
          </div>

          <div>
            <span className="unjam-text-gray-600">Status:</span>
            <span className="unjam-ml-2 unjam-font-semibold unjam-capitalize">
              {subscription.status}
            </span>
          </div>

          {creditBalance !== null && (
            <div>
              <span className="unjam-text-gray-600">Credit Balance:</span>
              <span className="unjam-ml-2 unjam-font-semibold">
                {creditBalance}
              </span>
            </div>
          )}

          {subscription.currentPeriodEnd && (
            <div>
              <span className="unjam-text-gray-600">Current Period Ends:</span>
              <span className="unjam-ml-2 unjam-font-semibold">
                {subscription.currentPeriodEnd.toLocaleDateString()}
              </span>
            </div>
          )}

          {subscription.cancelAtPeriodEnd && (
            <div className="unjam-bg-yellow-50 unjam-border unjam-border-yellow-200 unjam-rounded-lg unjam-p-4">
              <p className="unjam-text-yellow-800">
                Your subscription will be canceled at the end of the current period.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleManageSubscription}
          disabled={isLoading}
          className="unjam-w-full unjam-px-6 unjam-py-3 unjam-bg-blue-600 unjam-text-white unjam-rounded-md hover:unjam-bg-blue-700 disabled:unjam-bg-gray-400 disabled:unjam-cursor-not-allowed unjam-transition-colors unjam-font-medium"
        >
          {isLoading ? 'Loading...' : 'Manage Subscription'}
        </button>
      </div>
    </div>
  );
};

export default ManageSubscription;
