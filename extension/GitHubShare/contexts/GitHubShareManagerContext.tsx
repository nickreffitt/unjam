import React, { createContext, useContext, useMemo } from 'react';
import { CodeShareManager } from '@common/features/CodeShareManager';
import {
  type GitHubIntegrationStore,
  GitHubIntegrationStoreSupabase,
  GitHubIntegrationChangesSupabase,
  type ProjectRepositoryStore,
  ProjectRepositoryStoreSupabase,
  ProjectRepositoryChangesSupabase,
  type RepositoryCollaboratorStore,
  RepositoryCollaboratorStoreSupabase,
  RepositoryCollaboratorChangesSupabase
} from '@common/features/CodeShareManager/store';
import { CodeShareEventEmitterLocal } from '@common/features/CodeShareManager/events';
import { CodeShareApiManager } from '@common/features/CodeShareApiManager/CodeShareApiManager';
import { useUserProfile } from '@extension/shared/UserProfileContext';
import { useSupabase } from '@extension/shared/contexts/SupabaseContext';
import { useTicketManager } from '@extension/Ticket/contexts/TicketManagerContext';

interface GitHubShareManagerContextType {
  codeShareManager: CodeShareManager;
  githubIntegrationStore: GitHubIntegrationStore;
  projectRepositoryStore: ProjectRepositoryStore;
  repositoryCollaboratorStore: RepositoryCollaboratorStore;
}

const GitHubShareManagerContext = createContext<GitHubShareManagerContextType | null>(null);

interface GitHubShareManagerProviderProps {
  children: React.ReactNode;
}

export const GitHubShareManagerProvider: React.FC<GitHubShareManagerProviderProps> = ({ children }) => {
  const { customerProfile } = useUserProfile();
  const { ticketManager } = useTicketManager();
  const { supabaseClient, supabaseUrl } = useSupabase();

  // Create shared instances using centralized customer profile
  const contextValue = useMemo(() => {
    if (!customerProfile) {
      throw new Error('No profile set');
    }


    const eventEmitter = new CodeShareEventEmitterLocal();

    // Create stores
    const githubIntegrationStore = new GitHubIntegrationStoreSupabase(supabaseClient);
    const projectRepositoryStore = new ProjectRepositoryStoreSupabase(supabaseClient);
    const repositoryCollaboratorStore = new RepositoryCollaboratorStoreSupabase(supabaseClient);

    // Create changes listeners
    const githubIntegrationChanges = new GitHubIntegrationChangesSupabase(supabaseClient, eventEmitter);
    const projectRepositoryChanges = new ProjectRepositoryChangesSupabase(supabaseClient, eventEmitter);
    const repositoryCollaboratorChanges = new RepositoryCollaboratorChangesSupabase(supabaseClient, eventEmitter);

    // Create API manager
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1`;
    const apiManager = new CodeShareApiManager(supabaseClient, edgeFunctionUrl);

    // Get GitHub client ID from environment
    const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID || '';

    // Create CodeShareManager
    console.debug('Instantiating CodeShareManager in extension');
    const codeShareManager = new CodeShareManager(
      customerProfile,
      githubIntegrationStore,
      projectRepositoryStore,
      repositoryCollaboratorStore,
      githubIntegrationChanges,
      projectRepositoryChanges,
      repositoryCollaboratorChanges,
      apiManager,
      githubClientId
    );

    return {
      codeShareManager,
      githubIntegrationStore,
      projectRepositoryStore,
      repositoryCollaboratorStore,
    };
  }, [customerProfile, supabaseClient, supabaseUrl]);

  return (
    <GitHubShareManagerContext.Provider value={contextValue}>
      {children}
    </GitHubShareManagerContext.Provider>
  );
};

export const useGitHubShareManager = (): GitHubShareManagerContextType => {
  const context = useContext(GitHubShareManagerContext);
  if (!context) {
    throw new Error('useGitHubShareManager must be used within a GitHubShareManagerProvider');
  }
  return context;
};
