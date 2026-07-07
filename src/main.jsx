import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Diagnóstico rápido (se puede borrar después)
if (googleClientId) {
  console.log(`✅ Google Client ID cargado (comienza con: ${googleClientId.substring(0, 10)}...)`);
} else {
  console.warn("❌ VITE_GOOGLE_CLIENT_ID no está definido en el entorno.");
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={googleClientId || 'dummy_client_id_to_prevent_crash'}>
        <App />
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
