import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, CheckCircle, Ticket, LogOut, Settings, CreditCard, Loader2 } from 'lucide-react';
import { useSupabase } from '@dashboard/shared/contexts/SupabaseContext';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import { ApiManager } from '@common/features/ApiManager';
import type { EngineerProfile } from '@common/types';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { supabaseClient, supabaseUrl } = useSupabase();
  const { authUser } = useAuthState();
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  const ticketItems = [
    {
      path: '/new',
      label: 'New',
      icon: Ticket
    },
    {
      path: '/active',
      label: 'Active',
      icon: Clock
    },
    {
      path: '/completed',
      label: 'Completed',
      icon: CheckCircle
    }
  ];

  const settingsItem = {
    path: '/settings',
    label: 'Settings',
    icon: Settings
  };

  const logoutItem = {
    path: '/auth/logout',
    label: 'Logout',
    icon: LogOut
  };

  const isActivePath = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const handlePaymentsClick = async () => {
    if (authUser.status !== 'signed-in' || !authUser.profile) {
      console.error('[Sidebar] No authenticated user profile available');
      return;
    }

    if (authUser.profile.type !== 'engineer') {
      console.error('[Sidebar] User is not an engineer');
      return;
    }

    setIsLoadingPayments(true);
    try {
      const engineerProfile = authUser.profile as EngineerProfile;
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1`;
      const apiManager = new ApiManager(supabaseClient, edgeFunctionUrl);

      const loginUrl = await apiManager.createEngineerLoginLink(engineerProfile.id);

      // Open the Stripe Express Dashboard in a new tab
      window.open(loginUrl, '_blank');
    } catch (error) {
      console.error('[Sidebar] Error creating engineer login link:', error);
      alert('Failed to open payments dashboard. Please try again.');
    } finally {
      setIsLoadingPayments(false);
    }
  };

  return (
    <div className="unjam-w-64 unjam-bg-white unjam-shadow-lg unjam-border-r unjam-border-gray-200 unjam-flex unjam-flex-col">
      <div className="unjam-p-6">
        <div className="unjam-flex unjam-items-center unjam-space-x-3">
          <img src="/img/logo.png" alt="Unjam Logo" className="unjam-h-12 unjam-w-12" />
          <h1 className="unjam-text-xl unjam-font-semibold unjam-text-gray-900">Unjam</h1>
        </div>
      </div>

      <nav className="unjam-flex-1 unjam-p-4 unjam-flex unjam-flex-col">
        {/* Tickets section */}
        <div className="unjam-mb-6 unjam-pb-6 unjam-border-b unjam-border-gray-200">
          <h2 className="unjam-px-2 unjam-mb-2 unjam-text-xs unjam-font-semibold unjam-text-gray-500 unjam-uppercase unjam-tracking-wider">
            Tickets
          </h2>
          <ul className="unjam-space-y-2 unjam-pl-2">
            {ticketItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`unjam-flex unjam-items-center unjam-space-x-3 unjam-px-4 unjam-py-3 unjam-rounded-lg unjam-transition-colors unjam-text-sm ${
                    isActivePath(item.path)
                      ? 'unjam-bg-blue-50 unjam-text-blue-700 unjam-border unjam-border-blue-200'
                      : 'unjam-text-gray-700 hover:unjam-bg-gray-50 hover:unjam-text-gray-900'
                  }`}
                >
                  <item.icon size={18} />
                  <span className="unjam-font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Other navigation items */}
        <ul className="unjam-space-y-2">
          {/* Payments button */}
          <li>
            <button
              onClick={handlePaymentsClick}
              disabled={isLoadingPayments}
              className={`unjam-w-full unjam-flex unjam-items-center unjam-space-x-3 unjam-px-4 unjam-py-3 unjam-rounded-lg unjam-transition-colors unjam-text-sm ${
                isLoadingPayments
                  ? 'unjam-bg-gray-100 unjam-text-gray-400 unjam-cursor-not-allowed'
                  : 'unjam-text-gray-700 hover:unjam-bg-gray-50 hover:unjam-text-gray-900'
              }`}
            >
              {isLoadingPayments ? (
                <Loader2 size={18} className="unjam-animate-spin" />
              ) : (
                <CreditCard size={18} />
              )}
              <span className="unjam-font-medium">Payments</span>
            </button>
          </li>

          {/* Settings link */}
          <li>
            <Link
              to={settingsItem.path}
              className={`unjam-flex unjam-items-center unjam-space-x-3 unjam-px-4 unjam-py-3 unjam-rounded-lg unjam-transition-colors unjam-text-sm ${
                isActivePath(settingsItem.path)
                  ? 'unjam-bg-blue-50 unjam-text-blue-700 unjam-border unjam-border-blue-200'
                  : 'unjam-text-gray-700 hover:unjam-bg-gray-50 hover:unjam-text-gray-900'
              }`}
            >
              <settingsItem.icon size={18} />
              <span className="unjam-font-medium">{settingsItem.label}</span>
            </Link>
          </li>
        </ul>

        {/* Logout at bottom */}
        <div className="unjam-mt-auto unjam-pt-4 unjam-border-t unjam-border-gray-200">
          <Link
            to={logoutItem.path}
            className={`unjam-flex unjam-items-center unjam-space-x-3 unjam-px-4 unjam-py-3 unjam-rounded-lg unjam-transition-colors unjam-text-sm ${
              isActivePath(logoutItem.path)
                ? 'unjam-bg-red-50 unjam-text-red-700 unjam-border unjam-border-red-200'
                : 'unjam-text-red-600 hover:unjam-bg-red-50 hover:unjam-text-red-700'
            }`}
          >
            <logoutItem.icon size={18} />
            <span className="unjam-font-medium">{logoutItem.label}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;