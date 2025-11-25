import React, { useState } from 'react';
import { useBillingAccountManager } from './contexts/BillingAccountManagerContext';
import { useBillingAccountState } from './hooks/useBillingAccountState';
import { useBillingBankTransferAccountState } from './hooks/useBillingBankTransferAccountState';
import { useBillingAccountActions } from './hooks/useBillingAccountActions';
import { CheckCircle, XCircle, Clock, AlertTriangle, Globe, Trash2 } from 'lucide-react';
import { getPayoutProvider, getPayoutProviderMessage, isStripeConnectSupported, isBankTransferSupported } from '@common/utils/payoutProviders';
import AirwallexBeneficiaryForm from './components/AirwallexBeneficiaryForm';

type PayoutTab = 'stripe' | 'bank_transfer';

const BillingAccount: React.FC = () => {
  const { engineerProfile, billingAccountManager } = useBillingAccountManager();
  const { engineerAccount: account, isLoading, error } = useBillingAccountState();
  const { bankTransferAccount, isLoading: isLoadingBankTransfer, refreshBankTransferAccount } = useBillingBankTransferAccountState();
  const { createAccountLink, isCreatingLink, linkError } = useBillingAccountActions();

  const payoutProvider = getPayoutProvider(engineerProfile.country);
  const payoutMessage = getPayoutProviderMessage(engineerProfile.country);

  const stripeAvailable = isStripeConnectSupported(engineerProfile.country);
  const bankTransferAvailable = isBankTransferSupported(engineerProfile.country);

  // Default to stripe if available, otherwise bank_transfer
  const [activeTab, setActiveTab] = useState<PayoutTab>(stripeAvailable ? 'stripe' : 'bank_transfer');
  const [isDeletingBankTransfer, setIsDeletingBankTransfer] = useState(false);
  const [deleteBankTransferError, setDeleteBankTransferError] = useState<string | null>(null);

  const handleManageAccount = async () => {
    const url = await createAccountLink();
    if (url) {
      window.location.href = url;
    }
  };

  const handleDeleteBankTransferAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your bank transfer account? You will need to set it up again to receive payments.')) {
      return;
    }

    try {
      setIsDeletingBankTransfer(true);
      setDeleteBankTransferError(null);
      console.info('[BillingAccount] Deleting bank transfer account');
      await billingAccountManager.deleteBankTransferAccount();
      console.info('[BillingAccount] Successfully deleted bank transfer account');
      // Refresh the bank transfer account state to reflect deletion
      await refreshBankTransferAccount();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete bank transfer account';
      console.error('[BillingAccount] Error deleting bank transfer account:', errorMessage);
      setDeleteBankTransferError(errorMessage);
    } finally {
      setIsDeletingBankTransfer(false);
    }
  };

  if (isLoading || isLoadingBankTransfer) {
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

  // Render bank transfer account details or form
  const renderBankTransferContent = () => {
    if (bankTransferAccount) {
      return (
        <div>
          <div className="unjam-mb-6 unjam-p-4 unjam-bg-gray-50 unjam-rounded-lg">
            <h3 className="unjam-text-lg unjam-font-semibold unjam-mb-3">Bank Transfer Account Details</h3>
            <div className="unjam-space-y-2">
              <div className="unjam-flex unjam-justify-between unjam-items-center">
                <span className="unjam-text-gray-600">Account Holder:</span>
                <span className="unjam-font-medium">{bankTransferAccount.name}</span>
              </div>
              <div className="unjam-flex unjam-justify-between unjam-items-center">
                <span className="unjam-text-gray-600">Country:</span>
                <span className="unjam-font-medium">{bankTransferAccount.country}</span>
              </div>
              {bankTransferAccount.summary && (
                <div className="unjam-flex unjam-justify-between unjam-items-center">
                  <span className="unjam-text-gray-600">Account Summary:</span>
                  <span className="unjam-font-medium">{bankTransferAccount.summary}</span>
                </div>
              )}
              <div className="unjam-flex unjam-justify-between unjam-items-center">
                <span className="unjam-text-gray-600">Status:</span>
                <span className={bankTransferAccount.active ? 'unjam-text-green-600' : 'unjam-text-gray-500'}>
                  {bankTransferAccount.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {deleteBankTransferError && (
            <div className="unjam-mb-4 unjam-p-3 unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded">
              <p className="unjam-text-red-600">{deleteBankTransferError}</p>
            </div>
          )}

          <button
            onClick={handleDeleteBankTransferAccount}
            disabled={isDeletingBankTransfer}
            className="unjam-inline-flex unjam-items-center unjam-gap-2 unjam-bg-red-600 unjam-text-white unjam-px-6 unjam-py-2 unjam-rounded-lg hover:unjam-bg-red-700 unjam-transition-colors disabled:unjam-bg-red-400 disabled:unjam-cursor-not-allowed"
          >
            {isDeletingBankTransfer ? (
              <>
                <div className="unjam-w-4 unjam-h-4 unjam-border-2 unjam-border-white unjam-border-t-transparent unjam-rounded-full unjam-animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="unjam-w-4 unjam-h-4" />
                <span>Delete Bank Transfer Account</span>
              </>
            )}
          </button>
        </div>
      );
    }

    // Render Airwallex embedded beneficiary form
    return <AirwallexBeneficiaryForm />;
  };

  // If bank transfer only (no Stripe) - show bank transfer account details or form
  if (payoutProvider === 'bank_transfer') {
    return (
      <div className="unjam-h-full unjam-overflow-y-auto unjam-p-4">
        <div className="unjam-max-w-2xl unjam-mx-auto">
          <div className="unjam-bg-white unjam-rounded-lg unjam-shadow unjam-p-6">
            <h2 className="unjam-text-2xl unjam-font-bold unjam-mb-4">Billing Account</h2>

            <div className="unjam-mb-6 unjam-p-4 unjam-bg-green-50 unjam-border unjam-border-green-200 unjam-rounded-lg">
              <div className="unjam-flex unjam-items-start unjam-gap-3">
                <CheckCircle className="unjam-w-5 unjam-h-5 unjam-text-green-600 unjam-mt-0.5" />
                <div>
                  <h3 className="unjam-font-semibold unjam-text-gray-900 unjam-mb-1">
                    Bank Transfer Available
                  </h3>
                  <p className="unjam-text-sm unjam-text-gray-600">
                    {payoutMessage}
                  </p>
                </div>
              </div>
            </div>

            {renderBankTransferContent()}
          </div>
        </div>
      </div>
    );
  }

  // Both Stripe and bank transfer available - show tabs
  if (stripeAvailable && bankTransferAvailable) {
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
                    Your country supports both Stripe Connect and bank transfer. Choose your preferred payout provider below.
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
                  onClick={() => setActiveTab('bank_transfer')}
                  className={`unjam-flex unjam-items-center unjam-gap-2 unjam-px-4 unjam-py-3 unjam-font-medium unjam-transition-colors unjam-border-b-2 ${
                    activeTab === 'bank_transfer'
                      ? 'unjam-border-blue-600 unjam-text-blue-600'
                      : 'unjam-border-transparent unjam-text-gray-500 hover:unjam-text-gray-700 hover:unjam-border-gray-300'
                  }`}
                >
                  <span>Bank Transfer</span>
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
              renderBankTransferContent()
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
