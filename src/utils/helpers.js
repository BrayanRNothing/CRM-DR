import API_URL from '../config/api';

export const getSafeUrl = (ruta) => {
    if (!ruta) return '';
    // Si viene en array, sacar el primero
    let path = Array.isArray(ruta) ? ruta[0] : ruta;
    if (typeof path !== 'string') return '';

    // Si ya es absoluta, devolverla
    if (path.startsWith('http')) return path;

    // Limpiar slashes duplicados
    const baseUrl = API_URL.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    return `${baseUrl}/${cleanPath}`;
};
