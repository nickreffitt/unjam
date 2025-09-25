import React from 'react';
import ReactDOM from 'react-dom/client';

const OptionsApp = () => {
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Engineer Dashboard</h1>
      <p>This is the browser extension options page for engineers.</p>
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button onClick={() => console.log('View new tickets')}>
          New Tickets
        </button>
        <button onClick={() => console.log('View active tickets')}>
          Active Tickets
        </button>
        <button onClick={() => console.log('View completed tickets')}>
          Completed Tickets
        </button>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
);