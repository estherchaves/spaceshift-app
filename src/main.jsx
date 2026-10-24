import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@/styles/tokens.css'
import '@/styles/base.css'
import App from '@/app/App.jsx'
import { watchInstallState } from '@/app/pwaStore.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

watchInstallState()
// O service worker só existe no build: em desenvolvimento a cache atrapalharia.
if (import.meta.env.PROD) import('@/app/registerPwa.js').then(({ registerPwa }) => registerPwa())
