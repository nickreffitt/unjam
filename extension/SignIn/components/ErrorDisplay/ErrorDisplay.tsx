import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { type ErrorDisplay as ErrorType } from '@common/types';

interface ErrorDisplayProps {
  error: ErrorType;
  onDismiss?: () => void;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  className = ''
}) => {
  return (
    <div className={`unjam-rounded-md unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-p-4 ${className}`}>
      <div className="unjam-flex unjam-justify-between unjam-items-start">
        <div className="unjam-flex">
          <div className="unjam-flex-shrink-0">
            <AlertCircle className="unjam-h-5 unjam-w-5 unjam-text-red-400" />
          </div>
          <div className="unjam-ml-3 unjam-flex-1">
            <h3 className="unjam-text-sm unjam-font-medium unjam-text-red-800">
              {error.title}
            </h3>
            <div className="unjam-mt-1 unjam-text-sm unjam-text-red-700">
              {error.message}
            </div>
          </div>
        </div>
        {onDismiss && (
          <div className="unjam-ml-auto unjam-pl-3">
            <div className="-unjam-mx-1.5 -unjam-my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className="unjam-inline-flex unjam-rounded-md unjam-bg-red-50 unjam-p-1.5 unjam-text-red-500 hover:unjam-bg-red-100 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-offset-red-50 focus:unjam-ring-red-600 unjam-transition-colors"
              >
                <span className="unjam-sr-only">Dismiss</span>
                <X className="unjam-h-3 unjam-w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;
