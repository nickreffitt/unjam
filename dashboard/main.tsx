import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import EngineerDashboard from '@dashboard/EngineerDashboard'
import '@dashboard/styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/app">
      <EngineerDashboard />
    </BrowserRouter>
  </React.StrictMode>,
)