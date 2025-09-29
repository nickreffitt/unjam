import React from 'react';
import StripePricingTable from './components/StripePricingTable/StripePricingTable';

export type PricingTableMode = 'custom' | 'stripe';

interface PricingTableProps {
  mode?: PricingTableMode;
  title?: string;
  subtitle?: string;
  // Stripe-specific props
  stripePricingTableId?: string;
  stripePublishableKey?: string;
  clientReferenceId?: string;
  customerEmail?: string;
  customerSessionClientSecret?: string;
}

const PricingTable: React.FC<PricingTableProps> = ({
  stripePricingTableId,
  stripePublishableKey,
  clientReferenceId,
  customerEmail,
  customerSessionClientSecret
}) => {

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
      customerSessionClientSecret={customerSessionClientSecret}
    />
  );
};

export default PricingTable;