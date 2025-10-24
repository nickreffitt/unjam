import React from 'react';
import { Github } from 'lucide-react';

interface StopSharingCodeButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const StopSharingCodeButton: React.FC<StopSharingCodeButtonProps> = ({
  onClick,
  disabled = false,
  loading = false
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`unjam-w-full unjam-bg-green-600 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-2 unjam-text-white unjam-font-medium unjam-shadow-sm ${
        disabled || loading
          ? 'unjam-opacity-50 unjam-cursor-not-allowed'
          : 'hover:unjam-bg-green-700 hover:unjam-border-green-800 unjam-transition-colors'
      }`}
      aria-label="Stop sharing code repository"
    >
      <Github size={16} />
      <span>{loading ? 'Stopping...' : 'Active'}</span>
    </button>
  );
};

export default StopSharingCodeButton;
