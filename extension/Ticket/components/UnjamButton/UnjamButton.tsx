import React from 'react';
import { PillBottle } from 'lucide-react';

interface UnjamButtonProps {
  onClick: () => void;
  text: string;
  className?: string;
}

const UnjamButton: React.FC<UnjamButtonProps> = ({ onClick, text, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`unjam-bg-orange-600 hover:unjam-bg-orange-700 unjam-text-white unjam-font-semibold unjam-w-14 unjam-h-14 unjam-rounded-full unjam-shadow-2xl unjam-transition-colors unjam-flex unjam-items-center unjam-justify-center ${className}`}
      aria-label={text}
      style={{ filter: 'drop-shadow(10px 10px 15px rgba(0, 0, 0, 0.3))' }}
    >
      <PillBottle size={24} />
    </button>
  );
};

export default UnjamButton;