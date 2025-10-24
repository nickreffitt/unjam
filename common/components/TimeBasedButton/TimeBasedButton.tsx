import React, { useCallback } from 'react';

interface TimeBasedButtonProps {
  expiresAt: Date;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const TimeBasedButton: React.FC<TimeBasedButtonProps> = ({
  expiresAt,
  onClick,
  className = '',
  children,
  disabled = false
}) => {
  // Calculate animation duration from expiration time
  const getAnimationDuration = useCallback(() => {
    const now = new Date().getTime();
    const expiresAtMs = new Date(expiresAt).getTime();
    const remainingMs = Math.max(0, expiresAtMs - now);

    return remainingMs / 1000; // Convert to seconds for CSS
  }, [expiresAt]);

  const animationDuration = getAnimationDuration();

  return (
    <>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`unjam-relative unjam-overflow-hidden ${className}`}
      >
        <div
          className="unjam-absolute unjam-inset-0 unjam-bg-gray-100"
          style={{
            width: '0%',
            animation: `unjam-progress ${animationDuration}s linear forwards`
          }}
        />
        <div className="unjam-relative unjam-z-10 unjam-flex unjam-items-center unjam-justify-center unjam-gap-1">
          {children}
        </div>
      </button>
      <style>{`
        @keyframes unjam-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </>
  );
};

export default TimeBasedButton;
