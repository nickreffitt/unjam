import React, { createContext, useContext, useMemo } from 'react';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import { useSupabase } from '@dashboard/shared/contexts/SupabaseContext';
import { CodeShareManager } from '@common/features/CodeShareManager/CodeShareManager';
import { CodeShareApiManager } from '@common/features/CodeShareApiManager/CodeShareApiManager';
import { CodeShareEventEmitterLocal } from '@common/features/CodeShareManager/events';
import {
  GitHubIntegrationStoreSupabase,
  ProjectRepositoryStoreSupabase,
  RepositoryCollaboratorStoreSupabase,
  CodeShareRequestStoreSupabase,
  GitHubIntegrationChangesSupabase,
  ProjectRepositoryChangesSupabase,
  RepositoryCollaboratorChangesSupabase
} from '@common/features/CodeShareManager/store';
import type { CustomerProfile } from '@common/types';
import { CodeShareRequestChangesSupabase } from '@common/features/CodeShareManager/store/CodeShareRequestChangesSupabase';

interface GithubConnectManagerContextType {
  userProfile: CustomerProfile;
  codeShareManager: CodeShareManager;
}

const GithubConnectManagerContext = createContext<GithubConnectManagerContextType | null>(null);

interface GithubConnectManagerProviderProps {
  children: React.ReactNode;
}

export const GithubConnectManagerProvider: React.FC<GithubConnectManagerProviderProps> = ({ children }) => {
  const { authUser } = useAuthState();
  const { supabaseClient, supabaseUrl } = useSupabase();

  if (!authUser.profile) {
    throw new Error('No user profile available for GitHub connect manager');
  }

  if (authUser.profile.type !== 'customer') {
    throw new Error('GitHub connect manager requires a customer profile');
  }

  const userProfile = authUser.profile as CustomerProfile;

  const githubClientId = import.meta.env.VITE_GH_CLIENT_ID;
  if (!githubClientId) {
    throw new Error('No VITE_GH_CLIENT_ID set');
  }

  const codeShareManager = useMemo(() => {
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1`;

    // Create event emitter
    const eventEmitter = new CodeShareEventEmitterLocal();

    // Initialize stores
    const githubIntegrationStore = new GitHubIntegrationStoreSupabase(supabaseClient);
    const projectRepositoryStore = new ProjectRepositoryStoreSupabase(supabaseClient);
    const repositoryCollaboratorStore = new RepositoryCollaboratorStoreSupabase(supabaseClient);
    const codeShareRequestStore = new CodeShareRequestStoreSupabase(supabaseClient, eventEmitter);

    // Initialize changes listeners with event emitter
    const githubIntegrationChanges = new GitHubIntegrationChangesSupabase(supabaseClient, eventEmitter);
    const codeShareRequestChanges = new CodeShareRequestChangesSupabase(supabaseClient, eventEmitter);
    const projectRepositoryChanges = new ProjectRepositoryChangesSupabase(supabaseClient, eventEmitter);
    const repositoryCollaboratorChanges = new RepositoryCollaboratorChangesSupabase(supabaseClient, eventEmitter);

    // Initialize API manager
    const codeShareApiManager = new CodeShareApiManager(supabaseClient, edgeFunctionUrl);

    // Create CodeShareManager
    console.debug('Instantiating CodeShareManager in customer dashboard');
    return new CodeShareManager(
      userProfile,
      githubIntegrationStore,
      codeShareRequestStore,
      projectRepositoryStore,
      repositoryCollaboratorStore,
      githubIntegrationChanges,
      codeShareRequestChanges,
      projectRepositoryChanges,
      repositoryCollaboratorChanges,
      codeShareApiManager,
      githubClientId
    );
  }, [supabaseUrl, supabaseClient, userProfile.id, githubClientId]);

  const contextValue: GithubConnectManagerContextType = useMemo(() => ({
    userProfile,
    codeShareManager
  }), [userProfile.id, codeShareManager]);

  return (
    <GithubConnectManagerContext.Provider value={contextValue}>
      {children}
    </GithubConnectManagerContext.Provider>
  );
};

export const useGithubConnectManager = (): GithubConnectManagerContextType => {
  const context = useContext(GithubConnectManagerContext);
  if (!context) {
    throw new Error('useGithubConnectManager must be used within GithubConnectManagerProvider');
  }
  return context;
};
