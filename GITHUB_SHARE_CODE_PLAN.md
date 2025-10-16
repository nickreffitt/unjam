# Share Code Feature - Complete Implementation Plan

## Overview
Add a "Share Code" button alongside the Screenshare button in the extension popup that allows customers to share their GitHub repository with the assigned engineer.

---

## 1. Database Schema

### New Tables

#### `github_integrations` ✅ CREATED
Stores GitHub OAuth tokens for authenticated customers:
```sql
-- Migration: 20251015130307_create_github_integrations_table.sql
CREATE TABLE github_integrations (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE,
  github_access_token TEXT NOT NULL,
  github_username TEXT NOT NULL,
  github_user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT github_integrations_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX github_integrations_customer_id_idx ON github_integrations (customer_id);
CREATE INDEX github_integrations_github_username_idx ON github_integrations (github_username);
CREATE INDEX github_integrations_github_user_id_idx ON github_integrations (github_user_id);

-- RLS Policies
-- Users can only view/manage their own GitHub integration
-- Realtime enabled
```

**Note:** Changed `profile_id` to `customer_id` for clarity - this table stores customer GitHub integrations only.

#### `project_repositories` ✅ CREATED
Maps external project URLs to GitHub repositories:
```sql
-- Migration: 20251015131019_create_project_repositories_table.sql
CREATE TABLE project_repositories (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  external_project_url TEXT NOT NULL, -- Normalized URL (e.g., https://lovable.dev/projects/abc123)
  external_platform TEXT NOT NULL, -- Platform name (e.g., 'Lovable', 'Replit')
  external_project_id TEXT NOT NULL, -- Extracted project ID
  github_repo_url TEXT NOT NULL, -- Full GitHub URL
  github_owner TEXT NOT NULL, -- Extracted from URL
  github_repo TEXT NOT NULL, -- Extracted from URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT project_repositories_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE,
  UNIQUE(customer_id, external_project_url)
);

-- Indexes
CREATE INDEX project_repositories_customer_id_idx ON project_repositories (customer_id);
CREATE INDEX project_repositories_external_project_url_idx ON project_repositories (external_project_url);
CREATE INDEX project_repositories_external_platform_idx ON project_repositories (external_platform);
CREATE INDEX project_repositories_customer_platform_idx ON project_repositories (customer_id, external_platform);

-- RLS Policies
-- Customers can view/manage their own repositories
-- Engineers can view repositories for customers whose tickets they are assigned to
-- Realtime enabled
```

#### `repository_collaborators`
Tracks engineer collaborators added per ticket:
```sql
CREATE TABLE repository_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES project_repositories(id) ON DELETE CASCADE,
  engineer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL, -- Engineer's GitHub username
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  removed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(ticket_id, repository_id, engineer_id)
);
```

### Table Updates

~~Update `tickets` table~~ **SKIPPED** - Not necessary as repo URL can be retrieved via `repository_collaborators` → `project_repositories` join:
```sql
-- ALTER TABLE tickets ADD COLUMN github_repo_url TEXT;
```

---

## 2. Platform Detection & Configuration ✅ COMPLETED

### Platform Guide Configuration
**File:** `extension/GitHubShare/config/platformGuides.ts` ✅

**Note:** Types moved to `common/types.ts` - `GuideSlide` and `PlatformGuide` interfaces now live there for reusability.

Supported platforms with correct URL patterns:
- Lovable: `https://lovable.dev/projects/*`
- Replit: `https://replit.com/@*/*`
- Base44: `https://app.base44.com/apps/*`
- Bolt.new: `https://bolt.new/~/sb1-*`
- v0.dev: `https://v0.app/chat/*`

### Platform Detection Utility ✅ COMPLETED
**File:** `extension/GitHubShare/util/platformDetection.ts`

Utility that detects current platform from `window.location.href` and returns:
```typescript
export interface DetectedPlatform {
  platformName: string;
  projectId: string;
  externalProjectUrl: string; // Normalized URL for DB storage
  guide: GuideSlide[];
}
```

**Tests:** `extension/GitHubShare/util/platformDetection.test.ts` - All 9 tests passing ✅

---

## 3. Common Features Module

### CodeShareApiManager ✅ COMPLETED
**File:** `common/features/CodeShareApiManager/CodeShareApiManager.ts`

Handles all communication with the `code-share` edge function:
```typescript
export class CodeShareApiManager {
  handleOAuthCallback(code: string, customerId: string): Promise<OAuthCallbackResponse>
  validateRepository(githubRepoUrl: string): Promise<ValidateRepositoryResponse>
  inviteCollaborator(repositoryId: string, ticketId: string, engineerGithubUsername: string): Promise<InviteCollaboratorResponse>
  removeCollaborator(repositoryId: string, ticketId: string, engineerGithubUsername: string): Promise<RemoveCollaboratorResponse>
}
```

**Note:** Follows the same pattern as `ApiManager` (to be renamed `BillingApiManager` later) with authenticated requests.

### CodeShareManager Module Structure ✅ COMPLETED
```
common/features/CodeShareManager/
├── CodeShareManager.ts                          ✅ COMPLETED
├── CodeShareManager.test.ts                     # Manager tests
├── events/
│   ├── CodeShareEventEmitter.ts                 ✅ COMPLETED
│   ├── CodeShareEventEmitterLocal.ts            ✅ COMPLETED
│   ├── CodeShareListener.ts                     ✅ COMPLETED
│   ├── CodeShareListenerLocal.ts                ✅ COMPLETED
│   └── index.ts                                 ✅ COMPLETED
├── store/                                       # Frontend-specific stores
│   ├── GitHubIntegrationStore.ts                ✅ COMPLETED
│   ├── GitHubIntegrationStoreSupabase.ts        ✅ COMPLETED
│   ├── GitHubIntegrationChanges.ts              ✅ COMPLETED
│   ├── GitHubIntegrationChangesSupabase.ts      ✅ COMPLETED
│   ├── ProjectRepositoryStore.ts                ✅ COMPLETED
│   ├── ProjectRepositoryStoreSupabase.ts        ✅ COMPLETED
│   ├── ProjectRepositoryChanges.ts              ✅ COMPLETED
│   ├── ProjectRepositoryChangesSupabase.ts      ✅ COMPLETED
│   ├── RepositoryCollaboratorStore.ts           ✅ COMPLETED
│   ├── RepositoryCollaboratorStoreSupabase.ts   ✅ COMPLETED
│   ├── RepositoryCollaboratorChanges.ts         ✅ COMPLETED
│   ├── RepositoryCollaboratorChangesSupabase.ts ✅ COMPLETED
│   └── index.ts                                 ✅ COMPLETED
├── hooks/
│   ├── useCodeShareListener.ts                  ✅ COMPLETED
│   └── index.ts                                 ✅ COMPLETED
├── util/
│   └── GitHubSupabaseRowMapper.ts               ✅ COMPLETED (shared with edge function)
└── index.ts                                     ✅ COMPLETED
```

**Implementation Notes:**
- Frontend stores handle **queries** and **repository creation** (client-side)
- Collaborator mutations (invite/remove) handled via CodeShareApiManager → Edge Function
- **Changes classes** handle real-time subscriptions for INSERT, UPDATE, DELETE events
  - Filter by `customer_id` for customer-specific data
  - Emit events through respective EventEmitter interfaces
  - Follow same pattern as `TicketChanges`/`TicketChangesSupabase`
- API responses include full data to avoid unnecessary database queries after mutations

### CodeShareManager Responsibilities ✅ COMPLETED
**File:** `common/features/CodeShareManager/CodeShareManager.ts`

