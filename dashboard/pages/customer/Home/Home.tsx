import React, { useState } from 'react';
import OnboardingStatus from '@dashboard/customer/OnboardingStatus/OnboardingStatus';
import RecentTickets from '@dashboard/customer/RecentTickets/RecentTickets';

const TICKETS_PER_PAGE = 5;

const Home: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);

  // TODO: Get actual tickets data
  const tickets: any[] = [];

  const totalPages = Math.ceil(tickets.length / TICKETS_PER_PAGE);
  const startIndex = (currentPage - 1) * TICKETS_PER_PAGE;
  const paginatedTickets = tickets.slice(startIndex, startIndex + TICKETS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleTicketClick = (ticketId: string) => {
    // TODO: Navigate to ticket detail page
    console.log('Navigate to ticket:', ticketId);
  };

  return (
    <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-py-8 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
      <div className="unjam-max-w-7xl unjam-mx-auto unjam-space-y-8">
        {/* Header */}
        <div>
          <h1 className="unjam-text-3xl unjam-font-bold unjam-text-gray-900">Dashboard</h1>
          <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
            Manage your account and view your recent support tickets
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="unjam-grid unjam-grid-cols-1 lg:unjam-grid-cols-3 unjam-gap-8">
          {/* Left Column - Onboarding Status */}
          <div className="lg:unjam-col-span-1">
            <OnboardingStatus />
          </div>

          {/* Right Column - Recent Tickets */}
          <div className="lg:unjam-col-span-2">
            <RecentTickets
              tickets={paginatedTickets}
              currentPage={currentPage}
              totalPages={totalPages}
              onNextPage={handleNextPage}
              onPrevPage={handlePrevPage}
              onTicketClick={handleTicketClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
