// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { getUser } from '../utils/authUtils';

/**
 * Componente para proteger rutas privadas
 * Verifica autenticación y rol del usuario
 */
const ProtectedRoute = ({ children, requiredRole }) => {
    const user = getUser();

    // Si no hay usuario, redirige al login
    if (!user) {
        return <Navigate to="/" replace />;
    }

    // Si se especifica un rol requerido, verificar que coincida
    if (requiredRole && user.rol !== requiredRole) {
        // Redirige a la página correspondiente según su rol
        const roleRoutes = {
            admin: '/admin',
            tecnico: '/tecnico',
            distribuidor: '/distribuidor',
            usuario: '/usuario',
        };
        return <Navigate to={roleRoutes[user.rol] || '/'} replace />;
    }

    // Usuario autenticado con rol correcto
    return children;
};

export default ProtectedRoute;
