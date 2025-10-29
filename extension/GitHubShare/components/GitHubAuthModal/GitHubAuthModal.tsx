import React from 'react';
import { Github } from 'lucide-react';

interface GitHubAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GitHubAuthModal: React.FC<GitHubAuthModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleGoToDashboard = () => {
    const dashboardUrl = `${import.meta.env.VITE_APP_URL}/github/connect`;
    window.open(dashboardUrl, '_blank');
    onClose();
  };

  return (
    <div
      className="unjam-fixed unjam-inset-0 unjam-bg-black unjam-bg-opacity-50 unjam-flex unjam-items-center unjam-justify-center unjam-z-50 unjam-font-sans"
      onClick={handleBackdropClick}
    >
      <div className="unjam-bg-white unjam-rounded-lg unjam-shadow-xl unjam-w-full unjam-max-w-md unjam-mx-4">
        {/* Header */}
        <div className="unjam-flex unjam-items-center unjam-justify-between unjam-p-6 unjam-border-b unjam-border-gray-200">
          <h2 className="unjam-text-xl unjam-font-semibold unjam-text-gray-800">
            Connect GitHub
          </h2>
          <button
            onClick={onClose}
            className="unjam-text-gray-400 hover:unjam-text-gray-600 unjam-text-2xl unjam-font-bold unjam-w-8 unjam-h-8 unjam-flex unjam-items-center unjam-justify-center disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="unjam-p-6">
          <div className="unjam-text-center">
            <div className="unjam-flex unjam-justify-center unjam-mb-4">
              <div className="unjam-w-16 unjam-h-16 unjam-bg-gray-100 unjam-rounded-full unjam-flex unjam-items-center unjam-justify-center">
                <Github size={32} className="unjam-text-gray-700" />
              </div>
            </div>

            <p className="unjam-text-gray-800 unjam-font-medium unjam-mb-2">
              Connect GitHub in Dashboard
            </p>

            <p className="unjam-text-gray-600 unjam-mb-6 unjam-text-sm">
              To share your code repository with the engineer, you need to connect your GitHub account through the dashboard.
              Once connected, you can return here to share your repository.
            </p>

            {/* Action Buttons */}
            <div className="unjam-flex unjam-flex-col unjam-gap-3">
              <button
                onClick={handleGoToDashboard}
                className="unjam-w-full unjam-flex unjam-items-center unjam-justify-center unjam-gap-2 unjam-px-4 unjam-py-3 unjam-text-sm unjam-font-medium unjam-text-white unjam-bg-gray-900 unjam-rounded-md hover:unjam-bg-gray-800 unjam-transition-colors"
              >
                <Github size={20} />
                <span>Go to Dashboard</span>
              </button>

              <button
                onClick={onClose}
                className="unjam-w-full unjam-px-4 unjam-py-2 unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded-md hover:unjam-bg-gray-50 unjam-transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Info Text */}
            <p className="unjam-text-xs unjam-text-gray-500 unjam-mt-4">
              Opens dashboard in a new tab
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitHubAuthModal;
