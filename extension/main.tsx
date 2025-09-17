import React from 'react'
import ReactDOM from 'react-dom/client'
import CustomerExtension from '@extension/CustomerExtension'
import { UserProfileProvider } from '@extension/shared/UserProfileContext'
import { TicketManagerProvider } from '@extension/Ticket/contexts/TicketManagerContext'
import { ChatManagerProvider } from '@extension/ChatBox/contexts/ChatManagerContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UserProfileProvider>
      <TicketManagerProvider>
        <ChatManagerProvider>
          <CustomerExtension />
        </ChatManagerProvider>
      </TicketManagerProvider>
    </UserProfileProvider>
  </React.StrictMode>,
)