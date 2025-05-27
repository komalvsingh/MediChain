import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import React from "react";
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { MediChainProvider } from './context/BlockChainContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MediChainProvider>
          <App />
        </MediChainProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
