import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, CheckCircle, Ticket, LogOut, CreditCard, ArrowDownToLine } from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    {
      path: '/onboarding',
      label: 'Getting Started',
      icon: ArrowDownToLine
    },
    {
      path: '/buy',
      label: 'Buy Credits',
      icon: CreditCard
    }
  ];

  const logoutItem = {
    path: '/auth/logout',
    label: 'Logout',
    icon: LogOut
  };

  const isActivePath = (path: string) => {
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
        <ul className="unjam-space-y-2">
          {navItems.map((item) => (
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