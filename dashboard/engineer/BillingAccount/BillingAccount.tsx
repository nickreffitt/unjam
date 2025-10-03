import React from 'react';
import { useBillingAccountState } from './hooks/useBillingAccountState';

const BillingAccount: React.FC = () => {
  const { accountLinkUrl, isLoading, error } = useBillingAccountState();

  if (isLoading) {
    return (
      <div className="unjam-h-full unjam-flex unjam-items-center unjam-justify-center unjam-p-4">
        <div className="unjam-text-gray-600">Loading billing account...</div>
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

  if (!accountLinkUrl) {
    return (
      <div className="unjam-h-full unjam-overflow-y-auto unjam-p-4">
        <div className="unjam-max-w-6xl unjam-mx-auto unjam-text-center">
          <div className="unjam-bg-yellow-50 unjam-border unjam-border-yellow-200 unjam-rounded-lg unjam-p-4">
            <p className="unjam-text-yellow-600">No billing account link available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unjam-h-full unjam-overflow-y-auto unjam-p-4">
      <div className="unjam-max-w-6xl unjam-mx-auto">
        <div className="unjam-bg-white unjam-rounded-lg unjam-shadow unjam-p-6">
          <h2 className="unjam-text-2xl unjam-font-bold unjam-mb-4">Billing Account</h2>
          <p className="unjam-text-gray-600 unjam-mb-6">
            Manage your billing account settings and payment information.
          </p>
          <a
            href={accountLinkUrl}
            className="unjam-inline-block unjam-bg-blue-600 unjam-text-white unjam-px-6 unjam-py-2 unjam-rounded-lg hover:unjam-bg-blue-700 unjam-transition-colors"
          >
            Manage Billing Account
          </a>
        </div>
      </div>
    </div>
  );
};

export default BillingAccount;
