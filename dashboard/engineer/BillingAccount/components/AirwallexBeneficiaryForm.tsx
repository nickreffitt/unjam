import React from 'react';
import { useAirwallexBeneficiaryForm } from '../hooks/useAirwallexBeneficiaryForm';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Component that renders the Airwallex embedded beneficiary form
 */
const AirwallexBeneficiaryForm: React.FC = () => {
  const {
    isInitializing,
    isReady,
    error,
    containerRef,
    isSubmitting,
    submitError,
    successData,
    handleSubmit
  } = useAirwallexBeneficiaryForm();

  // Display success message if form was submitted successfully
  if (successData) {
    return (
      <div className="unjam-bg-green-50 unjam-border unjam-border-green-200 unjam-rounded-lg unjam-p-6">
        <div className="unjam-flex unjam-items-start unjam-gap-3">
          <CheckCircle className="unjam-w-6 unjam-h-6 unjam-text-green-600 unjam-flex-shrink-0" />
          <div>
            <h3 className="unjam-text-lg unjam-font-semibold unjam-text-green-800 unjam-mb-2">
              Beneficiary Account Created Successfully
            </h3>
            <p className="unjam-text-green-700">
              Your bank transfer account has been set up and is ready to receive payouts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Display initialization error
  if (error) {
    return (
      <div className="unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded-lg unjam-p-6">
        <div className="unjam-flex unjam-items-start unjam-gap-3">
          <AlertCircle className="unjam-w-6 unjam-h-6 unjam-text-red-600 unjam-flex-shrink-0" />
          <div>
            <h3 className="unjam-text-lg unjam-font-semibold unjam-text-red-800 unjam-mb-2">
              Failed to Load Form
            </h3>
            <p className="unjam-text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {isInitializing && (
        <div className="unjam-text-center unjam-py-8">
          <div className="unjam-w-12 unjam-h-12 unjam-border-4 unjam-border-blue-600 unjam-border-t-transparent unjam-rounded-full unjam-animate-spin unjam-mx-auto unjam-mb-4" />
          <p className="unjam-text-gray-600">Loading beneficiary form...</p>
        </div>
      )}

      <div
        ref={containerRef}
        className={isInitializing ? 'unjam-hidden' : ''}
        style={{ minHeight: '400px' }}
      />

      {/* Display submit error if any */}
      {submitError && (
        <div className="unjam-mt-4 unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded-lg unjam-p-4">
          <div className="unjam-flex unjam-items-start unjam-gap-3">
            <AlertCircle className="unjam-w-5 unjam-h-5 unjam-text-red-600 unjam-flex-shrink-0" />
            <div>
              <h4 className="unjam-text-sm unjam-font-semibold unjam-text-red-800 unjam-mb-1">
                Submission Failed
              </h4>
              <p className="unjam-text-sm unjam-text-red-700">{submitError}</p>
            </div>
          </div>
        </div>
      )}

      {isReady && (
        <div className="unjam-mt-6">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="unjam-w-full unjam-bg-blue-600 unjam-text-white unjam-py-3 unjam-px-4 unjam-rounded-lg unjam-font-semibold hover:unjam-bg-blue-700 disabled:unjam-bg-blue-300 disabled:unjam-cursor-not-allowed unjam-transition-colors"
          >
            {isSubmitting ? (
              <span className="unjam-flex unjam-items-center unjam-justify-center unjam-gap-2">
                <div className="unjam-w-4 unjam-h-4 unjam-border-2 unjam-border-white unjam-border-t-transparent unjam-rounded-full unjam-animate-spin" />
                Submitting...
              </span>
            ) : (
              'Submit Bank Account'
            )}
          </button>
          <p className="unjam-mt-3 unjam-text-sm unjam-text-gray-500 unjam-text-center">
            Complete all required fields and click submit to set up your bank transfer account.
          </p>
        </div>
      )}
    </div>
  );
};

export default AirwallexBeneficiaryForm;
