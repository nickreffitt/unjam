import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '@dashboard/components/Sidebar/Sidebar';
import NewTicketsList from '@dashboard/pages/NewTicketsList/NewTicketsList';
import ActiveTicketsList from '@dashboard/pages/ActiveTicketsList/ActiveTicketsList';
import CompletedTicketsList from '@dashboard/pages/CompletedTicketsList/CompletedTicketsList';
import TicketPreview from '@dashboard/pages/TicketPreview/TicketPreview';
import ActiveTicket from '@dashboard/pages/ActiveTicket/ActiveTicket';
import CompletedTicket from '@dashboard/pages/CompletedTicket/CompletedTicket';

const EngineerDashboard: React.FC = () => {
  return (
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
  );
};

export default EngineerDashboard;