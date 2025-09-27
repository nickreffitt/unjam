import React, { useState } from 'react';
import { Mail, ArrowRight, Loader, Chrome } from 'lucide-react';

interface SignInFormProps {
  onMagicLinkSubmit: (email: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

const SignInForm: React.FC<SignInFormProps> = ({
  onMagicLinkSubmit,
  onGoogleSignIn,
  isLoading,
  disabled = false,
}) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
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
      await onMagicLinkSubmit(email);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await onGoogleSignIn();
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const isFormDisabled = disabled || isLoading;

  return (
    <div className="unjam-w-full unjam-max-w-md unjam-space-y-6">
      <form onSubmit={handleMagicLinkSubmit} className="unjam-space-y-4">
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
              disabled={isFormDisabled}
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

        {/* Magic Link Button */}
        <button
          type="submit"
          disabled={isFormDisabled}
          className="unjam-group unjam-relative unjam-w-full unjam-flex unjam-justify-center unjam-py-2.5 unjam-px-4 unjam-border unjam-border-transparent unjam-text-sm unjam-font-medium unjam-rounded-md unjam-text-white unjam-bg-blue-600 hover:unjam-bg-blue-700 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500 disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed unjam-transition-colors"
        >
          <span className="unjam-absolute unjam-left-0 unjam-inset-y-0 unjam-flex unjam-items-center unjam-pl-3">
            {isLoading ? (
              <Loader className="unjam-h-5 unjam-w-5 unjam-text-blue-500 group-hover:unjam-text-blue-400 unjam-animate-spin" />
            ) : (
              <ArrowRight className="unjam-h-5 unjam-w-5 unjam-text-blue-500 group-hover:unjam-text-blue-400" />
            )}
          </span>
          {isLoading ? 'Sending magic link...' : 'Send magic link'}
        </button>
      </form>

      {/* Divider */}
      <div className="unjam-relative">
        <div className="unjam-absolute unjam-inset-0 unjam-flex unjam-items-center">
          <div className="unjam-w-full unjam-border-t unjam-border-gray-300" />
        </div>
        <div className="unjam-relative unjam-flex unjam-justify-center unjam-text-sm">
          <span className="unjam-px-2 unjam-bg-gray-50 unjam-text-gray-500">or</span>
        </div>
      </div>

      {/* Google Sign In Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isFormDisabled}
        className="unjam-w-full unjam-flex unjam-justify-center unjam-py-2.5 unjam-px-4 unjam-border unjam-border-gray-300 unjam-rounded-md unjam-shadow-sm unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-bg-white hover:unjam-bg-gray-50 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500 disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed unjam-transition-colors"
      >
        <Chrome className="unjam-h-5 unjam-w-5 unjam-text-gray-500 unjam-mr-2" />
        Continue with Google
      </button>
    </div>
  );
};

export default SignInForm;