import React, { useState } from 'react';
import { useBillingRecipientForm } from './contexts/BillingRecipientFormContext';
import { useBillingRecipientFormState } from './hooks/useBillingRecipientFormState';
import { useBillingRecipientFormActions } from './hooks/useBillingRecipientFormActions';
import RecipientFormFields from './components/RecipientFormFields/RecipientFormFields';
import { AlertCircle } from 'lucide-react';
import { Field, FieldGroup, FieldLabel } from '@dashboard/shared/components/ui/field';
import { Input } from '@dashboard/shared/components/ui/input';

const BillingRecipientForm: React.FC = () => {
  const { engineerProfile } = useBillingRecipientForm();
  const { quoteId, requirements, currency, isLoading, error } = useBillingRecipientFormState();
  const { formValues, errors, isSubmitting, submitError, setFieldValue, submitForm } =
    useBillingRecipientFormActions();

  // Account holder name field (separate from dynamic fields)
  const [accountHolderName, setAccountHolderName] = useState(engineerProfile.name || '');
  const [accountHolderNameError, setAccountHolderNameError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requirements) {
      return;
    }

    // Validate account holder name
    if (!accountHolderName.trim()) {
      setAccountHolderNameError('Account holder name is required');
      return;
    }

    const success = await submitForm(accountHolderName, currency, requirements);

    if (success) {
      // Show success message or redirect
      alert('Recipient created successfully!');
    }
  };

  if (isLoading) {
    return (
      <div className="unjam-text-center unjam-py-8">
        <div className="unjam-w-12 unjam-h-12 unjam-border-4 unjam-border-blue-600 unjam-border-t-transparent unjam-rounded-full unjam-animate-spin unjam-mx-auto unjam-mb-4" />
        <p className="unjam-text-gray-600">Loading recipient form...</p>
      </div>
    );
  }

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

  if (!requirements) {
    return (
      <div className="unjam-bg-yellow-50 unjam-border unjam-border-yellow-200 unjam-rounded-lg unjam-p-6">
        <p className="unjam-text-yellow-800">No form requirements available.</p>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="unjam-space-y-4">
        {/* Account Holder Name - Manual Field */}
        <FieldGroup>
          <Field>
            <FieldLabel>Account Holder Name *</FieldLabel>
            <Input
              type="text"
              value={accountHolderName}
              onChange={(e) => {
                setAccountHolderName(e.target.value);
                if (accountHolderNameError) {
                  setAccountHolderNameError(null);
                }
              }}
              placeholder="Enter the full name of the account holder"
              className={accountHolderNameError ? 'unjam-border-red-500' : ''}
            />
            {accountHolderNameError && (
              <p className="unjam-text-sm unjam-text-red-600 unjam-mt-1">
                {accountHolderNameError}
              </p>
            )}
          </Field>
        </FieldGroup>

        {/* Dynamic Fields from Wise API */}
        <RecipientFormFields
          requirements={requirements}
          formValues={formValues}
          onChange={setFieldValue}
          errors={errors}
        />

        {/* Submit Error */}
        {submitError && (
          <div className="unjam-p-3 unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded">
            <p className="unjam-text-red-600">{submitError}</p>
          </div>
        )}

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="unjam-inline-flex unjam-items-center unjam-gap-2 unjam-bg-blue-600 unjam-text-white unjam-px-6 unjam-py-2 unjam-rounded-lg hover:unjam-bg-blue-700 unjam-transition-colors disabled:unjam-bg-blue-400 disabled:unjam-cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="unjam-w-4 unjam-h-4 unjam-border-2 unjam-border-white unjam-border-t-transparent unjam-rounded-full unjam-animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Recipient Details</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BillingRecipientForm;
