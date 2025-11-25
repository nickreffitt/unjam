import { useState } from 'react';
import { useBillingRecipientForm } from '../contexts/BillingRecipientFormContext';
import type { WiseAccountRequirements } from '@common/types';

/**
 * Hook to handle recipient form actions
 * Provides functions to manage form data and submission
 */
export const useBillingRecipientFormActions = () => {
  const { billingAccountManager, engineerProfile } = useBillingRecipientForm();

  // Initialize formValues with country from profile
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const initialValues: Record<string, string> = {};
    if (engineerProfile.country) {
      initialValues['address.country'] = engineerProfile.country;
    }
    return initialValues;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Updates a form field value
   */
  const setFieldValue = (fieldKey: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [fieldKey]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[fieldKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  /**
   * Validates the form based on field requirements
   */
  const validateForm = (requirements: WiseAccountRequirements): boolean => {
    const newErrors: Record<string, string> = {};

    console.info('[useBillingRecipientFormActions] Current form values:', formValues);
    console.info('[useBillingRecipientFormActions] Validating against requirements:', requirements);

    // Iterate through all fields and validate
    requirements.fields?.forEach((field: any) => {
      field.group?.forEach((groupItem: any) => {
        const value = formValues[groupItem.key] || '';

        console.debug(`[useBillingRecipientFormActions] Validating field: ${groupItem.key}, value: "${value}", required: ${groupItem.required}`);

        // Check required fields
        if (groupItem.required && !value.trim()) {
          const errorMsg = `${groupItem.key} is required`;
          newErrors[groupItem.key] = errorMsg;
          console.warn(`[useBillingRecipientFormActions] Validation error for ${groupItem.key}: ${errorMsg}`);
          return;
        }

        // Check min/max length
        if (groupItem.minLength && value.length < groupItem.minLength) {
          const errorMsg = `Minimum length is ${groupItem.minLength} characters`;
          newErrors[groupItem.key] = errorMsg;
          console.warn(`[useBillingRecipientFormActions] Validation error for ${groupItem.key}: ${errorMsg}`);
          return;
        }

        if (groupItem.maxLength && value.length > groupItem.maxLength) {
          const errorMsg = `Maximum length is ${groupItem.maxLength} characters`;
          newErrors[groupItem.key] = errorMsg;
          console.warn(`[useBillingRecipientFormActions] Validation error for ${groupItem.key}: ${errorMsg}`);
          return;
        }

        // Check regex validation
        if (groupItem.validationRegexp && value) {
          const regex = new RegExp(groupItem.validationRegexp);
          if (!regex.test(value)) {
            const errorMsg = `Invalid format for ${groupItem.key}`;
            newErrors[groupItem.key] = errorMsg;
            console.warn(`[useBillingRecipientFormActions] Validation error for ${groupItem.key}: ${errorMsg}, pattern: ${groupItem.validationRegexp}`);
            return;
          }
        }

        // Check allowed values
        if (groupItem.valuesAllowed && groupItem.valuesAllowed.length > 0) {
          const allowedKeys = groupItem.valuesAllowed.map((v: any) => v.key);
          if (value && !allowedKeys.includes(value)) {
            const errorMsg = `Invalid value for ${groupItem.key}`;
            newErrors[groupItem.key] = errorMsg;
            console.warn(`[useBillingRecipientFormActions] Validation error for ${groupItem.key}: ${errorMsg}, allowed: ${allowedKeys.join(', ')}`);
            return;
          }
        }
      });
    });

    if (Object.keys(newErrors).length > 0) {
      console.error('[useBillingRecipientFormActions] Validation failed with errors:', newErrors);
    } else {
      console.info('[useBillingRecipientFormActions] Validation passed');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Converts flat dot-notation object to nested object
   * Example: { "address.city": "NYC" } => { address: { city: "NYC" } }
   */
  const convertToNestedObject = (flatObj: Record<string, string>): Record<string, any> => {
    const nested: Record<string, any> = {};

    for (const [key, value] of Object.entries(flatObj)) {
      const parts = key.split('.');
      let current = nested;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      current[parts[parts.length - 1]] = value;
    }

    return nested;
  };

  /**
   * Submits the form data to create a Wise recipient
   */
  const submitForm = async (accountHolderName: string, currency: string, requirements: WiseAccountRequirements): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      console.info('[useBillingRecipientFormActions] Validating form...');

      if (!validateForm(requirements)) {
        console.error('[useBillingRecipientFormActions] Form validation failed');
        setSubmitError('Please fix the validation errors before submitting');
        return false;
      }

      console.info('[useBillingRecipientFormActions] Submitting form to create recipient');
      console.info('[useBillingRecipientFormActions] Account holder name:', accountHolderName);
      console.info('[useBillingRecipientFormActions] Currency:', currency);
      console.info('[useBillingRecipientFormActions] Type:', requirements.type);
      console.info('[useBillingRecipientFormActions] Form values:', formValues);

      // Convert flat dot-notation to nested object for Wise API
      const nestedDetails = convertToNestedObject(formValues);
      console.info('[useBillingRecipientFormActions] Nested details:', nestedDetails);

      // Create recipient in Wise (country already in formValues from initialization)
      const recipient = await billingAccountManager.createRecipient(
        accountHolderName,
        currency,
        requirements.type,
        nestedDetails
      );

      console.info('[useBillingRecipientFormActions] Recipient created successfully:', recipient.id);
      console.info('[useBillingRecipientFormActions] Account summary:', recipient.accountSummary);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit form';
      console.error('[useBillingRecipientFormActions] Error submitting form:', errorMessage);
      setSubmitError(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formValues,
    errors,
    isSubmitting,
    submitError,
    setFieldValue,
    submitForm
  };
};
