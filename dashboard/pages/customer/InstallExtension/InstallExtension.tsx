import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';

const InstallExtension: React.FC = () => {
  const { authUser } = useAuthState();
  const [isWaitingForInstall, setIsWaitingForInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleDownloadExtension = async () => {
    setIsLoading(true);

    const extensionFilename = import.meta.env.VITE_EXTENSION_ZIP_FILENAME;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (!extensionFilename || !supabaseUrl) {
      console.error('Extension filename or Supabase URL not configured');
      setIsLoading(false);
      return;
    }

    // Construct download URL for public Supabase storage
    const downloadUrl = `${supabaseUrl}/storage/v1/object/public/extensions/${extensionFilename}`;

    // Trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = extensionFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsLoading(false);
    setIsWaitingForInstall(true);
  };

  // Monitor for extension installation
  useEffect(() => {
    console.debug(`[InstallExtension] isWaitingForInstall ${(isWaitingForInstall) ? "Yes" : "No"}, extensionInstalledAt: ${authUser.profile?.extensionInstalledAt}`)
    if (isWaitingForInstall && authUser.profile?.extensionInstalledAt) {
      setIsWaitingForInstall(false);
      setIsInstalled(true);
    }
  }, [isWaitingForInstall, authUser.profile?.extensionInstalledAt]);

  // Redirect to BuyCredits after success is shown
  useEffect(() => {
    if (isInstalled) {
      const timer = setTimeout(() => {
        navigate('/github/connect');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isInstalled, navigate]);

  // Show "Extension Installed!" success state
  if (isInstalled) {
    return (
      <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
        <div className="unjam-max-w-md unjam-w-full unjam-space-y-8">
          {/* Header */}
          <div className="unjam-text-center">
            <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-green-100">
              <CheckCircle className="unjam-h-8 unjam-w-8 unjam-text-green-600" />
            </div>
            <h2 className="unjam-mt-6 unjam-text-3xl unjam-font-extrabold unjam-text-gray-900">
              Extension Installed!
            </h2>
            <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
              Great! You're all set to continue with your setup.
            </p>
          </div>

          {/* Success Card */}
          <div className="unjam-bg-white unjam-py-8 unjam-px-6 unjam-shadow unjam-rounded-lg">
            <div className="unjam-text-center unjam-space-y-4">
              <div>
                <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900">
                  Installation Complete
                </h3>
                <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
                  The Unjam extension has been successfully installed. You'll be redirected to choose your subscription plan.
                </p>
              </div>
              <div className="unjam-animate-spin unjam-h-4 unjam-w-4 unjam-border-2 unjam-border-blue-600 unjam-border-t-transparent unjam-rounded-full unjam-mx-auto"></div>
            </div>
          </div>

          {/* Footer */}
          <div className="unjam-text-center">
            <p className="unjam-text-xs unjam-text-gray-500">
              Redirecting you to select your plan...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show "Waiting for installation" pending state
  if (isWaitingForInstall) {
    return (
      <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
        <div className="unjam-max-w-md unjam-w-full unjam-space-y-8">
          {/* Header */}
          <div className="unjam-text-center">
            <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-blue-100">
              <Clock className="unjam-h-8 unjam-w-8 unjam-text-blue-600" />
            </div>
            <h2 className="unjam-mt-6 unjam-text-3xl unjam-font-extrabold unjam-text-gray-900">
              Waiting for Installation
            </h2>
            <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
              Please install the extension in your browser
            </p>
          </div>

          {/* Waiting Card */}
          <div className="unjam-bg-white unjam-py-8 unjam-px-6 unjam-shadow unjam-rounded-lg">
            <div className="unjam-text-center unjam-space-y-4">
              <div>
                <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900">
                  Extension Downloaded
                </h3>
                <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
                  The extension has been downloaded. Please install it in your browser to continue.
                </p>
              </div>
              <div className="unjam-animate-spin unjam-h-6 unjam-w-6 unjam-border-4 unjam-border-blue-200 unjam-border-t-blue-600 unjam-rounded-full unjam-mx-auto"></div>
              <p className="unjam-text-xs unjam-text-gray-500">
                Waiting to detect installation...
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="unjam-text-center">
            <p className="unjam-text-xs unjam-text-gray-500">
              This page will automatically continue once the extension is installed
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
      <div className="unjam-max-w-md unjam-w-full unjam-space-y-8">
        {/* Header */}
        <div className="unjam-text-center">
          <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-blue-100">
            <Download className="unjam-h-8 unjam-w-8 unjam-text-blue-600" />
          </div>
          <h2 className="unjam-mt-6 unjam-text-3xl unjam-font-extrabold unjam-text-gray-900">
            Install Unjam Extension
          </h2>
          <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
            Download and install our browser extension to get started with instant support
          </p>
        </div>

        {/* Main Content */}
        <div className="unjam-bg-white unjam-py-8 unjam-px-6 unjam-shadow unjam-rounded-lg">
          <div className="unjam-text-center unjam-space-y-6">
            <div>
              <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900">
                Get Instant Support
              </h3>
              <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
                The Unjam extension lets you get help from our engineers right from your browser. Install it to continue setting up your account.
              </p>
            </div>

            <div className="unjam-space-y-4">
              <div className="unjam-bg-gray-50 unjam-p-4 unjam-rounded-lg">
                <ul className="unjam-text-sm unjam-text-gray-600 unjam-space-y-2">
                  <li className="unjam-flex unjam-items-center">
                    <CheckCircle className="unjam-h-4 unjam-w-4 unjam-text-green-500 unjam-mr-2 unjam-flex-shrink-0" />
                    Screen sharing with engineers
                  </li>
                  <li className="unjam-flex unjam-items-center">
                    <CheckCircle className="unjam-h-4 unjam-w-4 unjam-text-green-500 unjam-mr-2 unjam-flex-shrink-0" />
                    Real-time chat support
                  </li>
                  <li className="unjam-flex unjam-items-center">
                    <CheckCircle className="unjam-h-4 unjam-w-4 unjam-text-green-500 unjam-mr-2 unjam-flex-shrink-0" />
                    One-click ticket creation
                  </li>
                </ul>
              </div>

              <button
                onClick={handleDownloadExtension}
                disabled={isLoading}
                className={`unjam-group unjam-relative unjam-w-full unjam-flex unjam-justify-center unjam-py-3 unjam-px-4 unjam-border unjam-border-transparent unjam-text-sm unjam-font-medium unjam-rounded-md unjam-text-white ${
                  isLoading
                    ? 'unjam-bg-blue-400 unjam-cursor-not-allowed'
                    : 'unjam-bg-blue-600 hover:unjam-bg-blue-700 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500'
                } unjam-transition-colors`}
              >
                {isLoading ? (
                  <>
                    <div className="unjam-animate-spin unjam-h-4 unjam-w-4 unjam-border-2 unjam-border-white unjam-border-t-transparent unjam-rounded-full unjam-mr-2"></div>
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="unjam-h-4 unjam-w-4 unjam-mr-2" />
                    Download Extension
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="unjam-text-center">
          <p className="unjam-text-xs unjam-text-gray-500">
            The extension is required to access Unjam's support features
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstallExtension;