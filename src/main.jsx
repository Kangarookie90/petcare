import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { inizializzaSync } from './syncService.js'
import { Analytics } from '@vercel/analytics/react'

// Avvia sync all'avvio dell'app
inizializzaSync();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)