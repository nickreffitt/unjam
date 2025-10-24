import React from 'react';
import { Github } from 'lucide-react';
import { useGithubConnectState } from './hooks/useGithubConnectState';
import GithubConnectButton from './components/GithubConnectButton';
import GithubConnectStatus from './components/GithubConnectStatus';

const GithubConnect: React.FC = () => {
  const { integration, isLoading, error } = useGithubConnectState();

  if (isLoading) {
    return (
      <div className="unjam-h-full unjam-flex unjam-items-center unjam-justify-center unjam-p-4">
        <div className="unjam-flex unjam-flex-col unjam-items-center unjam-space-y-4">
          <div className="unjam-w-8 unjam-h-8 unjam-border-4 unjam-border-blue-200 unjam-border-t-blue-600 unjam-rounded-full unjam-animate-spin" />
          <div className="unjam-text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="unjam-h-full unjam-overflow-y-auto unjam-p-4">
        <div className="unjam-max-w-6xl unjam-mx-auto unjam-text-center">
          <div className="unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded-lg unjam-p-4">
            <h3 className="unjam-text-sm unjam-font-semibold unjam-text-red-800 unjam-mb-1">
              {error.title}
            </h3>
            <p className="unjam-text-sm unjam-text-red-600">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unjam-flex unjam-items-center unjam-justify-center unjam-min-h-screen unjam-bg-gray-50">
      <div className="unjam-max-w-md unjam-w-full unjam-p-8">
        <div className="unjam-bg-white unjam-rounded-lg unjam-shadow-lg unjam-p-8">
          <div className="unjam-flex unjam-flex-col unjam-items-center unjam-space-y-6">
            <Github className="unjam-w-16 unjam-h-16 unjam-text-gray-800" />
            {integration ? (
              <GithubConnectStatus integration={integration} />
            ) : (
              <GithubConnectButton />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GithubConnect;
