import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '@dashboard/shared/components/Sidebar/Sidebar';
import NewTicketsList from '@dashboard/pages/NewTicketsList/NewTicketsList';
import ActiveTicketsList from '@dashboard/pages/ActiveTicketsList/ActiveTicketsList';
import CompletedTicketsList from '@dashboard/pages/CompletedTicketsList/CompletedTicketsList';
import TicketPreview from '@dashboard/pages/TicketPreview/TicketPreview';
import ActiveTicket from '@dashboard/pages/ActiveTicket/ActiveTicket';
import CompletedTicket from '@dashboard/pages/CompletedTicket/CompletedTicket';
import SignIn from '@dashboard/SignIn/SignIn';
import VerifyAuth from '@dashboard/VerifyAuth/VerifyAuth';
import Logout from '@dashboard/Logout/Logout';
import CreateProfile from '@dashboard/CreateProfile/CreateProfile';
import { AuthManagerProvider, useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import { TicketManagerProvider } from '@dashboard/Ticket/contexts/TicketManagerContext';
import { TicketListManagerProvider } from '@dashboard/TicketList/contexts/TicketListManagerContext';
import { ChatManagerProvider } from '@dashboard/ChatBox/contexts/ChatManagerContext';
import { ScreenShareManagerProvider } from '@dashboard/ScreenShare/contexts/ScreenShareManagerContext';


const ProtectedDashboard: React.FC = () => {
  return (
    <TicketManagerProvider>
      <TicketListManagerProvider>
        <ChatManagerProvider>
          <ScreenShareManagerProvider>
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
                  <Route path="/auth/logout" element={<Logout />} />
                  <Route path="/*" element={<Navigate to="/new" replace />} />
                </Routes>
              </div>
            </div>
          </ScreenShareManagerProvider>
        </ChatManagerProvider>
      </TicketListManagerProvider>
    </TicketManagerProvider>
  );
};

const DashboardContent: React.FC = () => {
  const { authUser, isLoading } = useAuthState();

  if (isLoading) {
    console.debug('[EngineerDashboard] Loading');
    return (
      <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center">
        <div className="unjam-flex unjam-flex-col unjam-items-center unjam-space-y-4">
          <div className="unjam-w-8 unjam-h-8 unjam-border-4 unjam-border-blue-200 unjam-border-t-blue-600 unjam-rounded-full unjam-animate-spin" />
          <div className="unjam-text-gray-600 unjam-font-medium">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  // Status-based routing using AuthUser status
  console.debug('[EngineerDashboard] user state:', authUser.status);
  console.debug('[EngineerDashboard] current pathname:', window.location.pathname);
  console.debug('[EngineerDashboard] search params:', window.location.search);


  switch (authUser.status) {
    case 'signed-in': {
        return (
          <Routes>
            <Route path="/*" element={<ProtectedDashboard />} />
          </Routes>
        );
        break;
    }
    case 'requires-profile': {
      return (
          <Routes>
            <Route path="/auth/complete-profile" element={<CreateProfile />} />
            <Route path="/*" element={<Navigate to="/auth/complete-profile" replace />} />
          </Routes>
        );
      break;
    }
    default: {
      return (
          <Routes>
            <Route path="/auth" element={<SignIn />} />
            <Route path="/auth/verify" element={<VerifyAuth />} />
            <Route path="/auth/complete-profile" element={<CreateProfile />} />
            <Route path="/auth/logout" element={<Logout />} />
            <Route path="/*" element={<Navigate to="/auth" replace />} />
          </Routes>
        );
      break;
    }
  }

  return (
    <Routes>
      <Route path="/auth" element={<SignIn />} />
      <Route path="/auth/verify" element={<VerifyAuth />} />
      <Route path="/auth/complete-profile" element={<CreateProfile />} />
      <Route path="/auth/logout" element={<Logout />} />
      <Route path="/*" element={<ProtectedDashboard />} />
    </Routes>
  );
};

const EngineerDashboard: React.FC = () => {
  return (
    <AuthManagerProvider>
      <DashboardContent />
    </AuthManagerProvider>
  );
};

export default EngineerDashboard;