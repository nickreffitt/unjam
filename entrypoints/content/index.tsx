import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import ExtensionContainer from '@extension/ExtensionContainer/ExtensionContainer';
import { TicketManagerProvider } from '@extension/Ticket/contexts/TicketManagerContext';
import { UserProfileProvider } from '@extension/shared/UserProfileContext';
import { ChatManagerProvider } from '@extension/ChatBox/contexts/ChatManagerContext';
import styleText from '@extension/styles.css?inline';
import { ScreenShareManagerProvider } from '@extension/ScreenShare/contexts/ScreenShareManagerContext';
import { SupabaseProvider } from '@extension/shared/contexts/SupabaseContext';
import { ExtensionAuthManagerProvider, useExtensionAuthManager } from '@extension/shared/contexts/ExtensionAuthManagerContext';
import { SubscriptionManagerProvider } from '@extension/shared/contexts/SubscriptionManagerContext';
import { RatingManagerProvider } from '@extension/contexts/RatingManagerContext';
import { type CustomerProfile } from '@common/types';

let uiMounted = false;
let rootInstance: ReactDOM.Root | null = null;

// Component that checks auth state and conditionally renders the extension UI
const ContentApp = () => {
  const { authUser, isLoading } = useExtensionAuthManager();

  useEffect(() => {
    console.debug('[ContentApp] Auth state changed:', { status: authUser.status, isLoading });
  }, [authUser, isLoading]);

  // Don't render anything until auth is loaded
  if (isLoading || authUser.status === 'loading') {
    console.debug('[ContentApp] Loading auth state...');
    return null;
  }

  // Only render extension UI if user is fully signed in
  if (authUser.status !== 'signed-in') {
    console.debug('[ContentApp] User not signed in, status:', authUser.status);
    return null;
  }

  // TypeScript guard: ensure profile exists
  if (!authUser.profile) {
    console.error('[ContentApp] User signed in but no profile found');
    return null;
  }

  if (authUser.profile.type === 'engineer') {
    console.error('[ContentApp] User is an engineer')
  }

  const customerProfile = authUser.profile as CustomerProfile

  console.debug('[ContentApp] User signed in, rendering extension UI');
  return (
    <SupabaseProvider>
      <UserProfileProvider customerProfile={customerProfile}>
        <SubscriptionManagerProvider>
          <TicketManagerProvider>
            <RatingManagerProvider>
              <ChatManagerProvider>
                <ScreenShareManagerProvider>
                  <ExtensionContainer />
                </ScreenShareManagerProvider>
              </ChatManagerProvider>
            </RatingManagerProvider>
          </TicketManagerProvider>
        </SubscriptionManagerProvider>
      </UserProfileProvider>
    </SupabaseProvider>
  );
};

async function injectUI() {
  if (uiMounted) {
    console.info('[ContentScript] UI already mounted');
    return;
  }

  // Create host element and attach shadow root
  const host = document.createElement('div');
  host.id = 'tickets-realtime-extension-root';
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });

  // Create container inside shadow root for React
  const container = document.createElement('div');
  shadowRoot.appendChild(container);

  // Inject styles into shadow root
  const style = document.createElement('style');
  style.textContent = styleText;
  shadowRoot.appendChild(style);

  // Mount React app inside shadow root with auth provider
  rootInstance = ReactDOM.createRoot(container);
  rootInstance.render(
    <React.StrictMode>
      <ExtensionAuthManagerProvider>
        <ContentApp />
      </ExtensionAuthManagerProvider>
    </React.StrictMode>
  );

  uiMounted = true;
  console.info('[ContentScript] Extension injected with auth management');
}

export default {
  matches: [
    'http://localhost:5175/',
    'https://unjam.nickreffitt.com/',
    'https://lovable.dev/projects/*',
    'https://replit.com/@*/*',
    'https://app.base44.com/apps/*',
    'https://bolt.new/~/sb1-*',
    'https://v0.app/chat/*'
  ],
  cssInjectionMode: 'manual' as const,

  main: async () => {
    // Inject UI immediately - ExtensionAuthManagerProvider will handle auth checks
    console.debug('[ContentScript] Injecting UI with auth management');
    await injectUI();
  },
};