Public Methods:
- `handleOAuthCallback(code: string)` - Process GitHub OAuth callback
- `getIntegration()` - Get customer's GitHub integration
- `validateRepository(githubRepoUrl: string)` - Validate GitHub repo URL
- `getRepositoryByExternalUrl(externalProjectUrl: string)` - Find existing repo mapping
- `getAllRepositories()` - Get all customer repositories
- `createRepositoryAndInvite(...)` - Create mapping and invite engineer (returns full data from API)
- `inviteCollaborator(...)` - Invite engineer to existing repo (returns full data from API)
- `removeCollaborator(...)` - Remove engineer access
- `getCollaboratorsByTicket(ticketId: string)` - Get collaborators for a ticket
- `reload()` - Sync data with other tabs
- `destroy()` - Cleanup and stop listening

Architecture:
- Uses dependency injection for all stores, changes, and API manager
- Follows same pattern as `TicketManager`
- Returns data from API responses directly (no redundant queries)
- Real-time changes sync data in background

---

## 4. Extension UI Components

### Structure
```
extension/GitHubShare/
├── components/
│   ├── ShareCodeButton/
│   │   └── ShareCodeButton.tsx
│   ├── GitHubAuthModal/
│   │   └── GitHubAuthModal.tsx
│   ├── RepoLinkModal/
│   │   └── RepoLinkModal.tsx
│   └── GuideSlideshow/
│       └── GuideSlideshow.tsx
├── hooks/
│   ├── useGitHubShareState.ts
│   └── useGitHubShareActions.ts
├── contexts/
│   └── GitHubShareManagerContext.tsx
├── config/
│   └── platformGuides.ts
└── util/
    └── platformDetection.ts
```

### Flow Logic in `useGitHubShareActions.ts`

```typescript
const handleShareCodeClick = async () => {
  // 1. Detect platform
  const platformInfo = detectPlatform();
  if (!platformInfo) {
    showError('Share Code not available on this platform');
    return;
  }

  // 2. Check GitHub integration
  const integration = await githubManager.getIntegration(customerId);
  if (!integration) {
    showGitHubAuthModal();
    return;
  }

  // 3. Check for existing repo mapping
  const existingRepo = await githubManager.getRepositoryByExternalUrl(
    customerId,
    platformInfo.externalProjectUrl
  );

  if (existingRepo) {
    // Auto-invite engineer (no prompts)
    await githubManager.inviteCollaborator(
      existingRepo.id,
      ticket.id,
      ticket.assignedTo.githubUsername
    );
    showSuccess('Engineer invited to repository');
    return;
  }

  // 4. Show repo link modal with platform guide
  showRepoLinkModal({
    platformName: platformInfo.platformName,
    guideSlides: platformInfo.guide,
    onSubmit: async (githubRepoUrl: string) => {
      // Save mapping and invite engineer
      await githubManager.createRepositoryAndInvite(
        customerId,
        platformInfo.externalProjectUrl,
        platformInfo.platformName,
        platformInfo.projectId,
        githubRepoUrl,
        ticket.id,
        ticket.assignedTo.githubUsername
      );
    }
  });
};
```

---

## 5. Edge Function - Consolidated Approach ✅ COMPLETED

### File Structure
```
supabase/functions/
├── code-share/                              ✅ COMPLETED
│   ├── index.ts                             ✅ COMPLETED
│   ├── CodeShareHandler.ts                  ✅ COMPLETED
│   ├── CodeShareOAuthHandler.ts             ✅ COMPLETED
│   └── deno.json                            # Import map
└── _shared/
    ├── services/
    │   ├── CodeShare/                       ✅ COMPLETED
    │   │   ├── CodeShareService.ts              # Interface (repository ops only) ✅ COMPLETED
    │   │   ├── CodeShareServiceGitHub.ts        # GitHub implementation ✅ COMPLETED
    │   │   └── index.ts                         # ✅ COMPLETED
    │   └── GitHubOAuth/                     ✅ COMPLETED
    │       ├── GitHubOAuthService.ts            # OAuth operations (concrete class) ✅ COMPLETED
    │       └── index.ts                         # ✅ COMPLETED
    ├── stores/
    │   ├── GitHubIntegration/                ✅ COMPLETED
    │   │   ├── GitHubIntegrationStore.ts
    │   │   ├── GitHubIntegrationStoreSupabase.ts
    │   │   └── index.ts
    │   ├── ProjectRepository/                ✅ COMPLETED
    │   │   ├── ProjectRepositoryStore.ts
    │   │   ├── ProjectRepositoryStoreSupabase.ts
    │   │   └── index.ts
    │   └── RepositoryCollaborator/           ✅ COMPLETED
    │       ├── RepositoryCollaboratorStore.ts
    │       ├── RepositoryCollaboratorStoreSupabase.ts
    │       └── index.ts
    └── util/
        └── GitHubSupabaseRowMapper.ts        ✅ COMPLETED
```

