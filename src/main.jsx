import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { inizializzaSync } from './syncService.js'
import { inject } from '@vercel/analytics'

// Avvia analytics
inject()

// Avvia sync all'avvio dell'app
inizializzaSync();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)