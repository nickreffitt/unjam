import React from 'react';
import { Github } from 'lucide-react';

interface ShareCodeButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const ShareCodeButton: React.FC<ShareCodeButtonProps> = ({
  onClick,
  disabled = false,
  loading = false
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`unjam-w-full unjam-bg-white unjam-text-black unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-2 ${
        disabled || loading
          ? 'unjam-bg-gray-100 unjam-text-gray-500 unjam-cursor-not-allowed'
          : 'hover:unjam-bg-gray-50'
      }`}
      aria-label="Share code repository"
    >
      <Github size={16} />
      <span>{loading ? 'Sharing...' : 'Share Code'}</span>
    </button>
  );
};

export default ShareCodeButton;
