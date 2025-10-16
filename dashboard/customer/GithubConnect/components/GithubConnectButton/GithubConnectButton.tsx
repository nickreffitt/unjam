import React from 'react';
import { Github } from 'lucide-react';
import { useGithubConnectActions } from '../../hooks/useGithubConnectActions';

const GithubConnectButton: React.FC = () => {
  const { startOAuthFlow, error } = useGithubConnectActions();

  return (
    <div className="unjam-flex unjam-flex-col unjam-items-center unjam-space-y-6">
      <div className="unjam-text-center">
        <h1 className="unjam-text-2xl unjam-font-bold unjam-text-gray-900 unjam-mb-2">
          Connect GitHub
        </h1>
        <p className="unjam-text-gray-600">
          Connect your GitHub account to share repositories with engineers
        </p>
      </div>

      {error && (
        <div className="unjam-w-full unjam-p-4 unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded-lg">
          <h3 className="unjam-text-sm unjam-font-semibold unjam-text-red-800 unjam-mb-1">
            {error.title}
          </h3>
          <p className="unjam-text-sm unjam-text-red-600">{error.message}</p>
        </div>
      )}

      <button
        onClick={startOAuthFlow}
        className="unjam-w-full unjam-px-6 unjam-py-3 unjam-bg-gray-800 unjam-text-white unjam-rounded-lg hover:unjam-bg-gray-900 unjam-transition-colors unjam-font-medium unjam-flex unjam-items-center unjam-justify-center unjam-space-x-2"
      >
        <Github className="unjam-w-5 unjam-h-5" />
        <span>Connect with GitHub</span>
      </button>
    </div>
  );
};

export default GithubConnectButton;
