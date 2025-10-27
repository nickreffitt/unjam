import React, { createContext, useContext, useMemo } from 'react';
import { CodeShareManager } from '@common/features/CodeShareManager/CodeShareManager';
import {
  GitHubIntegrationStoreSupabase,
  ProjectRepositoryStoreSupabase,
  RepositoryCollaboratorStoreSupabase,
  CodeShareRequestStoreSupabase,
  GitHubIntegrationChangesSupabase,
  ProjectRepositoryChangesSupabase,
  RepositoryCollaboratorChangesSupabase
} from '@common/features/CodeShareManager/store';
import { CodeShareEventEmitterLocal } from '@common/features/CodeShareManager/events';
import { CodeShareApiManager } from '@common/features/CodeShareApiManager/CodeShareApiManager';
import { useSupabase } from '@dashboard/shared/contexts/SupabaseContext';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import { CodeShareRequestChangesSupabase } from '@common/features/CodeShareManager/store/CodeShareRequestChangesSupabase';
interface CodeShareManagerContextType {
  codeShareManager: CodeShareManager;
}

const CodeShareManagerContext = createContext<CodeShareManagerContextType | null>(null);

interface CodeShareManagerProviderProps {
  children: React.ReactNode;
}

export const CodeShareManagerProvider: React.FC<CodeShareManagerProviderProps> = ({ children }) => {
  const { supabaseClient, supabaseUrl } = useSupabase();
  const { authUser } = useAuthState();

  if (!authUser.profile) {
    throw new Error('No user profile available for CodeShareManager');
  }

  const userProfile = authUser.profile;

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

    const githubClientId = import.meta.env.VITE_GH_CLIENT_ID || '';

    // Create CodeShareManager
    console.debug('Instantiating CodeShareManager in engineer dashboard');
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
  }, [supabaseUrl, supabaseClient, userProfile]);

  const contextValue = useMemo(() => {
    return { codeShareManager };
  }, [codeShareManager]);

  return (
    <CodeShareManagerContext.Provider value={contextValue}>
      {children}
    </CodeShareManagerContext.Provider>
  );
};

export const useCodeShareManager = (): CodeShareManagerContextType => {
  const context = useContext(CodeShareManagerContext);
  if (!context) {
    throw new Error('useCodeShareManager must be used within a CodeShareManagerProvider');
  }
  return context;
};
