// src/utils/authUtils.js
// Utilidades centralizadas para autenticación

/**
 * Obtiene el usuario actual desde localStorage o sessionStorage
 * @returns {Object|null} Usuario o null si no hay sesión
 */
export const getUser = () => {
    try {
        // Primero intenta localStorage (sesión persistente)
        const localUser = localStorage.getItem('user');
        if (localUser) {
            return JSON.parse(localUser);
        }

        // Luego intenta sessionStorage (sesión temporal)
        const sessionUser = sessionStorage.getItem('user');
        if (sessionUser) {
            return JSON.parse(sessionUser);
        }

        return null;
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        return null;
    }
};

/**
 * Verifica si hay una sesión activa
 * @returns {boolean} true si hay sesión activa
 */
export const isAuthenticated = () => {
    return getUser() !== null;
};

/**
 * Cierra la sesión del usuario
 * Limpia tanto localStorage como sessionStorage
 */
export const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
};

/**
 * Obtiene el token de autenticación
 */
export const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
};

/**
 * Guarda el token de autenticación
 */
export const saveToken = (token, remember = false) => {
    if (remember) {
        localStorage.setItem('token', token);
    } else {
        sessionStorage.setItem('token', token);
    }
};

/**
 * Guarda el usuario en el storage apropiado
 * @param {Object} user - Datos del usuario
 * @param {boolean} remember - Si debe recordar la sesión
 */
export const saveUser = (user, remember = false) => {
    const userData = JSON.stringify(user);

    if (remember) {
        localStorage.setItem('user', userData);
    } else {
        sessionStorage.setItem('user', userData);
    }
};
