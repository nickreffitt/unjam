import { type UserProfile } from '@common/types';

interface TypingIndicatorProps {
  user: UserProfile;
}

const TypingIndicator = ({ user: _user }: TypingIndicatorProps) => {
  return (
    <div className="unjam-flex unjam-justify-start" data-testid="typing-indicator">
      <div className="unjam-max-w-[70%]">
        {/* Typing indicator bubble */}
        <div className="unjam-rounded-2xl unjam-px-4 unjam-py-3 unjam-shadow-sm unjam-bg-gray-100 unjam-text-gray-900 unjam-rounded-bl-sm">
          <div className="unjam-flex unjam-gap-1">
            <div className="unjam-w-2 unjam-h-2 unjam-bg-gray-400 unjam-rounded-full unjam-animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="unjam-w-2 unjam-h-2 unjam-bg-gray-400 unjam-rounded-full unjam-animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="unjam-w-2 unjam-h-2 unjam-bg-gray-400 unjam-rounded-full unjam-animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;