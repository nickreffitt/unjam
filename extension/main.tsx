import React from 'react'
import ReactDOM from 'react-dom/client'
import CustomerExtension from '@extension/CustomerExtension'
import { TicketManagerProvider } from '@extension/Ticket/contexts/TicketManagerContext'
import { ChatManagerProvider } from '@extension/ChatBox/contexts/ChatManagerContext'
import { ScreenShareManagerProvider } from '@extension/ScreenShare/contexts/ScreenShareManagerContext'
import { SubscriptionManagerProvider } from '@extension/shared/contexts/SubscriptionManagerContext'
import { RatingManagerProvider } from '@extension/contexts/RatingManagerContext'

// Simple routing based on URL path
const App = () => {
  return (
      <SubscriptionManagerProvider>
        <TicketManagerProvider>
          <RatingManagerProvider>
            <ChatManagerProvider>
              <ScreenShareManagerProvider>
                <CustomerExtension />
              </ScreenShareManagerProvider>
            </ChatManagerProvider>
          </RatingManagerProvider>
        </TicketManagerProvider>
      </SubscriptionManagerProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)