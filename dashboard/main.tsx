import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from '@dashboard/Dashboard'
import '@dashboard/styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/">
      <Dashboard />
    </BrowserRouter>
  </React.StrictMode>,
)