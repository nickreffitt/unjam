import { useEffect, useRef } from 'react';
import { ChatListener, type ChatListenerCallbacks } from '@common/features/ChatManager/events';

/**
 * Hook that listens to global chat events via window events
 * This hook uses the ChatListener class to manage window event subscriptions
 *
 * @param callbacks - Partial listener implementation with only the events you care about
 *
 * @example
 * ```tsx
 * useChatListener({
 *   onChatMessageReceived: (message) => {
 *     console.log('New message received:', message);
 *     refetchMessages();
 *   },
 *   onChatMessagesRead: (messageIds, ticketId) => {
 *     console.log('Messages marked as read:', messageIds);
 *     updateReadStatus();
 *   }
 * });
 * ```
 */
export function useChatListener(callbacks: Partial<ChatListenerCallbacks>): void {
  // Create a ChatListener instance and keep it stable across re-renders
  const chatListenerRef = useRef<ChatListener | null>(null);

  useEffect(() => {
    // Create the listener on first render
    if (!chatListenerRef.current) {
      chatListenerRef.current = new ChatListener(callbacks);
      chatListenerRef.current.startListening();
    } else {
      // Update callbacks on subsequent renders
      chatListenerRef.current.updateCallbacks(callbacks);
    }

    // Cleanup on unmount
    return () => {
      if (chatListenerRef.current) {
        chatListenerRef.current.stopListening();
        chatListenerRef.current = null;
      }
    };
  }, [callbacks]);
}