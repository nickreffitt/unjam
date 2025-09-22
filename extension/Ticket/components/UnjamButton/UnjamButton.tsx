import React from 'react';

interface UnjamButtonProps {
  onClick: () => void;
  text: string;
  className?: string;
}

const UnjamButton: React.FC<UnjamButtonProps> = ({ onClick, text, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`unjam-bg-blue-600 hover:unjam-bg-blue-700 unjam-text-white unjam-font-semibold unjam-py-3 unjam-px-6 unjam-rounded-lg unjam-shadow-lg unjam-transition-colors ${className}`}
    >
      {text}
    </button>
  );
};

export default UnjamButton;