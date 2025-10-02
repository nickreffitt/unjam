import React, { useEffect } from 'react';
import { useBillingPortalLink } from '../../hooks/useBillingPortalLink';

interface StripePricingTableProps {
  pricingTableId: string;
  publishableKey: string;
  clientReferenceId?: string;
  customerEmail?: string;
}

// TypeScript declaration for the Stripe pricing table custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'pricing-table-id'?: string;
          'publishable-key'?: string;
          'client-reference-id'?: string;
          'customer-email'?: string;
        },
        HTMLElement
      >;
    }
  }
}

const StripePricingTable: React.FC<StripePricingTableProps> = ({
  pricingTableId,
  publishableKey,
  clientReferenceId,
  customerEmail,
}) => {
  const { portalUrl, isLoading: isLoadingPortal } = useBillingPortalLink();

  useEffect(() => {
    // Ensure the Stripe pricing table script is loaded
    if (!document.querySelector('script[src="https://js.stripe.com/v3/pricing-table.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/pricing-table.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleManageSubscription = () => {
    if (portalUrl) {
      window.open(portalUrl, '_blank');
    }
  };

  return (
    <div className="unjam-h-full unjam-overflow-y-auto">
      <div className="unjam-p-4">
        <div className="unjam-max-w-6xl max-lg:unjam-max-w-3xl unjam-mx-auto">
          {/* Manage Subscription Button */}
          <div className="unjam-mb-4 unjam-flex unjam-justify-end">
            <button
              onClick={handleManageSubscription}
              disabled={!portalUrl || isLoadingPortal}
              className="unjam-px-4 unjam-py-2 unjam-bg-blue-600 unjam-text-white unjam-rounded-md hover:unjam-bg-blue-700 disabled:unjam-bg-gray-400 disabled:unjam-cursor-not-allowed unjam-transition-colors"
            >
              {isLoadingPortal ? 'Loading...' : 'Manage Subscription'}
            </button>
          </div>

          <stripe-pricing-table
            pricing-table-id={pricingTableId}
            publishable-key={publishableKey}
            client-reference-id={clientReferenceId}
            customer-email={customerEmail}
          />
        </div>
      </div>
    </div>
  );
};

export default StripePricingTable;