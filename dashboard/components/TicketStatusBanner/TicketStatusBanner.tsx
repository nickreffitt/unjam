import React from 'react';

interface TicketStatusBannerProps {
  icon: string;
  message: string;
  bgColor: string;
  textColor: string;
}

const TicketStatusBanner: React.FC<TicketStatusBannerProps> = ({
  icon,
  message,
  bgColor,
  textColor
}) => {
  return (
    <div className={`unjam-${bgColor} unjam-${textColor} unjam-rounded-lg unjam-p-4 unjam-mb-6 unjam-flex unjam-items-center`}>
      <span className="unjam-text-lg unjam-mr-3">{icon}</span>
      <p className="unjam-font-medium">{message}</p>
    </div>
  );
};

export default TicketStatusBanner;