import React from 'react';
import { Github, CheckCircle } from 'lucide-react';
import { useGithubConnectState } from './hooks/useGithubConnectState';
import { useGithubConnectActions } from './hooks/useGithubConnectActions';
import GithubConnectStatus from './components/GithubConnectStatus';

const GithubConnect: React.FC = () => {
  const { integration, isLoading, error: stateError } = useGithubConnectState();
  const { startOAuthFlow, error: actionError } = useGithubConnectActions();

  const error = stateError || actionError;

  if (isLoading) {
    return (
      <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
        <div className="unjam-flex unjam-flex-col unjam-items-center unjam-space-y-4">
          <div className="unjam-animate-spin unjam-h-8 unjam-w-8 unjam-border-4 unjam-border-blue-200 unjam-border-t-blue-600 unjam-rounded-full"></div>
          <div className="unjam-text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
        <div className="unjam-max-w-md unjam-w-full unjam-space-y-8">
          <div className="unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded-lg unjam-p-6">
            <h3 className="unjam-text-sm unjam-font-semibold unjam-text-red-800 unjam-mb-1">
              {error.title}
            </h3>
            <p className="unjam-text-sm unjam-text-red-600">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show connected status
  if (integration) {
    return (
      <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
        <div className="unjam-max-w-md unjam-w-full unjam-space-y-8">
          <GithubConnectStatus integration={integration} />
        </div>
      </div>
    );
  }

  return (
    <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
      <div className="unjam-max-w-md unjam-w-full unjam-space-y-8">
        {/* Header */}
        <div className="unjam-text-center">
          <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-gray-100">
            <Github className="unjam-h-8 unjam-w-8 unjam-text-gray-800" />
          </div>
          <h2 className="unjam-mt-6 unjam-text-3xl unjam-font-extrabold unjam-text-gray-900">
            Connect GitHub
          </h2>
          <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
            Enable engineers to access and fix your code during support sessions
          </p>
        </div>

        {/* Main Content */}
        <div className="unjam-bg-white unjam-py-8 unjam-px-6 unjam-shadow unjam-rounded-lg">
          <div className="unjam-text-center unjam-space-y-6">
            <div>
              <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900">
                Give Engineers Access to Your Code
              </h3>
              <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
                When you create a ticket and grant permission, the assigned engineer can access your repositories to diagnose and fix issues directly in your codebase.
              </p>
            </div>

            <div className="unjam-space-y-4">
              <div className="unjam-bg-gray-50 unjam-p-4 unjam-rounded-lg">
                <ul className="unjam-text-sm unjam-text-gray-600 unjam-space-y-2">
                  <li className="unjam-flex unjam-items-center">
                    <CheckCircle className="unjam-h-4 unjam-w-4 unjam-text-green-500 unjam-mr-2 unjam-flex-shrink-0" />
                    Engineers can view and fix your code
                  </li>
                  <li className="unjam-flex unjam-items-center">
                    <CheckCircle className="unjam-h-4 unjam-w-4 unjam-text-green-500 unjam-mr-2 unjam-flex-shrink-0" />
                    You control access per ticket
                  </li>
                  <li className="unjam-flex unjam-items-center">
                    <CheckCircle className="unjam-h-4 unjam-w-4 unjam-text-green-500 unjam-mr-2 unjam-flex-shrink-0" />
                    Faster problem resolution
                  </li>
                </ul>
              </div>

              <button
                onClick={startOAuthFlow}
                className="unjam-group unjam-relative unjam-w-full unjam-flex unjam-justify-center unjam-py-3 unjam-px-4 unjam-border unjam-border-transparent unjam-text-sm unjam-font-medium unjam-rounded-md unjam-text-white unjam-bg-gray-800 hover:unjam-bg-gray-900 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-gray-500 unjam-transition-colors"
              >
                <Github className="unjam-h-4 unjam-w-4 unjam-mr-2" />
                Connect with GitHub
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="unjam-text-center">
          <p className="unjam-text-xs unjam-text-gray-500">
            You can disconnect your GitHub account at any time
          </p>
        </div>
      </div>
    </div>
  );
};

export default GithubConnect;
