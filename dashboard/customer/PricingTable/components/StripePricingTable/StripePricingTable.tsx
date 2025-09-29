import React, { useEffect } from 'react';

interface StripePricingTableProps {
  pricingTableId: string;
  publishableKey: string;
  clientReferenceId?: string;
  customerEmail?: string;
  customerSessionClientSecret?: string;
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
          'customer-session-client-secret'?: string;
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
  customerSessionClientSecret
}) => {
  useEffect(() => {
    // Ensure the Stripe pricing table script is loaded
    if (!document.querySelector('script[src="https://js.stripe.com/v3/pricing-table.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/pricing-table.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className="unjam-h-full unjam-overflow-y-auto">
      <div className="unjam-p-4">
        <div className="unjam-max-w-6xl max-lg:unjam-max-w-3xl unjam-mx-auto">
          <stripe-pricing-table
            pricing-table-id={pricingTableId}
            publishable-key={publishableKey}
            client-reference-id={clientReferenceId}
            customer-email={customerEmail}
            customer-session-client-secret={customerSessionClientSecret}
          />
        </div>
      </div>
    </div>
  );
};

export default StripePricingTable;