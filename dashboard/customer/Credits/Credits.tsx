import React from 'react';
import CreditsPricingGrid from './components/CreditsPricingGrid/CreditsPricingGrid';
import { useCreditsState } from './hooks/useCreditsState';
import { useCreditsActions } from './hooks/useCreditsActions';

const Credits: React.FC = () => {
  const { products, creditBalance, pendingCredits, isLoading, error } = useCreditsState();
  const { purchaseProduct, isProcessing } = useCreditsActions();

  if (isLoading) {
    return (
      <div className="unjam-h-full unjam-flex unjam-items-center unjam-justify-center unjam-p-4">
        <div className="unjam-text-gray-600">Loading credit packages...</div>
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

  return (
    <div className="unjam-h-full unjam-overflow-y-auto unjam-p-8">
      <div className="unjam-max-w-7xl unjam-mx-auto">
        {/* Credit Balance Display */}
        {creditBalance !== null && (
          <div className="unjam-mb-8 unjam-text-center">
            <div className="unjam-inline-flex unjam-items-center unjam-gap-2 unjam-bg-blue-50 unjam-border unjam-border-blue-200 unjam-rounded-lg unjam-px-6 unjam-py-3">
              <span className="unjam-text-sm unjam-text-gray-700">Current Balance:</span>
              <span className="unjam-text-xl unjam-font-bold unjam-text-blue-600">
                {creditBalance}
              </span>
              {pendingCredits !== null && pendingCredits > 0 && (
                <span className="unjam-text-sm unjam-text-orange-600 unjam-font-semibold">
                  {pendingCredits}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Pricing Grid */}
        <CreditsPricingGrid
          products={products}
          onPurchase={purchaseProduct}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
};

export default Credits;
