import React from 'react';
import ReactDOM from 'react-dom/client';

const PopupApp = () => {
  return (
    <div style={{ padding: '20px', minWidth: '300px' }}>
      <h1>Customer Extension</h1>
      <p>This is the browser extension popup for customer support.</p>
      <button onClick={() => console.log('Create ticket clicked')}>
        Create New Ticket
      </button>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);