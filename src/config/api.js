// Placeholder API configurations
// Replace this with your actual backend URL when you connect your API
import axios from 'axios';

const rawEnvApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

const normalizeBaseUrl = (url) => (url || '').replace(/\/+$/, '');

// In Railway production we serve frontend + backend from the same host.
// This prevents stale env values (e.g. old domains) from breaking auth calls.
const forceSameOriginHosts = new Set(['crm-dr-production.up.railway.app']);
const API_URL = forceSameOriginHosts.has(currentHost)
    ? normalizeBaseUrl(currentOrigin)
    : normalizeBaseUrl(rawEnvApiUrl || currentOrigin || 'https://crm-dr-production.up.railway.app');

// Global interceptor: auto-logout when token is expired or invalid  
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const code = error.response.data?.code;
            const isLoginRoute = error.config?.url?.includes('/api/auth/login');
            if (!isLoginRoute) {
                // Clear session
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                // Redirect to login only if not already there
                if (window.location.pathname !== '/') {
                    const msg = code === 'TOKEN_EXPIRED'
                        ? 'Tu sesión ha expirado. Por favor inicia sesión de nuevo.'
                        : 'Sesión inválida. Por favor inicia sesión.';
                    window.location.href = `/?expired=1&msg=${encodeURIComponent(msg)}`;
                }
            }
        }
        return Promise.reject(error);
    }
);

export default API_URL;
