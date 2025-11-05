import React, { useState, useEffect } from 'react';
import StripePricingTable from './components/StripePricingTable/StripePricingTable';
import ManageSubscription from './components/ManageSubscription/ManageSubscription';
import { useSubscriptionState } from './hooks/useSubscriptionState';
import { useSubscriptionManager } from './contexts/SubscriptionManagerContext';

interface SubscriptionProps {
  stripePricingTableId?: string;
  stripePublishableKey?: string;
  clientReferenceId?: string;
}

const Subscription: React.FC<SubscriptionProps> = ({
  stripePricingTableId,
  stripePublishableKey,
  clientReferenceId,
}) => {
  const { subscription, creditBalance, pendingCredits, isLoading, error, hasActiveSubscription } = useSubscriptionState();
  const { subscriptionManager, userProfile } = useSubscriptionManager();
  const [customerSessionSecret, setCustomerSessionSecret] = useState<string | undefined>(undefined);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Fetch customer session when showing pricing table
  useEffect(() => {
    const fetchCustomerSession = async () => {
      if (!hasActiveSubscription && stripePricingTableId && stripePublishableKey) {
        try {
          setSessionLoading(true);
          console.info('[Subscription] Fetching customer session for profile:', userProfile.id);
          const clientSecret = await subscriptionManager.createCustomerSession(userProfile.id);
          setCustomerSessionSecret(clientSecret);
          console.info('[Subscription] Successfully fetched customer session');
        } catch (err) {
          console.error('[Subscription] Error fetching customer session:', err);
          // Don't fail the entire component - pricing table can work without customer session
          setCustomerSessionSecret(undefined);
        } finally {
          setSessionLoading(false);
        }
      }
    };

    fetchCustomerSession();
  }, [hasActiveSubscription, stripePricingTableId, stripePublishableKey, subscriptionManager, userProfile.id]);

  if (isLoading || sessionLoading) {
    return (
      <div className="unjam-h-full unjam-flex unjam-items-center unjam-justify-center unjam-p-4">
        <div className="unjam-text-gray-600">Loading subscription...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="unjam-h-full unjam-overflow-y-auto unjam-p-4">
        <div className="unjam-max-w-6xl unjam-mx-auto unjam-text-center">
          <div className="unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded-lg unjam-p-4">
            <p className="unjam-text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // If user has an active subscription, show management interface
  if (hasActiveSubscription && subscription) {
    return (
      <ManageSubscription
        subscription={subscription}
        creditBalance={creditBalance}
        pendingCredits={pendingCredits}
      />
    );
  }

  // Otherwise, show pricing table for new subscription
  if (!stripePricingTableId || !stripePublishableKey) {
    console.error('Stripe pricing table requires pricingTableId and publishableKey props');
    return (
      <div className="unjam-h-full unjam-overflow-y-auto unjam-p-4">
        <div className="unjam-max-w-6xl unjam-mx-auto unjam-text-center">
          <div className="unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded-lg unjam-p-4">
            <p className="unjam-text-red-600">
              Stripe pricing table configuration error. Please check your props.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StripePricingTable
      pricingTableId={stripePricingTableId}
      publishableKey={stripePublishableKey}
      clientReferenceId={clientReferenceId}
      customerSessionClientSecret={customerSessionSecret}
    />
  );
};

export default Subscription;