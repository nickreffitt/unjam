import React, { createContext, useContext, useMemo } from 'react';
import { type CustomerProfile } from '@common/types';

interface UserProfileContextType {
  customerProfile: CustomerProfile;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

interface UserProfileProviderProps {
  children: React.ReactNode;
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  // Centralized customer profile for all extension contexts
  const customerProfile: CustomerProfile = useMemo(() => ({
    id: 'CUST-EXT-001',
    name: 'Extension Customer',
    type: 'customer',
    email: 'extension@customer.com'
  }), []);

  return (
    <UserProfileContext.Provider value={{ customerProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = (): UserProfileContextType => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};