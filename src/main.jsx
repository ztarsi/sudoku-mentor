import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// Offline play of the built-in library: the service worker caches the app
// shell and hashed assets, never the platform API. Production only, so a
// dev server is never served from a stale cache.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker not registered:', error?.message || error);
    });
  });
}
