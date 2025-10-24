import React, { useState } from 'react';
import { Github, AlertCircle } from 'lucide-react';
import { type GuideSlide } from '@common/types';
import GuideSlideshow from '../GuideSlideshow/GuideSlideshow';

interface RepoLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (githubRepoUrl: string) => Promise<void>;
  platformName: string;
  guideSlides: GuideSlide[];
}

const RepoLinkModal: React.FC<RepoLinkModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  platformName,
  guideSlides
}) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const validateGitHubUrl = (url: string): boolean => {
    // Basic GitHub URL validation
    const githubUrlPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/;
    return githubUrlPattern.test(url.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = repoUrl.trim();

    // Validate URL format
    if (!validateGitHubUrl(trimmedUrl)) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/username/repo-name)');
      return;
    }

    console.debug(`About to submit url: ${trimmedUrl}`)

    setIsSubmitting(true);
    try {
      await onSubmit(trimmedUrl);
      // Success - close modal and reset form
      setRepoUrl('');
      setError(null);
      onClose();
    } catch (err) {
      console.error('Failed to submit repository:', err);
      setError(err instanceof Error ? err.message : 'Failed to link repository. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRepoUrl('');
      setError(null);
      onClose();
    }
  };

  return (
    <div
      className="unjam-fixed unjam-inset-0 unjam-bg-black unjam-bg-opacity-50 unjam-flex unjam-items-center unjam-justify-center unjam-z-50 unjam-font-sans"
      onClick={handleBackdropClick}
    >
      <div className="unjam-bg-white unjam-rounded-lg unjam-shadow-xl unjam-w-full unjam-max-w-2xl unjam-mx-4 unjam-max-h-[90vh] unjam-overflow-y-auto">
        {/* Header */}
        <div className="unjam-flex unjam-items-center unjam-justify-between unjam-p-6 unjam-border-b unjam-border-gray-200">
          <h2 className="unjam-text-xl unjam-font-semibold unjam-text-gray-800">
            Link GitHub Repository
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="unjam-text-gray-400 hover:unjam-text-gray-600 unjam-text-2xl unjam-font-bold unjam-w-8 unjam-h-8 unjam-flex unjam-items-center unjam-justify-center disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="unjam-p-6">
          {/* Platform Guide */}
          {guideSlides.length > 0 && (
            <GuideSlideshow slides={guideSlides} platformName={platformName} />
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="unjam-mb-4">
              <label
                htmlFor="repo-url"
                className="unjam-block unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-mb-2"
              >
                GitHub Repository URL
              </label>
              <div className="unjam-relative">
                <div className="unjam-absolute unjam-inset-y-0 unjam-left-0 unjam-flex unjam-items-center unjam-pl-3 unjam-pointer-events-none">
                  <Github size={18} className="unjam-text-gray-400" />
                </div>
                <input
                  id="repo-url"
                  type="text"
                  value={repoUrl}
                  onChange={(e) => {
                    setRepoUrl(e.target.value);
                    setError(null);
                  }}
                  placeholder="https://github.com/username/repo-name"
                  className="unjam-bg-white unjam-text-black unjam-w-full unjam-pl-10 unjam-pr-3 unjam-py-2 unjam-border unjam-border-gray-300 unjam-rounded-md unjam-focus:ring-2 unjam-focus:ring-blue-500 unjam-focus:border-blue-500 unjam-outline-none"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <p className="unjam-text-xs unjam-text-gray-500 unjam-mt-1">
                Enter the full URL of your GitHub repository
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="unjam-mb-4 unjam-p-3 unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded-md unjam-flex unjam-items-start unjam-gap-2">
                <AlertCircle size={18} className="unjam-text-red-600 unjam-flex-shrink-0 unjam-mt-0.5" />
                <p className="unjam-text-sm unjam-text-red-800">{error}</p>
              </div>
            )}

            {/* Info Box */}
            <div className="unjam-mb-4 unjam-p-3 unjam-bg-blue-50 unjam-border unjam-border-blue-200 unjam-rounded-md">
              <p className="unjam-text-sm unjam-text-blue-800">
                The engineer will be invited as a collaborator to this repository so they can help fix your issue.
              </p>
            </div>

            {/* Footer */}
            <div className="unjam-flex unjam-items-center unjam-justify-end unjam-gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="unjam-px-4 unjam-py-2 unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded-md hover:unjam-bg-gray-50 unjam-transition-colors disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !repoUrl.trim()}
                className="unjam-px-4 unjam-py-2 unjam-text-sm unjam-font-medium unjam-text-white unjam-bg-blue-600 unjam-rounded-md hover:unjam-bg-blue-700 unjam-transition-colors disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed"
              >
                {isSubmitting ? 'Linking...' : 'Link Repository'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RepoLinkModal;
