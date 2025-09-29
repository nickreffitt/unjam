import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: EmptyStateAction;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, subtitle, action }) => {
  return (
    <div className="unjam-flex unjam-flex-col unjam-items-center unjam-justify-center unjam-py-20 unjam-px-6">
      <div className="unjam-bg-gray-100 unjam-rounded-2xl unjam-p-5 unjam-mb-6">
        <Icon size={48} className="unjam-text-gray-400" strokeWidth={1.5} />
      </div>
      <h3 className="unjam-text-xl unjam-font-semibold unjam-text-gray-900 unjam-mb-2">
        {title}
      </h3>
      <p className="unjam-text-base unjam-text-gray-500 unjam-text-center unjam-max-w-md unjam-mb-8">
        {subtitle}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="unjam-bg-blue-600 hover:unjam-bg-blue-700 unjam-text-white unjam-px-6 unjam-py-3 unjam-rounded-lg unjam-font-medium unjam-transition-colors unjam-flex unjam-items-center unjam-gap-2"
        >
          {action.icon && <action.icon size={20} />}
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;