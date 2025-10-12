import React, { useState } from 'react';
import { Mail, ArrowRight, Loader } from 'lucide-react';

interface SignInFormProps {
  onSubmit: (email: string) => Promise<void>;
  onShowOtpForm: (email: string) => void;
  disabled?: boolean;
}

const SignInForm: React.FC<SignInFormProps> = ({
  onSubmit,
  onShowOtpForm,
  disabled = false,
}) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setEmailError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailError('');

    try {
      await onSubmit(email);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const handleShowOtpForm = () => {
    if (!email.trim()) {
      setEmailError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailError('');
    onShowOtpForm(email);
  };

  return (
    <div className="unjam-w-full unjam-max-w-md unjam-space-y-6">
      <form onSubmit={handleSubmit} className="unjam-space-y-4">
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="unjam-block unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-mb-1">
            Email address
          </label>
          <div className="unjam-relative">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              disabled={disabled}
              className={`unjam-appearance-none unjam-block unjam-w-full unjam-px-3 unjam-py-2 unjam-pl-10 unjam-border ${
                emailError
                  ? 'unjam-border-red-300 focus:unjam-ring-red-500 focus:unjam-border-red-500'
                  : 'unjam-border-gray-300 focus:unjam-ring-blue-500 focus:unjam-border-blue-500'
              } unjam-placeholder-gray-500 unjam-text-gray-900 unjam-rounded-md focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-z-10 sm:unjam-text-sm disabled:unjam-bg-gray-50 disabled:unjam-cursor-not-allowed unjam-transition-colors`}
              placeholder="Enter your email address"
            />
            <Mail className="unjam-absolute unjam-left-3 unjam-top-2.5 unjam-h-4 unjam-w-4 unjam-text-gray-400" />
          </div>
          {emailError && (
            <p className="unjam-mt-1 unjam-text-sm unjam-text-red-600">{emailError}</p>
          )}
        </div>

        {/* OTP Button */}
        <button
          type="submit"
          disabled={disabled}
          className="unjam-group unjam-relative unjam-w-full unjam-flex unjam-justify-center unjam-py-2.5 unjam-px-4 unjam-border unjam-border-transparent unjam-text-sm unjam-font-medium unjam-rounded-md unjam-text-white unjam-bg-blue-600 hover:unjam-bg-blue-700 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500 disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed unjam-transition-colors"
        >
          <span className="unjam-absolute unjam-left-0 unjam-inset-y-0 unjam-flex unjam-items-center unjam-pl-3">
            {disabled ? (
              <Loader className="unjam-h-5 unjam-w-5 unjam-text-blue-500 group-hover:unjam-text-blue-400 unjam-animate-spin" />
            ) : (
              <ArrowRight className="unjam-h-5 unjam-w-5 unjam-text-blue-500 group-hover:unjam-text-blue-400" />
            )}
          </span>
          {disabled ? 'Sending code...' : 'Send code to my email'}
        </button>
      </form>

      {/* Already have code button */}
      <button
        type="button"
        onClick={handleShowOtpForm}
        disabled={disabled}
        className="unjam-w-full unjam-flex unjam-justify-center unjam-items-center unjam-py-2.5 unjam-px-4 unjam-border unjam-border-gray-300 unjam-rounded-md unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-bg-white hover:unjam-bg-gray-50 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500 disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed unjam-transition-colors"
      >
        I have a code
      </button>
    </div>
  );
};

export default SignInForm;