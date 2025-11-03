import React from 'react';
import { RotateCw, Eye, EyeOff, LogOut } from 'lucide-react';
import { type CustomerProfile } from '@common/types';
import { useExtensionAuthManager } from '@extension/shared/contexts/ExtensionAuthManagerContext';

interface ExtensionMenuProps {
  onChangePosition: () => void;
  onToggleVisibility: () => void;
  isButtonVisible: boolean;
  customerProfile: CustomerProfile;
}

const ExtensionMenu: React.FC<ExtensionMenuProps> = ({ onChangePosition, onToggleVisibility, isButtonVisible, onCreateNewTicket, customerProfile }) => {
  const { signOut } = useExtensionAuthManager();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <div className="unjam-w-[350px] unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-pt-4 unjam-pb-4 unjam-px-4">
      <div className="unjam-w-full unjam-space-y-8">
        {/* Header */}
        <div className="unjam-text-center">
          <div className="unjam-flex unjam-items-center unjam-justify-center unjam-gap-3 unjam-mt-5">
            <img src="/img/logo.png" alt="Unjam Logo" className="unjam-h-10 unjam-w-10" />
            <h2 className="unjam-text-3xl unjam-font-extrabold unjam-text-gray-900">
              Unjam
            </h2>
          </div>
          {customerProfile && (
            <>
              <p className="unjam-mt-3 unjam-text-sm unjam-text-gray-600">
                Welcome back {customerProfile.name}!
              </p>
              <p className="unjam-mt-2 unjam-text-xs unjam-text-gray-500">
                Open your favourite Web AI editor, or click Open Unjam below to get help on an empty page
              </p>
            </>
          )}
        </div>

        {/* Menu Actions */}
        <div className="unjam-w-full unjam-space-y-2">
          <button
            onClick={() => window.open(`${import.meta.env.VITE_APP_URL}/new-ticket`, '_blank')}
            className="unjam-w-full unjam-flex unjam-justify-center unjam-items-center unjam-gap-2 unjam-py-2.5 unjam-px-4 unjam-rounded-md unjam-text-sm unjam-font-medium unjam-text-white unjam-bg-blue-600 hover:unjam-bg-blue-700 focus:unjam-outline-none unjam-transition-colors"
          >
            Open Unjam
          </button>

          <button
            onClick={onToggleVisibility}
            className="unjam-w-full unjam-flex unjam-justify-center unjam-items-center unjam-gap-2 unjam-py-2.5 unjam-px-4 unjam-border unjam-border-gray-300 unjam-rounded-md unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-bg-white hover:unjam-bg-gray-50 focus:unjam-outline-none unjam-transition-colors"
          >
            {isButtonVisible ? (
              <EyeOff className="unjam-h-5 unjam-w-5" />
            ) : (
              <Eye className="unjam-h-5 unjam-w-5" />
            )}
            {isButtonVisible ? 'Hide button on page' : 'Show button on page'}
          </button>

          <button
            onClick={onChangePosition}
            className="unjam-w-full unjam-flex unjam-justify-center unjam-items-center unjam-gap-2 unjam-py-2.5 unjam-px-4 unjam-border unjam-border-gray-300 unjam-rounded-md unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-bg-white hover:unjam-bg-gray-50 focus:unjam-outline-none unjam-transition-colors"
          >
            <RotateCw className="unjam-h-5 unjam-w-5" />
            Change position
          </button>

          <button
            onClick={handleLogout}
            className="unjam-w-full unjam-flex unjam-justify-center unjam-items-center unjam-gap-2 unjam-py-2.5 unjam-px-4 unjam-text-sm unjam-font-medium unjam-text-red-600 unjam-bg-white hover:unjam-text-red-700 hover:unjam-underline focus:unjam-outline-none unjam-transition-colors"
          >
            <LogOut className="unjam-h-5 unjam-w-5" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExtensionMenu;
