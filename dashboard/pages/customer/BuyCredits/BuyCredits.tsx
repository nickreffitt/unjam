import React from 'react';
import PricingTable from '@dashboard/customer/PricingTable';
import { usePricingTableManager } from '@dashboard/customer/PricingTable/contexts/PricingTableManagerContext';

const BuyCredits: React.FC = () => {
  const { userProfile, stripeTableId, stripePublishableKey} = usePricingTableManager();
  
  console.debug('[BuyCredits] userProfile:', userProfile)
  return (
    <div className="unjam-h-full unjam-overflow-y-auto">
      <div className="unjam-pt-20">
        <div className="unjam-max-w-6xl max-lg:unjam-max-w-3xl unjam-mx-auto">
          {/* Header */}
          <div className="unjam-text-center unjam-mb-10">
            <h2 className="unjam-text-slate-900 unjam-text-3xl unjam-font-bold unjam-mb-4">
              Choose the right plan for you
            </h2>
            <p className="unjam-text-[15px] unjam-text-slate-600">
              Flexible plans designed for your support needs with access to expert engineers.
            </p>
          </div>

          <PricingTable
            stripePricingTableId={stripeTableId}
            stripePublishableKey={stripePublishableKey}
            clientReferenceId={userProfile.authId}
            customerEmail={userProfile.email}
          />

          {/* Footer */}
          <div className="unjam-text-center unjam-mt-12">
            <p className="unjam-text-[15px] unjam-text-slate-600 unjam-mb-4">
              All plans include secure payment processing and instant activation
            </p>
            <div className="unjam-flex unjam-justify-center unjam-items-center unjam-space-x-6 unjam-text-[13px] unjam-text-slate-500">
              <span>• 30-day money back guarantee</span>
              <span>• Cancel anytime</span>
              <span>• No setup fees</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyCredits;