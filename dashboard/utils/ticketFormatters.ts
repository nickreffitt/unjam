export const formatElapsedTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const formatTimeoutRemaining = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const formatDate = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h ago`;
};

export const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'completed':
      return {
        text: 'Completed',
        bgColor: 'unjam-bg-green-100',
        textColor: 'unjam-text-green-800',
        dotColor: 'unjam-bg-green-400'
      };
    case 'auto-completed':
      return {
        text: 'Auto Completed',
        bgColor: 'unjam-bg-green-100',
        textColor: 'unjam-text-green-700',
        dotColor: 'unjam-bg-green-400'
      };
    case 'in-progress':
      return {
        text: 'in-progress',
        bgColor: 'unjam-bg-orange-100',
        textColor: 'unjam-text-orange-800',
        dotColor: 'unjam-bg-orange-400'
      };
    case 'marked-resolved':
      return {
        text: 'waiting confirmation',
        bgColor: 'unjam-bg-yellow-100',
        textColor: 'unjam-text-yellow-800',
        dotColor: 'unjam-bg-yellow-400'
      };
    case 'waiting':
      return {
        text: 'waiting',
        bgColor: 'unjam-bg-orange-100',
        textColor: 'unjam-text-orange-800',
        dotColor: 'unjam-bg-orange-400'
      };
    default:
      return {
        text: status,
        bgColor: 'unjam-bg-gray-100',
        textColor: 'unjam-text-gray-800',
        dotColor: 'unjam-bg-gray-400'
      };
  }
};

export const getCompletionMessage = (status: string) => {
  switch (status) {
    case 'auto-completed':
      return {
        icon: '✓',
        text: 'This ticket has been completed successfully. (Auto-completed after timeout)',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800'
      };
    case 'completed':
      return {
        icon: '✓',
        text: 'This ticket has been completed successfully. Customer has confirmed the resolution.',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800'
      };
    default:
      return {
        icon: '✓',
        text: 'This ticket has been completed successfully.',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800'
      };
  }
};