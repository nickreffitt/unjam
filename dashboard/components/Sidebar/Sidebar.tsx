import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    {
      path: '/new',
      label: 'New Tickets',
      icon: '📋'
    },
    {
      path: '/active',
      label: 'Active Tickets',
      icon: '⏱️'
    },
    {
      path: '/completed',
      label: 'Completed Tickets',
      icon: '✅'
    }
  ];

  const isActivePath = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="unjam-w-64 unjam-bg-white unjam-shadow-lg unjam-border-r unjam-border-gray-200 unjam-flex unjam-flex-col">
      <div className="unjam-p-6 unjam-border-b unjam-border-gray-200">
        <h1 className="unjam-text-xl unjam-font-semibold unjam-text-gray-900">Engineer Dashboard</h1>
      </div>
      
      <nav className="unjam-flex-1 unjam-p-4">
        <ul className="unjam-space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`unjam-flex unjam-items-center unjam-space-x-3 unjam-px-4 unjam-py-3 unjam-rounded-lg unjam-transition-colors ${
                  isActivePath(item.path)
                    ? 'unjam-bg-blue-50 unjam-text-blue-700 unjam-border unjam-border-blue-200'
                    : 'unjam-text-gray-700 hover:unjam-bg-gray-50 hover:unjam-text-gray-900'
                }`}
              >
                <span className="unjam-text-lg">{item.icon}</span>
                <span className="unjam-font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;