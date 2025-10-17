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

// URL patterns that should trigger injection
const URL_PATTERNS = [
  /^http:\/\/localhost:5175\//,
  /^https:\/\/unjam\.nickreffitt\.com\//,
  /^https:\/\/lovable\.dev\/projects\/.+/,
  /^https:\/\/replit\.com\/@.+\/.+/,
  /^https:\/\/app\.base44\.com\/apps\/.+/,
  /^https:\/\/bolt\.new\/~\/sb1-.+/,
  /^https:\/\/v0\.app\/chat\/.+/
];

function shouldInjectUI(url: string): boolean {
  return URL_PATTERNS.some(pattern => pattern.test(url));
}

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

function handleUrlChange() {
  const currentUrl = window.location.href;
  console.debug('[ContentScript] URL changed to:', currentUrl);

  if (shouldInjectUI(currentUrl)) {
    console.debug('[ContentScript] URL matches pattern, ensuring UI is injected');
    injectUI();
  } else {
    console.debug('[ContentScript] URL does not match patterns, skipping injection');
  }
}

export default {
  matches: [
    'http://localhost:5175/*',
    'https://unjam.nickreffitt.com/*',
    'https://lovable.dev/*',
    'https://replit.com/*',
    'https://app.base44.com/*',
    'https://bolt.new/*',
    'https://v0.app/*'
  ],
  cssInjectionMode: 'manual' as const,

  main: async () => {
    // Inject UI immediately if current URL matches
    console.debug('[ContentScript] Initial load, checking URL:', window.location.href);
    handleUrlChange();

    // Listen for URL changes (for SPA navigation)
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        handleUrlChange();
      }
    });

    // Observe the entire document for changes that might indicate navigation
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also listen to popstate for back/forward navigation
    window.addEventListener('popstate', handleUrlChange);

    // Listen to pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleUrlChange();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      handleUrlChange();
    };

    console.debug('[ContentScript] Navigation listeners set up');
  },
};
