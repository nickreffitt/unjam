import React from 'react';
import ExtensionContainer from '@extension/ExtensionContainer/ExtensionContainer';
import '@extension/styles.css';

/**
 * CustomerExtension is the web page version of the extension
 * It reuses the ExtensionContainer component to provide the same UI
 * as the browser extension, but displayed on a dedicated webpage
 */
const CustomerExtension: React.FC = () => {
  return (
    <div className="unjam-min-h-screen unjam-bg-gray-100 unjam-flex unjam-items-center unjam-justify-center unjam-font-sans">
      <div className="unjam-text-center">
        <h1 className="unjam-text-3xl unjam-font-bold unjam-text-gray-800 unjam-mb-8">
          Customer Support
        </h1>
        <p className="unjam-text-gray-600 unjam-mb-4">
          Click the floating button in the bottom-left corner to create a ticket
        </p>
      </div>

      {/* Reuse ExtensionContainer for consistent UI */}
      <ExtensionContainer />
    </div>
  );
};

export default CustomerExtension;