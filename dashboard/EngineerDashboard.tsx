import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '@dashboard/shared/components/Sidebar/Sidebar';
import NewTicketsList from '@dashboard/TicketList/pages/NewTicketsList/NewTicketsList';
import ActiveTicketsList from '@dashboard/TicketList/pages/ActiveTicketsList/ActiveTicketsList';
import CompletedTicketsList from '@dashboard/TicketList/pages/CompletedTicketsList/CompletedTicketsList';
import TicketPreview from '@dashboard/Ticket/pages/TicketPreview/TicketPreview';
import ActiveTicket from '@dashboard/Ticket/pages/ActiveTicket/ActiveTicket';
import CompletedTicket from '@dashboard/Ticket/pages/CompletedTicket/CompletedTicket';
import { UserProfileProvider } from '@dashboard/shared/UserProfileContext';
import { TicketManagerProvider } from '@dashboard/Ticket/contexts/TicketManagerContext';
import { TicketListManagerProvider } from '@dashboard/TicketList/contexts/TicketListManagerContext';

const EngineerDashboard: React.FC = () => {
  return (
    <UserProfileProvider>
      <TicketManagerProvider>
        <TicketListManagerProvider>
          <div className="unjam-flex unjam-h-screen unjam-bg-gray-100 unjam-font-sans">
            <Sidebar />
            <div className="unjam-flex-1 unjam-overflow-hidden">
              <Routes>
                <Route path="/new" element={<NewTicketsList />} />
                <Route path="/new/:ticketId" element={<TicketPreview />} />
                <Route path="/active" element={<ActiveTicketsList />} />
                <Route path="/active/:ticketId" element={<ActiveTicket />} />
                <Route path="/completed" element={<CompletedTicketsList />} />
                <Route path="/completed/:ticketId" element={<CompletedTicket />} />
                <Route path="/" element={<Navigate to="/new" replace />} />
              </Routes>
            </div>
          </div>
        </TicketListManagerProvider>
      </TicketManagerProvider>
    </UserProfileProvider>
  );
};

export default EngineerDashboard;