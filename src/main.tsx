import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import AuthGate from './components/AuthGate'
import 'leaflet/dist/leaflet.css'
import './index.css'

// Without this, a new deployment updates the service worker in the
// background, but a tab/app instance you already had open keeps running
// the old JS until you manually close and reopen it — easy to test against
// a stale build without realizing it. Reloading once the new one takes
// over means there's always exactly one version in play: whatever's
// actually live. onNeedRefresh plus a raw controllerchange listener as a
// belt-and-suspenders pair, since exactly which fires can vary.
let reloaded = false
function reloadOnce() {
  if (reloaded) return
  reloaded = true
  window.location.reload()
}
registerSW({ immediate: true, onNeedRefresh: reloadOnce })
navigator.serviceWorker?.addEventListener('controllerchange', reloadOnce)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </React.StrictMode>
)
