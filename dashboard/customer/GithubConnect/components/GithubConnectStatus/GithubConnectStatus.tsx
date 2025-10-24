import React from 'react';
import type { GitHubIntegration } from '@common/types';

interface GithubConnectStatusProps {
  integration: GitHubIntegration;
}

const GithubConnectStatus: React.FC<GithubConnectStatusProps> = ({ integration }) => {
  return (
    <div className="unjam-flex unjam-flex-col unjam-items-center unjam-space-y-6">
      <div className="unjam-text-center">
        <h1 className="unjam-text-2xl unjam-font-bold unjam-text-gray-900 unjam-mb-2">
          GitHub Connected
        </h1>
        <p className="unjam-text-gray-600">
          Your GitHub account is connected
        </p>
      </div>

      <div className="unjam-w-full unjam-p-4 unjam-bg-green-50 unjam-border unjam-border-green-200 unjam-rounded-lg">
        <p className="unjam-text-sm unjam-text-green-800">
          Connected as <span className="unjam-font-semibold">{integration.githubUsername}</span>
        </p>
      </div>
    </div>
  );
};

export default GithubConnectStatus;
