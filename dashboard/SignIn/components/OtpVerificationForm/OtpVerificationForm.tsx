import React, { useState, useRef, type KeyboardEvent, type ClipboardEvent } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';

interface OtpVerificationFormProps {
  email: string;
  onSubmit: (token: string) => void | Promise<void>;
  onReset: () => void;
  disabled?: boolean;
}

const OtpVerificationForm: React.FC<OtpVerificationFormProps> = ({ email, onSubmit, onReset, disabled = false }) => {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [tokenError, setTokenError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const validateToken = (token: string): boolean => {
    return /^\d{6}$/.test(token);
  };

  const handleChange = (index: number, value: string) => {
    if (disabled) return;

    // Only allow digits
    const newValue = value.replace(/\D/g, '');

    if (newValue.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = newValue;
      setOtp(newOtp);
      if (tokenError) setTokenError('');

      // Auto-focus next input
      if (newValue && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];

    pastedData.split('').forEach((char, i) => {
      if (i < 6) {
        newOtp[i] = char;
      }
    });

    setOtp(newOtp);
    if (tokenError) setTokenError('');

    // Focus the next empty input or the last one
    const nextEmptyIndex = newOtp.findIndex(val => !val);
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.debug('OtpVerificationForm: Form submitted');

    const token = otp.join('');

    if (!token) {
      setTokenError('Please enter the verification code');
      return;
    }

    if (!validateToken(token)) {
      setTokenError('Code must be 6 digits');
      return;
    }

    setTokenError('');
    console.debug('OtpVerificationForm: Calling onSubmit with token');

    try {
      await onSubmit(token);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  return (
    <div className="unjam-w-full unjam-text-center unjam-space-y-6">
      {/* Success Icon */}
      <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-blue-100">
        <Mail className="unjam-h-8 unjam-w-8 unjam-text-blue-600" />
      </div>

      {/* Success Message */}
      <div>
        <h3 className="unjam-text-lg unjam-font-semibold unjam-text-gray-900 unjam-mb-2">
          Check your email
        </h3>
        <p className="unjam-text-sm unjam-text-gray-600 unjam-mb-2">
          We've sent a verification code to
        </p>
        <p className="unjam-font-medium unjam-text-gray-900 unjam-mb-4">
          {email}
        </p>
        <p className="unjam-text-sm unjam-text-gray-600">
          Enter the 6-digit code below to sign in.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="unjam-space-y-6">
        {/* OTP Input Grid */}
        <div>
          <label className="unjam-block unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-mb-3 unjam-text-center">
            Verification Code
          </label>
          <div className="unjam-flex unjam-gap-2 unjam-justify-center">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={disabled}
                className={`unjam-w-12 unjam-h-12 unjam-text-center unjam-text-xl unjam-font-semibold unjam-border-2 unjam-rounded-lg unjam-transition-all ${
                  tokenError
                    ? 'unjam-border-red-300 focus:unjam-border-red-500 focus:unjam-ring-2 focus:unjam-ring-red-200'
                    : 'unjam-border-gray-300 focus:unjam-border-blue-500 focus:unjam-ring-2 focus:unjam-ring-blue-200'
                } unjam-outline-none disabled:unjam-bg-gray-50 disabled:unjam-cursor-not-allowed ${
                  digit ? 'unjam-border-blue-500' : ''
                }`}
              />
            ))}
          </div>
          {tokenError && (
            <p className="unjam-mt-2 unjam-text-sm unjam-text-red-600">{tokenError}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={disabled}
          className="unjam-w-full unjam-flex unjam-justify-center unjam-py-2.5 unjam-px-4 unjam-border unjam-border-transparent unjam-text-sm unjam-font-medium unjam-rounded-md unjam-text-white unjam-bg-blue-600 hover:unjam-bg-blue-700 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500 disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed unjam-transition-colors"
        >
          {disabled ? 'Verifying...' : 'Verify Code'}
        </button>
      </form>

      {/* Actions */}
      <div className="unjam-space-y-3">
        <button
          onClick={onReset}
          disabled={disabled}
          className="unjam-w-full unjam-flex unjam-justify-center unjam-items-center unjam-py-2.5 unjam-px-4 unjam-border unjam-border-gray-300 unjam-rounded-md unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-bg-white hover:unjam-bg-gray-50 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500 disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed unjam-transition-colors"
        >
          <ArrowLeft className="unjam-h-4 unjam-w-4 unjam-mr-2" />
          Try a different email
        </button>

        <p className="unjam-text-xs unjam-text-gray-500">
          Didn't receive a code?
        </p>
        <p className='unjam-text-xs unjam-text-gray-500'>
          Check your spam folder or try again.
          </p>
      </div>
    </div>
  );
};

export default OtpVerificationForm;
