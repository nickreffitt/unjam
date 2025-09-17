import React, { useRef } from 'react';
import ChatBox, { type ChatBoxRef } from '@dashboard/ChatBox/ChatBox';
import { type CustomerProfile } from '@common/types';

const ChatBoxDemo: React.FC = () => {
  const chatBoxRef = useRef<ChatBoxRef>(null);

  // Mock customer profile for demo
  const mockCustomer: CustomerProfile = {
    id: 'customer-demo',
    name: 'John Doe',
    type: 'customer',
    email: 'john.doe@example.com'
  };

  const generateRandomMessage = () => {
    const words = [
      'hello', 'there', 'how', 'are', 'you', 'doing', 'today', 'I', 'have', 'a', 'problem', 'with', 'my', 'computer',
      'the', 'screen', 'is', 'not', 'working', 'properly', 'can', 'you', 'help', 'me', 'please', 'it', 'seems', 'like',
      'something', 'went', 'wrong', 'when', 'I', 'was', 'trying', 'to', 'install', 'the', 'new', 'software', 'update',
      'also', 'my', 'keyboard', 'might', 'be', 'broken', 'some', 'keys', 'do', 'not', 'respond', 'correctly', 'thanks',
      'for', 'your', 'time', 'and', 'patience', 'this', 'has', 'been', 'very', 'frustrating', 'hope', 'we', 'can',
      'resolve', 'this', 'issue', 'soon', 'best', 'regards', 'looking', 'forward', 'to', 'hearing', 'from', 'you'
    ];

    try {
      const messageLength = Math.floor(Math.random() * 48) + 3; // 3 to 50 words
      const selectedWords = [];

      for (let i = 0; i < messageLength; i++) {
        const randomIndex = Math.floor(Math.random() * words.length);
        const selectedWord = words[randomIndex];
        if (selectedWord) {
          selectedWords.push(selectedWord);
        }
      }

      if (selectedWords.length === 0) {
        return 'Hello, I need help with my computer.';
      }

      return `${selectedWords.join(' ')}.`;
    } catch (error) {
      console.error('Error generating random message:', error);
      return 'Hello, I need help with my computer.';
    }
  };

  const handleSendRandomMessage = () => {
    const randomMessage = generateRandomMessage();
    console.debug('Generated message:', randomMessage);

    if (randomMessage && typeof randomMessage === 'string') {
      // Use the injectCustomerMessage method to inject a test message
      if (chatBoxRef.current) {
        chatBoxRef.current.injectCustomerMessage(randomMessage);
      }
    } else {
      console.error('Failed to generate valid message:', randomMessage);
    }
  };

  return (
    <div className="unjam-min-h-screen unjam-bg-gray-100 unjam-p-8">
      <div className="unjam-max-w-2xl unjam-mx-auto">
        <h1 className="unjam-text-2xl unjam-font-bold unjam-text-gray-900 unjam-mb-6">
          Chat Demo
        </h1>

        {/* Debug Controls */}
        <div className="unjam-mb-6 unjam-p-4 unjam-bg-white unjam-rounded-lg unjam-shadow-sm unjam-border unjam-border-gray-200">
          <h3 className="unjam-font-semibold unjam-mb-3 unjam-text-gray-900">Debug Controls</h3>
          <button
            onClick={handleSendRandomMessage}
            className="unjam-bg-blue-600 hover:unjam-bg-blue-700 unjam-text-white unjam-font-medium unjam-py-2 unjam-px-4 unjam-rounded unjam-transition-colors"
          >
            Send Random Customer Message (3-50 words)
          </button>
        </div>

        <div className="unjam-h-[600px]">
          <ChatBox
            ref={chatBoxRef}
            ticketId="DEMO-123"
            receiverName="John Doe"
            receiverProfile={mockCustomer}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatBoxDemo;