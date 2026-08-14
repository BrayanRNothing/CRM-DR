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
    localStorage.removeItem('google_access_token'); // Clear Google token too
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

/**
 * Guarda una cuenta para recordar el inicio de sesión
 */
export const saveUserToRemember = (user) => {
    try {
        let savedAccounts = JSON.parse(localStorage.getItem('savedAccounts')) || [];
        // Evitar duplicados
        savedAccounts = savedAccounts.filter(acc => acc.usuario !== user.usuario);
        
        savedAccounts.unshift({
            usuario: user.usuario,
            nombre: user.nombre || user.nombre_completo || user.usuario,
            avatar: user.foto || user.avatar || user.avatar_url || null,
            password_saved: user.password_saved || null
        });
        
        // Limitar a 3 cuentas guardadas por ejemplo
        if (savedAccounts.length > 3) savedAccounts.pop();
        
        localStorage.setItem('savedAccounts', JSON.stringify(savedAccounts));
    } catch (error) {
        console.error('Error al guardar cuenta para recordar:', error);
    }
};

/**
 * Obtiene las cuentas guardadas
 */
export const getSavedAccounts = () => {
    try {
        return JSON.parse(localStorage.getItem('savedAccounts')) || [];
    } catch {
        return [];
    }
};

/**
 * Elimina una cuenta guardada
 */
export const removeSavedAccount = (usuario) => {
    try {
        let savedAccounts = JSON.parse(localStorage.getItem('savedAccounts')) || [];
        savedAccounts = savedAccounts.filter(acc => acc.usuario !== usuario);
        localStorage.setItem('savedAccounts', JSON.stringify(savedAccounts));
    } catch (error) {
        console.error('Error al eliminar cuenta guardada:', error);
    }
};

