import React, { useState, useEffect } from 'react';
import { Download, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Onboarding: React.FC = () => {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleDownloadExtension = async () => {
    setIsLoading(true);

    // Simulate download process
    setTimeout(() => {
      setIsLoading(false);
      setIsDownloaded(true);
    }, 1000);
  };

  // Redirect to BuyCredits after success is shown
  useEffect(() => {
    if (isDownloaded) {
      const timer = setTimeout(() => {
        navigate('/buy');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isDownloaded, navigate]);

  if (isDownloaded) {
    return (
      <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
        <div className="unjam-max-w-md unjam-w-full unjam-space-y-8">
          {/* Header */}
          <div className="unjam-text-center">
            <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-green-100">
              <CheckCircle className="unjam-h-8 unjam-w-8 unjam-text-green-600" />
            </div>
            <h2 className="unjam-mt-6 unjam-text-3xl unjam-font-extrabold unjam-text-gray-900">
              Extension Downloaded!
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
                  The Unjam extension has been successfully downloaded. You'll be redirected to choose your subscription plan.
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

export default Onboarding;