import React from 'react';
import Credits, { BillingManagerProvider } from '@dashboard/customer/Credits';

const BuyCredits: React.FC = () => {
  return (
    <BillingManagerProvider>
      <div className="unjam-h-full unjam-overflow-y-auto">
        <div className="unjam-pt-20">
          <div className="unjam-max-w-7xl unjam-mx-auto unjam-px-4">
            {/* Header */}
            <div className="unjam-text-center">
              <h2 className="unjam-text-slate-900 unjam-text-3xl unjam-font-bold unjam-mb-4">
                Purchase Credits
              </h2>
              <p className="unjam-text-[15px] unjam-text-slate-600">
                Buy credits for one-time support sessions with expert engineers. No subscription required.
              </p>
            </div>

            <Credits />

            {/* Footer */}
            <div className="unjam-text-center unjam-mt-12 unjam-pb-8">
              <p className="unjam-text-[15px] unjam-text-slate-600 unjam-mb-4">
                All purchases include secure payment processing and instant credit activation
              </p>
              <div className="unjam-flex unjam-justify-center unjam-items-center unjam-space-x-6 unjam-text-[13px] unjam-text-slate-500">
                <span>• Secure checkout</span>
                <span>• Instant activation</span>
                <span>• No hidden fees</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BillingManagerProvider>
  );
};

export default BuyCredits;