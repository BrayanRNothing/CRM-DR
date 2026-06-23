/**
 * cache.js — Caché en memoria de alto rendimiento para el CRM
 *
 * Usa un Map nativo de Node.js. No requiere dependencias externas.
 * Diseñado para cachear respuestas costosas de PostgreSQL por usuario,
 * con TTL por entrada e invalidación inteligente al mutar datos.
 */

const store = new Map(); // key → { data, expiresAt }

/**
 * Lee del caché. Retorna null si no existe o expiró.
 * @param {string} key
 * @returns {any|null}
 */
const getCache = (key) => {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
    }
    return entry.data;
};

/**
 * Escribe en el caché con un TTL en segundos.
 * @param {string} key
 * @param {any} data
 * @param {number} ttlSeconds
 */
const setCache = (key, data, ttlSeconds = 60) => {
    store.set(key, {
        data,
        expiresAt: Date.now() + ttlSeconds * 1000
    });
};

/**
 * Elimina una clave exacta del caché.
 * @param {string} key
 */
const deleteCache = (key) => {
    store.delete(key);
};

/**
 * Invalida todas las entradas cuya clave contenga el prefijo dado.
 * Útil para borrar todas las entradas de un usuario: invalidateByPrefix('user:123:')
 * @param {string} prefix
 */
const invalidateByPrefix = (prefix) => {
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
            store.delete(key);
        }
    }
};

/**
 * Invalida todo el caché relacionado con un usuario específico.
 * Llamar al crear/editar/eliminar prospectos, actividades, ventas, etc.
 * @param {number|string} userId
 */
const invalidateUserCache = (userId) => {
    invalidateByPrefix(`user:${userId}:`);
};

/**
 * Invalida el caché de todos los miembros de un equipo.
 * Útil cuando un evento afecta a todo el equipo (nuevo prospecto compartido).
 * @param {number|string} equipoId
 * @param {number[]|string[]} memberIds
 */
const invalidateTeamCache = (equipoId, memberIds = []) => {
    invalidateByPrefix(`equipo:${equipoId}:`);
    for (const id of memberIds) {
        invalidateUserCache(id);
    }
};

/**
 * Retorna estadísticas del caché para debugging.
 */
const getCacheStats = () => {
    let valid = 0, expired = 0;
    const now = Date.now();
    for (const [, entry] of store.entries()) {
        if (now > entry.expiresAt) expired++;
        else valid++;
    }
    return { total: store.size, valid, expired };
};

/**
 * Limpieza periódica de entradas expiradas para evitar memory leaks.
 * Se ejecuta cada 5 minutos automáticamente.
 */
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of store.entries()) {
        if (now > entry.expiresAt) {
            store.delete(key);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        console.log(`🧹 Cache cleanup: ${cleaned} entradas expiradas eliminadas. Activas: ${store.size}`);
    }
}, 5 * 60 * 1000);

module.exports = {
    getCache,
    setCache,
    deleteCache,
    invalidateByPrefix,
    invalidateUserCache,
    invalidateTeamCache,
    getCacheStats
};
