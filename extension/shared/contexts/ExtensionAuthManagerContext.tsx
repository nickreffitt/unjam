import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { type AuthUser, type ErrorDisplay } from '@common/types';
import { AuthListenerExtension, type AuthListenerCallbacks } from '@common/features/AuthManager/events';
import { ExtensionEventEmitter, ExtensionEventListener, type ExtensionEventListenerCallbacks } from '@common/features/ExtensionManager/events';

interface ExtensionAuthManagerContextType {
  authUser: AuthUser;
  isLoading: boolean;
  error: ErrorDisplay | null;
  otpSent: boolean;
  email: string;
  signInWithOtp: (email: string) => Promise<void>;
  verifyOtp: (token: string) => Promise<void>;
  resetOtpSent: () => void;
  setOtpSent: (value: boolean) => void;
  setEmail: (email: string) => void;
}

const ExtensionAuthManagerContext = createContext<ExtensionAuthManagerContextType | null>(null);

interface ExtensionAuthManagerProviderProps {
  children: React.ReactNode;
}

/**
 * Provides AuthManager functionality to extension popup components
 * Uses extension messaging to communicate with background script
 */
export const ExtensionAuthManagerProvider: React.FC<ExtensionAuthManagerProviderProps> = ({ children }) => {
  console.debug('[ExtensionAuthManagerProvider] Component mounting/rendering');
  const [authUser, setAuthUser] = useState<AuthUser>({ status: 'loading' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorDisplay | null>(null);
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const eventEmitter = useRef(new ExtensionEventEmitter());
  const authListener = useRef<AuthListenerExtension | null>(null);
  const extensionEventListener = useRef<ExtensionEventListener | null>(null);

  // Sign in with OTP
  const signInWithOtp = useCallback(async (email: string): Promise<void> => {
    console.debug('[ExtensionAuthManagerContext] signInWithOtp called with email:', email);
    setEmail(email);
    setIsLoading(true);
    setError(null);
    setOtpSent(false);

    // Send the request - response will come via event listeners
    await eventEmitter.current.emitSignInSubmit(email);
    console.debug('[ExtensionAuthManagerContext] Sign-in request sent, waiting for response event');
  }, []);

  // Verify OTP
  const verifyOtp = useCallback(async (token: string): Promise<void> => {
    console.debug('[ExtensionAuthManagerContext] verifyOtp called with token for email:', email);
    setIsLoading(true);
    setError(null);

    // Send the request - response will come via event listeners
    await eventEmitter.current.emitVerifyOtpSubmit(email, token);
    console.debug('[ExtensionAuthManagerContext] OTP verification request sent, waiting for response event');
    // Don't setIsLoading(false) here - wait for onVerifyOtpSuccess/Failure or auth events
  }, [email]);

  // Reset OTP sent state (for going back to email entry)
  const resetOtpSent = useCallback((): void => {
    console.debug('[ExtensionAuthManagerContext] resetOtpSent called');
    setOtpSent(false);
    setError(null);
  }, []);

  // Set up auth event listeners
  useEffect(() => {
    console.debug('[ExtensionAuthManagerProvider] Setting up auth listener');

    const callbacks: Partial<AuthListenerCallbacks> = {
      onUserRequiresProfile: (authUserEvent: AuthUser) => {
        console.debug('[ExtensionAuthManagerContext] onUserRequiresProfile received:', authUserEvent);
        setAuthUser(authUserEvent);
        setIsLoading(false);
        setError(null);
      },
      onUserProfileCreated: (authUserEvent: AuthUser) => {
        console.debug('[ExtensionAuthManagerContext] onUserProfileCreated received:', authUserEvent);
        setAuthUser(authUserEvent);
        setIsLoading(false);
        setError(null);
      },
      onUserProfileUpdated: (authUserEvent: AuthUser) => {
        console.debug('[AuthManagerContext] onUserProfileUpdated received:', authUserEvent);
        setAuthUser(authUserEvent);
        setIsLoading(false);
        setError(null);
      },
      onUserSignedIn: (authUserEvent: AuthUser) => {
        console.debug('[ExtensionAuthManagerContext] onUserSignedIn received:', authUserEvent);
        setAuthUser(authUserEvent);
        setIsLoading(false);
        setError(null);
      },
      onUserSignedOut: () => {
        console.debug('[ExtensionAuthManagerContext] onUserSignedOut received');
        setAuthUser({ status: 'not-signed-in' });
        setIsLoading(false);
        setError(null);
      },
      onAuthStateChanged: (authUserEvent: AuthUser) => {
        console.debug('[ExtensionAuthManagerContext] onAuthStateChanged received:', authUserEvent);
        setAuthUser(authUserEvent);
        setIsLoading(false);
      },
    };

    authListener.current = new AuthListenerExtension(callbacks);
    authListener.current.startListening();

    // Get initial auth state from background script
    eventEmitter.current.getCurrentUser().then((user) => {
      console.debug('[ExtensionAuthManagerProvider] Initial user from background:', user);
      if (user) {
        setAuthUser({ status: 'signed-in', user: { id: user.id, email: user.email }, profile: user });
        setIsLoading(false);
      } else {
        setAuthUser({ status: 'not-signed-in' });
        setIsLoading(false);
      }
    }).catch((err) => {
      console.error('[ExtensionAuthManagerProvider] Failed to get initial user:', err);
      setAuthUser({ status: 'not-signed-in' });
      setIsLoading(false);
    });

    return () => {
      console.debug('[ExtensionAuthManagerProvider] Cleaning up auth listener');
      authListener.current?.stopListening();
    };
  }, []);

  // Set up extension event listeners for sign-in/verify success/failure
  useEffect(() => {
    console.debug('[ExtensionAuthManagerProvider] Setting up extension event listener');

    const callbacks: Partial<ExtensionEventListenerCallbacks> = {
      onSignInWithOtpSuccess: () => {
        console.debug('[ExtensionAuthManagerContext] Sign-in OTP sent successfully');
        setOtpSent(true);
        setIsLoading(false);
        setError(null);
      },
      onSignInWithOtpFailure: (error: string) => {
        console.error('[ExtensionAuthManagerContext] Sign-in failed:', error);
        setError({ title: 'Sign In Failed', message: error });
        setOtpSent(false);
        setIsLoading(false);
      },
      onVerifyOtpSuccess: () => {
        console.debug('[ExtensionAuthManagerContext] OTP verification successful');
        setIsLoading(false);
        setError(null);
        // Auth state change will come via AuthListenerExtension
      },
      onVerifyOtpFailure: (error: string) => {
        console.error('[ExtensionAuthManagerContext] OTP verification failed:', error);
        setError({ title: 'Verification Failed', message: error });
        setIsLoading(false);
      },
    };

    extensionEventListener.current = new ExtensionEventListener(callbacks);
    extensionEventListener.current.startListening();

    return () => {
      console.debug('[ExtensionAuthManagerProvider] Cleaning up extension event listener');
      extensionEventListener.current?.stopListening();
    };
  }, []);

  const value: ExtensionAuthManagerContextType = {
    authUser,
    isLoading,
    error,
    otpSent,
    email,
    signInWithOtp,
    verifyOtp,
    resetOtpSent,
    setOtpSent,
    setEmail,
  };

  return (
    <ExtensionAuthManagerContext.Provider value={value}>
      {children}
    </ExtensionAuthManagerContext.Provider>
  );
};

export const useExtensionAuthManager = (): ExtensionAuthManagerContextType => {
  const context = useContext(ExtensionAuthManagerContext);
  if (!context) {
    throw new Error('useExtensionAuthManager must be used within an ExtensionAuthManagerProvider');
  }
  return context;
};
