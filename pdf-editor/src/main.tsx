import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { CompatibilityWarning } from '@/components/UI/CompatibilityWarning'
import { checkBrowserCompatibility } from '@/utils/browserCompat'
import './index.css'

// ─── Browser Compatibility Check ─────────────────────────────────────────────
// Run before mounting the app. If required APIs are missing, show the
// CompatibilityWarning and do NOT mount the full application.
const compatResult = checkBrowserCompatibility()

const rootElement = document.getElementById('root')!

if (!compatResult.compatible) {
  // Render only the compatibility warning — no React Router, no app
  createRoot(rootElement).render(
    <StrictMode>
      <CompatibilityWarning result={compatResult} />
    </StrictMode>
  )
} else {
  // Compatible browser — mount the full application
  // Apply theme class immediately before first render to avoid flash
  const storedTheme = localStorage.getItem('pdf-editor-theme')
  if (storedTheme) {
    try {
      const parsed = JSON.parse(storedTheme) as { state?: { theme?: string } }
      const theme = parsed?.state?.theme
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else if (theme === 'system') {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark')
        }
      }
    } catch {
      // Ignore malformed localStorage entry
    }
  }

  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  )
}
