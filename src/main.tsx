import '@fontsource-variable/roboto-mono'
import './styles/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/app'
import { startTransport } from './app/bootstrap'

// Kick off the network layer first; the UI renders right away and its requests
// wait for the transport inside the HTTP client.
void startTransport()

const container = document.getElementById('root')
if (!container) throw new Error('Root container #root not found')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
