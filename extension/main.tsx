import React from 'react'
import ReactDOM from 'react-dom/client'
import CustomerExtension from '@extension/CustomerExtension'
import { UserProfileProvider } from '@extension/shared/UserProfileContext'
import { TicketManagerProvider } from '@extension/contexts/TicketManagerContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UserProfileProvider>
      <TicketManagerProvider>
        <CustomerExtension />
      </TicketManagerProvider>
    </UserProfileProvider>
  </React.StrictMode>,
)