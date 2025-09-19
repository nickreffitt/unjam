import React from 'react'
import ReactDOM from 'react-dom/client'
import CustomerExtension from '@extension/CustomerExtension'
import ScreenShareDemo from '@extension/ScreenShareDemo'
import { UserProfileProvider } from '@extension/shared/UserProfileContext'
import { TicketManagerProvider } from '@extension/Ticket/contexts/TicketManagerContext'
import { ChatManagerProvider } from '@extension/ChatBox/contexts/ChatManagerContext'

// Simple routing based on URL path
const App = () => {
  const path = window.location.pathname;

  if (path === '/screenshare' || path === '/extension/screenshare') {
    return <ScreenShareDemo />;
  }

  return (
    <UserProfileProvider>
      <TicketManagerProvider>
        <ChatManagerProvider>
          <CustomerExtension />
        </ChatManagerProvider>
      </TicketManagerProvider>
    </UserProfileProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)