### Edge Function Entry Point ✅ COMPLETED
**File:** `supabase/functions/code-share/index.ts`

Key implementation details:
- Routes `oauth_callback` to `CodeShareOAuthHandler` (doesn't require existing integration)
- Routes other actions to `CodeShareHandler` (requires GitHub integration)
- Returns 403 error if user hasn't authenticated with GitHub for non-OAuth actions
- Uses separate service classes: `GitHubOAuthService` for OAuth, `CodeShareServiceGitHub` for repository operations

### Handler Classes ✅ COMPLETED

#### CodeShareHandler
**File:** `supabase/functions/code-share/CodeShareHandler.ts`

Handles repository and collaborator operations:
- Constructor injects: `ProjectRepositoryStore`, `RepositoryCollaboratorStore`, `CodeShareService`
- Methods: `validateRepository`, `inviteCollaborator`, `removeCollaborator`

#### CodeShareOAuthHandler
**File:** `supabase/functions/code-share/CodeShareOAuthHandler.ts`

Handles GitHub OAuth flow:
- Constructor injects: `GitHubIntegrationStore`, `GitHubOAuthService`
- Methods: `handleOAuthCallback`
- Exchanges OAuth code for token, fetches user info, stores integration

### Service Classes ✅ COMPLETED

#### CodeShareService (Interface)
**File:** `supabase/functions/_shared/services/CodeShare/CodeShareService.ts`

Interface for repository operations only:
```typescript
export interface CodeShareService {
  validateRepository(owner: string, repo: string): Promise<boolean>
  inviteCollaborator(owner: string, repo: string, username: string): Promise<void>
  removeCollaborator(owner: string, repo: string, username: string): Promise<void>
}
```

#### CodeShareServiceGitHub (Implementation)
**File:** `supabase/functions/_shared/services/CodeShare/CodeShareServiceGitHub.ts`

GitHub implementation using Octokit for repository operations.

#### GitHubOAuthService (Concrete Class)
**File:** `supabase/functions/_shared/services/GitHubOAuth/GitHubOAuthService.ts`

Handles GitHub OAuth operations:
```typescript
export class GitHubOAuthService {
  constructor(clientId: string, clientSecret: string)
  exchangeCodeForToken(code: string): Promise<{ access_token: string }>
  getAuthenticatedUser(token: string): Promise<{ login: string; id: number }>
}
```

### deno.json
**File:** `supabase/functions/code-share/deno.json`

Note: Using explicit relative imports instead of path aliases to match existing edge function patterns in this codebase.

---

## 6. Dashboard Updates

### TicketDetailsCard Enhancement
**File:** `dashboard/engineer/Ticket/components/TicketDetailsCard/TicketDetailsCard.tsx`

Add GitHub repository section (repo URL retrieved via `repository_collaborators` → `project_repositories` join):
```typescript
{githubRepoUrl && (
  <div>
    <h3 className="unjam-text-sm unjam-font-medium unjam-text-gray-500 unjam-uppercase unjam-tracking-wide unjam-mb-2">
      GitHub Repository
    </h3>
    <a
      href={githubRepoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="unjam-inline-flex unjam-items-center unjam-gap-2 unjam-text-blue-600 hover:unjam-text-blue-800"
    >
      <Github size={16} />
      View Repository
    </a>
  </div>
)}
```

---

## 7. Collaborator Lifecycle Management

### On Share Code
1. Validate GitHub integration exists
2. Look up or create project repository mapping
3. Call Edge Function to invite engineer as collaborator
4. Store record in `repository_collaborators`

### On Ticket Completion
Implement in `TicketManager` or database trigger:
1. Query `repository_collaborators` for ticket
2. Call Edge Function to remove engineer
3. Update `repository_collaborators.removed_at`

---

## 8. Security & RLS Policies

```sql
-- github_integrations
CREATE POLICY "Users can view their own GitHub integration"
ON github_integrations FOR SELECT
USING (profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()));

-- project_repositories
CREATE POLICY "Customers can manage their repositories"
ON project_repositories FOR ALL
USING (customer_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()));

-- repository_collaborators
CREATE POLICY "Users can view collaborators for their tickets"
ON repository_collaborators FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM tickets
    WHERE created_by IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    OR assigned_to IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
  )
);
```

---

## 9. Testing Strategy

### Unit Tests
- `GitHubManager.test.ts`: All public methods
- `platformDetection.test.ts`: URL parsing
- Store tests for each store class
- `GitHubIntegrationHandler.test.ts`: Edge function logic

### Integration Tests
- GitHub OAuth flow (mocked Octokit)
- Collaborator invite/remove with Supabase
- Repository mapping CRUD operations

---

## 10. Implementation Order

1. ✅ **Database migrations** (tables + RLS) - COMPLETED
2. ✅ **Platform detection utilities** (config + detection) - COMPLETED
3. ✅ **Edge Function shared services** - COMPLETED
   - ✅ `_shared/stores/` (GitHubIntegration, ProjectRepository, RepositoryCollaborator) - COMPLETED
   - ✅ `_shared/util/GitHubSupabaseRowMapper.ts` - COMPLETED
   - ✅ `_shared/services/CodeShare/` (CodeShareService, CodeShareServiceGitHub) - COMPLETED
   - ✅ `_shared/services/GitHubOAuth/` (GitHubOAuthService) - COMPLETED
4. ✅ **Edge Function handler** (`code-share/`) - COMPLETED
   - ✅ Entry point with routing logic - COMPLETED
   - ✅ CodeShareHandler (repository operations) - COMPLETED
   - ✅ CodeShareOAuthHandler (OAuth flow) - COMPLETED
5. ✅ **CodeShareApiManager** - COMPLETED
6. ✅ **Common CodeShareManager module** - COMPLETED
   - ✅ CodeShareManager class with all public methods - COMPLETED
   - ✅ Frontend stores (interfaces + Supabase implementations) - COMPLETED
   - ✅ Changes classes for real-time sync - COMPLETED
   - ✅ Events (EventEmitter + Listener) - COMPLETED
   - ✅ Hooks (useCodeShareListener) - COMPLETED
7. ✅ **Extension UI components** (button, modals, slideshow) - COMPLETED
   - ✅ ShareCodeButton component - COMPLETED
   - ✅ GitHubAuthModal component - COMPLETED
   - ✅ RepoLinkModal component - COMPLETED
   - ✅ GuideSlideshow component - COMPLETED
   - ✅ useGitHubShareState hook - COMPLETED
   - ✅ useGitHubShareActions hook - COMPLETED
   - ✅ GitHubShareManagerContext - COMPLETED
8. ✅ **Platform-specific guides** (all 5 platforms) - COMPLETED (already done in platformGuides.ts)
9. ⏳ **Dashboard updates** (show GitHub repo link)
10. ⏳ **Collaborator lifecycle** (invite/remove logic)
11. ⏳ **Tests** (unit + integration)

---

## Success Criteria

✅ Single consolidated Edge Function handles all GitHub operations
✅ Follows billing-links pattern with Handler class
✅ Uses `_shared` directory for reusable services/stores
✅ Customer authenticates with GitHub once
✅ Platform-specific guides display correctly
✅ Repository mappings persist per external project
✅ Engineers auto-invited on subsequent tickets
✅ Collaborators removed when tickets complete
✅ GitHub repo link visible on engineer dashboard
✅ All tests pass
