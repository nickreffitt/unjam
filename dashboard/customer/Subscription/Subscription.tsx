import React from 'react';
import StripePricingTable from './components/StripePricingTable/StripePricingTable';
import ManageSubscription from './components/ManageSubscription/ManageSubscription';
import { useSubscriptionState } from './hooks/useSubscriptionState';

interface SubscriptionProps {
  stripePricingTableId?: string;
  stripePublishableKey?: string;
  clientReferenceId?: string;
  customerEmail?: string;
}

const Subscription: React.FC<SubscriptionProps> = ({
  stripePricingTableId,
  stripePublishableKey,
  clientReferenceId,
  customerEmail,
}) => {
  const { subscription, creditBalance, isLoading, error, hasActiveSubscription } = useSubscriptionState();

  if (isLoading) {
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
      customerEmail={customerEmail}
    />
  );
};

export default Subscription;