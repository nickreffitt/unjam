import React from 'react';
import { useBillingAccountManager } from './contexts/BillingAccountManagerContext';
import { useBillingAccountState } from './hooks/useBillingAccountState';
import { useBillingAccountActions } from './hooks/useBillingAccountActions';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

const BillingAccount: React.FC = () => {
  const { engineerProfile } = useBillingAccountManager();
  const { engineerAccount: account, isLoading, error } = useBillingAccountState(engineerProfile.id);
  const { createAccountLink, isCreatingLink, linkError } = useBillingAccountActions();

  const handleManageAccount = async () => {
    const url = await createAccountLink();
    if (url) {
      window.location.href = url;
    }
  };

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
        <div className="unjam-max-w-2xl unjam-mx-auto unjam-text-center">
          <div className="unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded-lg unjam-p-4">
            <p className="unjam-text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const getVerificationStatusBadge = () => {
    if (!account) {
      return (
        <div className="unjam-flex unjam-items-center unjam-gap-2 unjam-text-gray-500">
          <AlertTriangle className="unjam-w-5 unjam-h-5" />
          <span>No Account</span>
        </div>
      );
    }

    const statusConfig = {
      active: { icon: CheckCircle, color: 'green', label: 'Active' },
      eventually_due: { icon: Clock, color: 'yellow', label: 'Eventually Due' },
      currently_due: { icon: Clock, color: 'orange', label: 'Currently Due' },
      past_due: { icon: XCircle, color: 'red', label: 'Past Due' },
      pending_verification: { icon: Clock, color: 'blue', label: 'Pending Verification' },
      disabled: { icon: XCircle, color: 'red', label: 'Disabled' }
    };

    const config = statusConfig[account.verificationStatus];
    const Icon = config.icon;

    return (
      <div className={`unjam-flex unjam-items-center unjam-gap-2 unjam-text-${config.color}-600`}>
        <Icon className="unjam-w-5 unjam-h-5" />
        <span className="unjam-font-medium">{config.label}</span>
      </div>
    );
  };

  return (
    <div className="unjam-h-full unjam-overflow-y-auto unjam-p-4">
      <div className="unjam-max-w-2xl unjam-mx-auto">
        <div className="unjam-bg-white unjam-rounded-lg unjam-shadow unjam-p-6">
          <h2 className="unjam-text-2xl unjam-font-bold unjam-mb-4">Billing Account</h2>

          {/* Account Status Section */}
          <div className="unjam-mb-6 unjam-p-4 unjam-bg-gray-50 unjam-rounded-lg">
            <h3 className="unjam-text-lg unjam-font-semibold unjam-mb-3">Account Status</h3>
            <div className="unjam-space-y-2">
              <div className="unjam-flex unjam-justify-between unjam-items-center">
                <span className="unjam-text-gray-600">Verification Status:</span>
                {getVerificationStatusBadge()}
              </div>
              {account && (
                <>
                  <div className="unjam-flex unjam-justify-between unjam-items-center">
                    <span className="unjam-text-gray-600">Details Submitted:</span>
                    <span className={account.detailsSubmitted ? 'unjam-text-green-600' : 'unjam-text-gray-500'}>
                      {account.detailsSubmitted ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="unjam-flex unjam-justify-between unjam-items-center">
                    <span className="unjam-text-gray-600">Charges Enabled:</span>
                    <span className={account.chargesEnabled ? 'unjam-text-green-600' : 'unjam-text-gray-500'}>
                      {account.chargesEnabled ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="unjam-flex unjam-justify-between unjam-items-center">
                    <span className="unjam-text-gray-600">Payouts Enabled:</span>
                    <span className={account.payoutsEnabled ? 'unjam-text-green-600' : 'unjam-text-gray-500'}>
                      {account.payoutsEnabled ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {account.disabledReason && (
                    <div className="unjam-mt-3 unjam-p-3 unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded">
                      <span className="unjam-text-red-600 unjam-font-medium">Disabled Reason:</span>
                      <p className="unjam-text-red-600 unjam-mt-1">{account.disabledReason}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action Section */}
          <div>
            <p className="unjam-text-gray-600 unjam-mb-4">
              {account
                ? 'Manage your billing account settings and payment information.'
                : 'Set up your billing account to receive payments.'}
            </p>
            {linkError && (
              <div className="unjam-mb-4 unjam-p-3 unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded">
                <p className="unjam-text-red-600">{linkError}</p>
              </div>
            )}
            <button
              onClick={handleManageAccount}
              disabled={isCreatingLink}
              className="unjam-inline-flex unjam-items-center unjam-gap-2 unjam-bg-blue-600 unjam-text-white unjam-px-6 unjam-py-2 unjam-rounded-lg hover:unjam-bg-blue-700 unjam-transition-colors disabled:unjam-bg-blue-400 disabled:unjam-cursor-not-allowed"
            >
              {isCreatingLink ? (
                <>
                  <div className="unjam-w-4 unjam-h-4 unjam-border-2 unjam-border-white unjam-border-t-transparent unjam-rounded-full unjam-animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <span>{account ? 'Manage Billing Account' : 'Set Up Billing Account'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingAccount;
