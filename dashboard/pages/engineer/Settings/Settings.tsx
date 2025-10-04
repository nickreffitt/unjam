import React from 'react';
import BillingAccount from '@dashboard/engineer/BillingAccount';
import { BillingAccountManagerProvider } from '@dashboard/engineer/BillingAccount/contexts/BillingAccountManagerContext';

const Settings: React.FC = () => {
  return (
    <div className="unjam-h-full unjam-flex unjam-flex-col">
      <div className="unjam-bg-white unjam-shadow-sm unjam-border-b unjam-border-gray-200 unjam-p-6">
        <h1 className="unjam-text-2xl unjam-font-bold unjam-text-gray-900">Settings</h1>
      </div>
      <div className="unjam-flex-1 unjam-overflow-hidden">
        <BillingAccountManagerProvider>
          <BillingAccount />
        </BillingAccountManagerProvider>
      </div>
    </div>
  );
};

export default Settings;
