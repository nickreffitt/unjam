import React, { useState } from 'react';
import { CheckCircle, XCircle, Download } from 'lucide-react';
import { useOnboardingState } from './hooks/useOnboardingState';

const EDITOR_OPTIONS = [
  { name: 'Lovable', url: 'https://lovable.dev/' },
  { name: 'Replit', url: 'https://replit.com/' },
  { name: 'Base44', url: 'https://app.base44.com/' },
  { name: 'Bolt', url: 'https://bolt.new/' },
  { name: 'v0', url: 'https://v0.app/' },
  { name: 'Blank page', url: `${import.meta.env.VITE_APP_URL}/help` }
];

const OnboardingStatus: React.FC = () => {
  const {
    creditBalance,
    pendingCredits,
    extensionInstalled,
    githubIntegration,
    isLoading
  } = useOnboardingState();

  const [selectedEditor, setSelectedEditor] = useState(EDITOR_OPTIONS[0]);

  const handleOpenEditor = () => {
    window.open(selectedEditor.url, '_blank');
  };

  const hasCredits = creditBalance !== null && creditBalance !== undefined;
  const hasGithub = githubIntegration !== null;

  if (isLoading) {
    return (
      <div className="unjam-bg-white unjam-shadow unjam-rounded-lg unjam-p-6">
        <div className="unjam-flex unjam-items-center unjam-justify-center unjam-py-8">
          <div className="unjam-animate-spin unjam-h-6 unjam-w-6 unjam-border-4 unjam-border-blue-200 unjam-border-t-blue-600 unjam-rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="unjam-bg-white unjam-shadow unjam-rounded-lg unjam-p-6 unjam-space-y-6">
      <h2 className="unjam-text-xl unjam-font-semibold unjam-text-gray-900">Getting Started</h2>

      {/* Credit Balance Status */}
      <div className="unjam-space-y-2">
        <div className="unjam-flex unjam-items-center unjam-justify-between">
          <div className="unjam-flex unjam-items-center unjam-space-x-2">
            {hasCredits ? (
              <CheckCircle className="unjam-h-5 unjam-w-5 unjam-text-green-500" />
            ) : (
              <XCircle className="unjam-h-5 unjam-w-5 unjam-text-gray-400" />
            )}
            <span className="unjam-text-sm unjam-font-medium unjam-text-gray-700">
              Credits
            </span>
          </div>
        </div>
        {hasCredits && (
          <div className="unjam-ml-7 unjam-text-sm unjam-text-gray-600">
            <div>Available: <span className="unjam-font-semibold">{creditBalance ?? 0}</span></div>
            {pendingCredits !== null && pendingCredits > 0 && (
              <div className="unjam-text-xs unjam-text-gray-500">
                Pending: {pendingCredits} credits
              </div>
            )}
          </div>
        )}
      </div>

      {/* Extension Status */}
      <div className="unjam-space-y-2">
        <div className="unjam-flex unjam-items-center unjam-space-x-2">
          {extensionInstalled ? (
            <CheckCircle className="unjam-h-5 unjam-w-5 unjam-text-green-500" />
          ) : (
            <XCircle className="unjam-h-5 unjam-w-5 unjam-text-gray-400" />
          )}
          <span className="unjam-text-sm unjam-font-medium unjam-text-gray-700">
            Extension Installed
          </span>
        </div>
      </div>

      {/* GitHub OAuth Status */}
      <div className="unjam-space-y-2">
        <div className="unjam-flex unjam-items-center unjam-space-x-2">
          {hasGithub ? (
            <CheckCircle className="unjam-h-5 unjam-w-5 unjam-text-green-500" />
          ) : (
            <XCircle className="unjam-h-5 unjam-w-5 unjam-text-gray-400" />
          )}
          <span className="unjam-text-sm unjam-font-medium unjam-text-gray-700">
            GitHub Connected
          </span>
          {hasGithub && githubIntegration && (
            <span className="unjam-text-sm unjam-text-gray-600">
              @{githubIntegration.githubUsername}
            </span>
          )}
        </div>
      </div>

      {/* AI Editor Link */}
      <div className="unjam-pt-4 unjam-border-t unjam-border-gray-200">
        <div className="unjam-flex unjam-space-x-2">
          <select
            value={selectedEditor.name}
            onChange={(e) => {
              const editor = EDITOR_OPTIONS.find(opt => opt.name === e.target.value);
              if (editor) setSelectedEditor(editor);
            }}
            className="unjam-w-2/3 unjam-px-3 unjam-py-2 unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded-md unjam-text-sm unjam-text-gray-700 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-gray-800"
          >
            {EDITOR_OPTIONS.map((editor) => (
              <option key={editor.name} value={editor.name}>
                {editor.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleOpenEditor}
            className="unjam-w-1/3 unjam-flex unjam-items-center unjam-justify-center unjam-space-x-2 unjam-px-4 unjam-py-2 unjam-bg-gray-800 unjam-text-white unjam-rounded-md hover:unjam-bg-gray-900 unjam-transition-colors"
          >
            <Download className="unjam-h-4 unjam-w-4" />
            <span>Open</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStatus;
