// Placeholder API configurations
// Replace this with your actual backend URL when you connect your API
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://crmupdm-production.up.railway.app';

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
