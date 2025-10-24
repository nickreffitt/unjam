import React from 'react';
import { Code, ExternalLink, Copy } from 'lucide-react';
import { useCodeShareState } from '@dashboard/engineer/CodeShare/hooks/useCodeShareState';
import { useCodeShareActions } from '@dashboard/engineer/CodeShare/hooks/useCodeShareActions';
import type { UserProfile } from '@common/types';

interface CodeShareProps {
  customer?: UserProfile;
}

const CodeShare: React.FC<CodeShareProps> = ({ customer }) => {
  const { uiState, repositoryUrl } = useCodeShareState(customer);
  const { requestCodeShare } = useCodeShareActions();
  const [copied, setCopied] = React.useState(false);

  const handleRequestCodeShare = () => {
    if (!customer) {
      console.warn('No customer profile available for code share request');
      return;
    }
    requestCodeShare(customer);
  };

  const handleCopyUrl = async () => {
    if (!repositoryUrl) return;

    try {
      await navigator.clipboard.writeText(repositoryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  if (repositoryUrl) {
    return (
      <div className="unjam-flex unjam-flex-col unjam-gap-3">
        <div className="unjam-font-medium unjam-text-gray-500 unjam-mb-2">
          Repository
        </div>
        <div className="unjam-flex unjam-items-center unjam-gap-2">
          <div className="unjam-flex-1 unjam-border unjam-text-gray-900 unjam-px-3 unjam-py-2 unjam-rounded unjam-text-sm unjam-font-mono unjam-truncate">
            {repositoryUrl}
          </div>
          <button
            onClick={handleCopyUrl}
            className="unjam-p-2 unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded hover:unjam-bg-gray-100 unjam-transition-colors"
            title="Copy URL to clipboard"
          >
            <Copy size={16} className="unjam-text-gray-600" />
          </button>
          <a
            href={repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="unjam-p-2 unjam-bg-blue-600 unjam-rounded hover:unjam-bg-blue-700 unjam-transition-colors"
            title="Open in GitHub"
          >
            <ExternalLink size={16} className="unjam-text-white" />
          </a>
        </div>
        {copied && (
          <div className="unjam-text-xs unjam-text-green-600 unjam-mt-2">
            Copied to clipboard!
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="unjam-flex unjam-flex-col unjam-gap-3">
      <button
        onClick={handleRequestCodeShare}
        disabled={uiState !== 'idle' || !customer}
        className="unjam-w-full unjam-bg-purple-600 hover:unjam-bg-purple-700 disabled:unjam-bg-gray-400 disabled:unjam-cursor-not-allowed unjam-text-white unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-transition-colors unjam-flex unjam-items-center unjam-justify-center unjam-gap-2"
      >
        <Code size={16} />
        {uiState === 'requesting' && 'Requesting...'}
        {uiState === 'idle' && 'Request Code'}
      </button>
    </div>
  );
};

export default CodeShare;
