import React from 'react';
import ReactDOM from 'react-dom/client';
import ExtensionContainer from '@extension/ExtensionContainer/ExtensionContainer';
import { TicketManagerProvider } from '@extension/Ticket/contexts/TicketManagerContext';
import { UserProfileProvider } from '@extension/shared/UserProfileContext';
import { ChatManagerProvider } from '@extension/ChatBox/contexts/ChatManagerContext';
import styleText from '@extension/styles.css?inline';
import { ScreenShareManagerProvider } from '@extension/ScreenShare/contexts/ScreenShareManagerContext';

let uiMounted = false;

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

  // Mount React app inside shadow root
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <UserProfileProvider>
        <TicketManagerProvider>
          <ChatManagerProvider>
            <ScreenShareManagerProvider>
              <ExtensionContainer />
            </ScreenShareManagerProvider>
          </ChatManagerProvider>
        </TicketManagerProvider>
      </UserProfileProvider>
    </React.StrictMode>
  );

  uiMounted = true;
  console.info('[ContentScript] Tickets Realtime extension injected successfully with Shadow DOM');
}

export default {
  matches: [
    'https://lovable.dev/projects/*',
    'https://replit.com/@*/*',
    'https://app.base44.com/apps/*',
    'https://bolt.new/~/sb1-*',
    'https://v0.app/chat/*'
  ],
  cssInjectionMode: 'manual' as const,

  main: async () => {
    // Try to inject UI on initial load
    await injectUI();
  },
};
