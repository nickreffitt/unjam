import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '@dashboard/engineer/Sidebar/Sidebar';
import NewTicketsList from '@dashboard/pages/engineer/NewTicketsList/NewTicketsList';
import ActiveTicketsList from '@dashboard/pages/engineer/ActiveTicketsList/ActiveTicketsList';
import CompletedTicketsList from '@dashboard/pages/engineer/CompletedTicketsList/CompletedTicketsList';
import TicketPreview from '@dashboard/pages/engineer/TicketPreview/TicketPreview';
import ActiveTicket from '@dashboard/pages/engineer/ActiveTicket/ActiveTicket';
import CompletedTicket from '@dashboard/pages/engineer/CompletedTicket/CompletedTicket';
import Settings from '@dashboard/pages/engineer/Settings';
import SignIn from '@dashboard/SignIn/SignIn';
import VerifyAuth from '@dashboard/VerifyAuth/VerifyAuth';
import Logout from '@dashboard/Logout/Logout';
import CreateProfile from '@dashboard/CreateProfile/CreateProfile';
import { AuthManagerProvider, useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import { SupabaseProvider } from '@dashboard/shared/contexts/SupabaseContext';
import { TicketManagerProvider } from '@dashboard/engineer/Ticket/contexts/TicketManagerContext';
import { TicketListManagerProvider } from '@dashboard/engineer/TicketList/contexts/TicketListManagerContext';
import { ChatManagerProvider } from '@dashboard/engineer/ChatBox/contexts/ChatManagerContext';
import { ScreenShareManagerProvider } from '@dashboard/engineer/ScreenShare/contexts/ScreenShareManagerContext';
import Onboarding from '@dashboard/pages/customer/Onboarding';
import BuyCredits from '@dashboard/pages/customer/BuyCredits';
import CustomerSidebar from '@dashboard/customer/Sidebar/Sidebar';
import { SubscriptionManagerProvider } from '@dashboard/customer/Subscription';
import CreditSuccess from '@dashboard/pages/customer/CreditSuccess';
import GithubConnect from '@dashboard/pages/customer/GithubConnect/GithubConnect';
import GithubCallback from '@dashboard/pages/customer/GithubCallback/GithubCallback';
import { BillingAccountManagerProvider } from './engineer/BillingAccount';
import { GithubConnectManagerProvider } from './customer/GithubConnect';


const ProtectedEngineerDashboard: React.FC = () => {
  return (
    <BillingAccountManagerProvider>
      <TicketManagerProvider>
        <TicketListManagerProvider>
          <ChatManagerProvider>
            <ScreenShareManagerProvider>
              <div className="unjam-flex unjam-h-screen unjam-bg-gray-100 unjam-font-sans">
                <Sidebar />
                <div className="unjam-flex-1 unjam-overflow-hidden">
                  <Routes>
                    <Route path="new" element={<NewTicketsList />} />
                    <Route path="new/:ticketId" element={<TicketPreview />} />
                    <Route path="active" element={<ActiveTicketsList />} />
                    <Route path="active/:ticketId" element={<ActiveTicket />} />
                    <Route path="completed" element={<CompletedTicketsList />} />
                    <Route path="completed/:ticketId" element={<CompletedTicket />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="auth/logout" element={<Logout />} />
                    <Route path="*" element={<NewTicketsList />} />
                  </Routes>
                </div>
              </div>
            </ScreenShareManagerProvider>
          </ChatManagerProvider>
        </TicketListManagerProvider>
      </TicketManagerProvider>
    </BillingAccountManagerProvider>
  );
};


const ProtectedCustomerDashboard: React.FC = () => {
  return (
    <SubscriptionManagerProvider>
      <GithubConnectManagerProvider>
        <div className="unjam-flex unjam-h-screen unjam-bg-gray-100 unjam-font-sans">
          <CustomerSidebar />
          <div className="unjam-flex-1 unjam-overflow-hidden">
            <Routes>
              <Route path="onboarding" element={<Onboarding />} />
              <Route path="buy" element={<BuyCredits />} />
              <Route path="buy/success" element={<CreditSuccess />} />
              <Route path="github-connect" element={<GithubConnect />} />
              <Route path="github-callback" element={<GithubCallback />} />
              <Route path="auth/logout" element={<Logout />} />
              <Route path="*" element={<BuyCredits />} />
            </Routes>
          </div>
        </div>
      </GithubConnectManagerProvider>
    </SubscriptionManagerProvider>
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
      if (authUser.profile?.type === 'customer') {
        return <ProtectedCustomerDashboard />;
      } else {
        return <ProtectedEngineerDashboard />;
      }
    }
    case 'requires-profile': {
      return (
          <Routes>
            <Route path="*" element={<CreateProfile />} />
          </Routes>
        );
      break;
    }
    default: {
      return (
          <Routes>
            <Route path="auth" element={<SignIn />} />
            <Route path="auth/verify" element={<VerifyAuth />} />
            <Route path="auth/complete-profile" element={<CreateProfile />} />
            <Route path="auth/logout" element={<Logout />} />
            <Route path="*" element={<SignIn />} />
          </Routes>
        );
      break;
    }
  }
};

const Dashboard: React.FC = () => {
  return (
    <SupabaseProvider>
      <AuthManagerProvider>
        <DashboardContent />
      </AuthManagerProvider>
    </SupabaseProvider>
  );
};

export default Dashboard;
