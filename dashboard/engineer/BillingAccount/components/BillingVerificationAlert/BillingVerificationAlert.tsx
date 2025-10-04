import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Loader2, Settings } from 'lucide-react';
import { useBillingAccountState } from '@dashboard/engineer/BillingAccount/hooks/useBillingAccountState';
import type { EngineerAccountVerificationStatus } from '@common/types';

type AlertType = 'info' | 'warning' | 'error';

interface AlertConfig {
  type: AlertType;
  icon: React.ElementType;
  title: string;
  message: string;
  showLink: boolean;
}

const getAlertConfig = (status: EngineerAccountVerificationStatus): AlertConfig | null => {
  switch (status) {
    case 'active':
      return null;

    case 'pending_verification':
      return {
        type: 'info',
        icon: Loader2,
        title: 'Verification in Progress',
        message: 'Your billing account is being verified. This may take a few moments.',
        showLink: false
      };

    case 'eventually_due':
      return {
        type: 'warning',
        icon: AlertTriangle,
        title: 'Action Required Soon',
        message: 'Your billing account has upcoming verification requirements. Please complete them at your earliest convenience.',
        showLink: true
      };

    case 'currently_due':
      return {
        type: 'warning',
        icon: AlertTriangle,
        title: 'Action Required',
        message: 'Your billing account has verification requirements that are due soon. Please complete them to avoid service interruption.',
        showLink: true
      };

    case 'past_due':
      return {
        type: 'error',
        icon: AlertCircle,
        title: 'Urgent: Verification Overdue',
        message: 'Your billing account verification requirements are past due. Your account capabilities may be limited.',
        showLink: true
      };

    case 'disabled':
      return {
        type: 'error',
        icon: AlertCircle,
        title: 'Account Disabled',
        message: 'Your billing account is currently disabled and cannot process payments. Please update your account information.',
        showLink: true
      };

    default:
      return null;
  }
};

const getAlertStyles = (type: AlertType) => {
  switch (type) {
    case 'info':
      return {
        container: 'unjam-bg-blue-50 unjam-border-blue-200',
        iconBg: 'unjam-bg-blue-100',
        iconColor: 'unjam-text-blue-600',
        titleColor: 'unjam-text-blue-800',
        messageColor: 'unjam-text-blue-700',
        linkColor: 'unjam-text-blue-600 hover:unjam-text-blue-800'
      };
    case 'warning':
      return {
        container: 'unjam-bg-yellow-50 unjam-border-yellow-200',
        iconBg: 'unjam-bg-yellow-100',
        iconColor: 'unjam-text-yellow-600',
        titleColor: 'unjam-text-yellow-800',
        messageColor: 'unjam-text-yellow-700',
        linkColor: 'unjam-text-yellow-600 hover:unjam-text-yellow-800'
      };
    case 'error':
      return {
        container: 'unjam-bg-red-50 unjam-border-red-200',
        iconBg: 'unjam-bg-red-100',
        iconColor: 'unjam-text-red-600',
        titleColor: 'unjam-text-red-800',
        messageColor: 'unjam-text-red-700',
        linkColor: 'unjam-text-red-600 hover:unjam-text-red-800'
      };
  }
};

const BillingVerificationAlert: React.FC = () => {
  const { engineerAccount } = useBillingAccountState();

  // Show error if no engineer account exists
  const alertConfig = !engineerAccount
    ? null
    : getAlertConfig(engineerAccount.verificationStatus);

  if (!alertConfig) {
    return null;
  }

  const styles = getAlertStyles(alertConfig.type);
  const Icon = alertConfig.icon;
  const isLoading = engineerAccount?.verificationStatus === 'pending_verification';

  return (
    <div className={`unjam-mb-6 unjam-border unjam-rounded-lg unjam-p-4 ${styles.container}`}>
      <div className="unjam-flex unjam-items-start unjam-gap-3">
        <div className={`unjam-flex-shrink-0 unjam-w-8 unjam-h-8 unjam-rounded-full unjam-flex unjam-items-center unjam-justify-center ${styles.iconBg}`}>
          <Icon
            size={18}
            className={`${styles.iconColor} ${isLoading ? 'unjam-animate-spin' : ''}`}
          />
        </div>
        <div className="unjam-flex-1">
          <h3 className={`unjam-text-sm unjam-font-semibold ${styles.titleColor}`}>
            {alertConfig.title}
          </h3>
          <p className={`unjam-mt-1 unjam-text-sm ${styles.messageColor}`}>
            {alertConfig.message}
          </p>
          {alertConfig.showLink && (
            <Link
              to="/settings"
              className={`unjam-mt-2 unjam-inline-flex unjam-items-center unjam-gap-1.5 unjam-text-sm unjam-font-medium ${styles.linkColor} unjam-transition-colors`}
            >
              <Settings size={16} />
              Go to Settings
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingVerificationAlert;
