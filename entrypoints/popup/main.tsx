import React from 'react';
import ReactDOM from 'react-dom/client';
import { ExtensionAuthManagerProvider, useExtensionAuthManager } from '@extension/shared/contexts/ExtensionAuthManagerContext';
import SignIn from '@extension/SignIn/SignIn';
import SignInSuccess from '@extension/SignIn/components/SignInSuccess/SignInSuccess';
import RequiresProfile from '@extension/SignIn/components/RequiresProfile/RequiresProfile';
import '@extension/styles.css';

const PopupContent = () => {
  const { authUser, isLoading } = useExtensionAuthManager();

  // Show loading state
  if (isLoading || authUser.status === 'loading') {
    return (
      <div className="unjam-min-h-screen unjam-w-[350px] unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center">
        <div className="unjam-text-center">
          <div className="unjam-animate-spin unjam-rounded-full unjam-h-8 unjam-w-8 unjam-border-b-2 unjam-border-blue-600 unjam-mx-auto"></div>
          <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // User is fully signed in with profile
  if (authUser.status === 'signed-in') {
    return (
      <div className="unjam-min-h-screen unjam-w-[350px] unjam-bg-gray-50 unjam-flex unjam-flex-col unjam-justify-center unjam-py-12 unjam-px-4">
        <div className="unjam-sm:mx-auto unjam-sm:w-full unjam-sm:max-w-md">
          <h2 className="unjam-text-center unjam-text-3xl unjam-font-bold unjam-text-gray-900 unjam-mb-8">
            Extension
          </h2>
          <div className="unjam-bg-white unjam-py-8 unjam-px-6 unjam-shadow unjam-rounded-lg">
            <SignInSuccess />
          </div>
        </div>
      </div>
    );
  }

  // User needs to complete profile
  if (authUser.status === 'requires-profile') {
    return (
      <div className="unjam-min-h-screen unjam-w-[350px] unjam-bg-gray-50 unjam-flex unjam-flex-col unjam-justify-center unjam-py-12 unjam-px-4">
        <div className="unjam-sm:mx-auto unjam-sm:w-full unjam-sm:max-w-md">
          <h2 className="unjam-text-center unjam-text-3xl unjam-font-bold unjam-text-gray-900 unjam-mb-8">
            Extension
          </h2>
          <div className="unjam-bg-white unjam-py-8 unjam-px-6 unjam-shadow unjam-rounded-lg">
            <RequiresProfile />
          </div>
        </div>
      </div>
    );
  }

  // User is not signed in
  return <SignIn />;
};

const PopupApp = () => {
  return (
    <ExtensionAuthManagerProvider>
      <PopupContent />
    </ExtensionAuthManagerProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);