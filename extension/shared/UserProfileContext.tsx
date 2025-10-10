import React, { createContext, useContext, useMemo } from 'react';
import { type CustomerProfile } from '@common/types';

interface UserProfileContextType {
  customerProfile: CustomerProfile;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

interface UserProfileProviderProps {
  children: React.ReactNode;
  customerProfile: CustomerProfile;
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children, customerProfile }) => {
  // Wrap in useMemo to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ customerProfile }), [customerProfile]);

  return (
    <UserProfileContext.Provider value={contextValue}>
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