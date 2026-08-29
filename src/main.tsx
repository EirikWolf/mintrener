import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { applyPersonaAccent } from './services/coachPersonaService'
import './index.css'

// B6.1: sett persona-aksentfargen (--persona-accent) fra lagret persona-valg
// før første render, slik at fokusmodus aldri blinker fra fallback til aksent.
applyPersonaAccent()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
