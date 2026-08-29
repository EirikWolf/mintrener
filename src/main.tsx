import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { migrateWorkoutHistoryKeys } from './services/workoutHistoryStorage'
import './index.css'

// Flytt lokal historikk fra utdaterte nøkler før noe leser den
migrateWorkoutHistoryKeys()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
