import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

// Initialize theme from localStorage before first render to prevent flash
const stored = localStorage.getItem('email-builder-theme')
if (stored) {
  try {
    const parsed = JSON.parse(stored)
    if (parsed.state?.theme) {
      document.documentElement.setAttribute('data-theme', parsed.state.theme)
    }
  } catch {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
} else {
  document.documentElement.setAttribute('data-theme', 'dark')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
