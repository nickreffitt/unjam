import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, CreditCard, ArrowDownToLine, Github, Check, Home, Settings } from 'lucide-react';
import { useOnboardingState } from '../OnboardingStatus/hooks/useOnboardingState';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const {
    subscription,
    extensionInstalled,
    githubIntegration
  } = useOnboardingState();

  const hasActiveSubscription = subscription !== null;
  const hasExtensionInstalled = extensionInstalled;
  const hasGithubConnected = githubIntegration !== null;

  const homeItem = {
    path: '/',
    label: 'Home',
    icon: Home
  };

  const settingsItem = {
    path: '/settings',
    label: 'Settings',
    icon: Settings
  };

  const getStartedItems = [
    {
      path: '/buy',
      label: hasActiveSubscription ? 'Manage Plan' : 'Choose Plan',
      icon: CreditCard,
      completed: false
    },
    {
      path: '/onboarding',
      label: 'Get Extension',
      icon: ArrowDownToLine,
      completed: hasExtensionInstalled
    },
    {
      path: '/github/connect',
      label: 'Connect GitHub',
      icon: Github,
      completed: hasGithubConnected
    },
  ];

  const logoutItem = {
    path: '/auth/logout',
    label: 'Logout',
    icon: LogOut
  };

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
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
        {/* Home link */}
        <ul className="unjam-space-y-2">
          <li>
            <Link
              to={homeItem.path}
              className={`unjam-flex unjam-items-center unjam-space-x-3 unjam-px-4 unjam-py-3 unjam-rounded-lg unjam-transition-colors unjam-text-sm ${
                isActivePath(homeItem.path)
                  ? 'unjam-bg-blue-50 unjam-text-blue-700 unjam-border unjam-border-blue-200'
                  : 'unjam-text-gray-700 hover:unjam-bg-gray-50 hover:unjam-text-gray-900'
              }`}
            >
              <homeItem.icon size={18} />
              <span className="unjam-font-medium">{homeItem.label}</span>
            </Link>
          </li>
        </ul>

        {/* Get Started section */}
        <div className="unjam-mt-6 unjam-pt-3">
          <h2 className="unjam-px-2 unjam-mb-2 unjam-text-xs unjam-font-semibold unjam-text-gray-500 unjam-uppercase unjam-tracking-wider">
            Get Started
          </h2>
          <ul className="unjam-space-y-2 unjam-pl-2">
            {getStartedItems.map((item) => (
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
                  <span className="unjam-font-medium unjam-flex-1">{item.label}</span>
                  {item.completed && (
                    <Check size={18} className="unjam-text-green-600" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Settings link */}
        <div className="unjam-mt-6 unjam-pt-6 unjam-border-t unjam-border-gray-200">
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
        </div>

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