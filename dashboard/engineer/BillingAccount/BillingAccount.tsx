import React, { useState } from 'react';
import { useBillingAccountManager } from './contexts/BillingAccountManagerContext';
import { useBillingAccountState } from './hooks/useBillingAccountState';
import { useBillingAccountActions } from './hooks/useBillingAccountActions';
import { CheckCircle, XCircle, Clock, AlertTriangle, Globe, CreditCard, Building2 } from 'lucide-react';
import { getPayoutProvider, getPayoutProviderMessage, isStripeConnectSupported, isPayoneerSupported } from '@common/utils/payoutProviders';

type PayoutTab = 'stripe' | 'payoneer';

const BillingAccount: React.FC = () => {
  const { engineerProfile } = useBillingAccountManager();
  const { engineerAccount: account, isLoading, error } = useBillingAccountState();
  const { createAccountLink, isCreatingLink, linkError } = useBillingAccountActions();

  const payoutProvider = getPayoutProvider(engineerProfile.country);
  const payoutMessage = getPayoutProviderMessage(engineerProfile.country);

  const stripeAvailable = isStripeConnectSupported(engineerProfile.country);
  const payoneerAvailable = isPayoneerSupported(engineerProfile.country);

  // Default to stripe if available, otherwise payoneer
  const [activeTab, setActiveTab] = useState<PayoutTab>(stripeAvailable ? 'stripe' : 'payoneer');

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

  // If no country is set, show prompt to set country
  if (!engineerProfile.country) {
    return (
      <div className="unjam-h-full unjam-overflow-y-auto unjam-p-4">
        <div className="unjam-max-w-2xl unjam-mx-auto">
          <div className="unjam-bg-white unjam-rounded-lg unjam-shadow unjam-p-6">
            <h2 className="unjam-text-2xl unjam-font-bold unjam-mb-4">Billing Account</h2>
            <div className="unjam-bg-yellow-50 unjam-border unjam-border-yellow-200 unjam-rounded-lg unjam-p-6 unjam-text-center">
              <Globe className="unjam-w-12 unjam-h-12 unjam-text-yellow-600 unjam-mx-auto unjam-mb-4" />
              <h3 className="unjam-text-lg unjam-font-semibold unjam-text-gray-900 unjam-mb-2">
                Country Required
              </h3>
              <p className="unjam-text-gray-600 unjam-mb-4">
                Please set your country in your profile to see available payout options.
              </p>
              <p className="unjam-text-sm unjam-text-gray-500">
                Your country determines which payout providers (Stripe or Payoneer) are available to you.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If country is not supported by any provider
  if (payoutProvider === 'unsupported') {
    return (
      <div className="unjam-h-full unjam-overflow-y-auto unjam-p-4">
        <div className="unjam-max-w-2xl unjam-mx-auto">
          <div className="unjam-bg-white unjam-rounded-lg unjam-shadow unjam-p-6">
            <h2 className="unjam-text-2xl unjam-font-bold unjam-mb-4">Billing Account</h2>
            <div className="unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded-lg unjam-p-6 unjam-text-center">
              <XCircle className="unjam-w-12 unjam-h-12 unjam-text-red-600 unjam-mx-auto unjam-mb-4" />
              <h3 className="unjam-text-lg unjam-font-semibold unjam-text-gray-900 unjam-mb-2">
                Country Not Supported
              </h3>
              <p className="unjam-text-gray-600 unjam-mb-4">
                {payoutMessage}
              </p>
              <p className="unjam-text-sm unjam-text-gray-500">
                We're working to expand our payout options to more countries.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If Payoneer only (no Stripe)
  if (payoutProvider === 'payoneer') {
    return (
      <div className="unjam-h-full unjam-overflow-y-auto unjam-p-4">
        <div className="unjam-max-w-2xl unjam-mx-auto">
          <div className="unjam-bg-white unjam-rounded-lg unjam-shadow unjam-p-6">
            <h2 className="unjam-text-2xl unjam-font-bold unjam-mb-4">Billing Account</h2>

            {/* Payout Provider Info */}
            <div className="unjam-mb-6 unjam-p-4 unjam-bg-blue-50 unjam-border unjam-border-blue-200 unjam-rounded-lg">
              <div className="unjam-flex unjam-items-start unjam-gap-3">
                <Globe className="unjam-w-5 unjam-h-5 unjam-text-blue-600 unjam-mt-0.5" />
                <div>
                  <h3 className="unjam-font-semibold unjam-text-gray-900 unjam-mb-1">
                    Payoneer Payouts Available
                  </h3>
                  <p className="unjam-text-sm unjam-text-gray-600">
                    {payoutMessage}
                  </p>
                </div>
              </div>
            </div>

            <div className="unjam-bg-yellow-50 unjam-border unjam-border-yellow-200 unjam-rounded-lg unjam-p-6">
              <h3 className="unjam-text-lg unjam-font-semibold unjam-text-gray-900 unjam-mb-3">
                Payoneer Setup Instructions
              </h3>
              <div className="unjam-space-y-3 unjam-text-sm unjam-text-gray-700">
                <p>To receive payouts via Payoneer:</p>
                <ol className="unjam-list-decimal unjam-list-inside unjam-space-y-2 unjam-ml-2">
                  <li>Create a Payoneer account at payoneer.com if you don't have one</li>
                  <li>Complete your Payoneer account verification</li>
                  <li>Contact our support team with your Payoneer email address</li>
                  <li>We'll configure your account to receive payouts</li>
                </ol>
                <p className="unjam-mt-4 unjam-text-gray-600">
                  For questions or assistance, please contact support@unjam.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Both Stripe and Payoneer available - show tabs
  if (stripeAvailable && payoneerAvailable) {
    return (
      <div className="unjam-h-full unjam-overflow-y-auto unjam-p-4">
        <div className="unjam-max-w-2xl unjam-mx-auto">
          <div className="unjam-bg-white unjam-rounded-lg unjam-shadow unjam-p-6">
            <h2 className="unjam-text-2xl unjam-font-bold unjam-mb-4">Billing Account</h2>

            {/* Payout Provider Info */}
            <div className="unjam-mb-6 unjam-p-4 unjam-bg-green-50 unjam-border unjam-border-green-200 unjam-rounded-lg">
              <div className="unjam-flex unjam-items-start unjam-gap-3">
                <CheckCircle className="unjam-w-5 unjam-h-5 unjam-text-green-600 unjam-mt-0.5" />
                <div>
                  <h3 className="unjam-font-semibold unjam-text-gray-900 unjam-mb-1">
                    Multiple Payout Options Available
                  </h3>
                  <p className="unjam-text-sm unjam-text-gray-600">
                    Your country supports both Stripe Connect and Payoneer. Choose your preferred payout provider below.
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="unjam-mb-6">
              <div className="unjam-flex unjam-border-b unjam-border-gray-200">
                <button
                  onClick={() => setActiveTab('stripe')}
                  className={`unjam-flex unjam-items-center unjam-gap-2 unjam-px-4 unjam-py-3 unjam-font-medium unjam-transition-colors unjam-border-b-2 ${
                    activeTab === 'stripe'
                      ? 'unjam-border-blue-600 unjam-text-blue-600'
                      : 'unjam-border-transparent unjam-text-gray-500 hover:unjam-text-gray-700 hover:unjam-border-gray-300'
                  }`}
                >
                  <span>Stripe Connect</span>
                </button>
                <button
                  onClick={() => setActiveTab('payoneer')}
                  className={`unjam-flex unjam-items-center unjam-gap-2 unjam-px-4 unjam-py-3 unjam-font-medium unjam-transition-colors unjam-border-b-2 ${
                    activeTab === 'payoneer'
                      ? 'unjam-border-blue-600 unjam-text-blue-600'
                      : 'unjam-border-transparent unjam-text-gray-500 hover:unjam-text-gray-700 hover:unjam-border-gray-300'
                  }`}
                >
                  <span>Payoneer</span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'stripe' ? (
              <>
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
                      ? 'Manage your Stripe Connect account settings and payment information.'
                      : 'Set up your Stripe Connect account to receive payments.'}
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
              </>
            ) : (
              <>
                {/* Payoneer Setup Instructions */}
                <div className="unjam-bg-blue-50 unjam-border unjam-border-blue-200 unjam-rounded-lg unjam-p-6">
                  <h3 className="unjam-text-lg unjam-font-semibold unjam-text-gray-900 unjam-mb-3">
                    Payoneer Setup Instructions
                  </h3>
                  <div className="unjam-space-y-3 unjam-text-sm unjam-text-gray-700">
                    <p>To receive payouts via Payoneer:</p>
                    <ol className="unjam-list-decimal unjam-list-inside unjam-space-y-2 unjam-ml-2">
                      <li>Create a Payoneer account at payoneer.com if you don't have one</li>
                      <li>Complete your Payoneer account verification</li>
                      <li>Contact our support team with your Payoneer email address</li>
                      <li>We'll configure your account to receive payouts</li>
                    </ol>
                    <p className="unjam-mt-4 unjam-text-gray-600">
                      For questions or assistance, please contact support@unjam.com
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Stripe Connect only - show existing flow
  return (
    <div className="unjam-h-full unjam-overflow-y-auto unjam-p-4">
      <div className="unjam-max-w-2xl unjam-mx-auto">
        <div className="unjam-bg-white unjam-rounded-lg unjam-shadow unjam-p-6">
          <h2 className="unjam-text-2xl unjam-font-bold unjam-mb-4">Billing Account</h2>

          {/* Payout Provider Info */}
          <div className="unjam-mb-6 unjam-p-4 unjam-bg-green-50 unjam-border unjam-border-green-200 unjam-rounded-lg">
            <div className="unjam-flex unjam-items-start unjam-gap-3">
              <CheckCircle className="unjam-w-5 unjam-h-5 unjam-text-green-600 unjam-mt-0.5" />
              <div>
                <h3 className="unjam-font-semibold unjam-text-gray-900 unjam-mb-1">
                  Stripe Connect Available
                </h3>
                <p className="unjam-text-sm unjam-text-gray-600">
                  {payoutMessage}
                </p>
              </div>
            </div>
          </div>

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
