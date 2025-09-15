import React, { createContext, useContext, useMemo } from 'react';
import { type EngineerProfile } from '@common/types';

interface UserProfileContextType {
  engineerProfile: EngineerProfile;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

interface UserProfileProviderProps {
  children: React.ReactNode;
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  // Centralized engineer profile for all dashboard contexts
  const engineerProfile: EngineerProfile = useMemo(() => ({
    id: 'ENG-DASHBOARD-001',
    name: 'Dashboard Engineer',
    type: 'engineer',
    email: 'dashboard@engineer.com',
    specialties: ['frontend', 'backend']
  }), []);

  return (
    <UserProfileContext.Provider value={{ engineerProfile }}>
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