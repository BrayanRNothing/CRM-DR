/**
 * useApiCache.js — Hook de caché local con patrón Stale-While-Revalidate
 *
 * Comportamiento:
 * 1. Primera visita: muestra spinner mientras carga de la API
 * 2. Visitas siguientes: muestra datos del caché INSTANTÁNEAMENTE mientras recarga en background
 * 3. Si los datos en caché son frescos (< TTL), NO hace petición a la API
 * 4. Si los datos vencieron, los muestra igual (stale) mientras recarga en background
 *
 * Uso:
 *   const { data, loading, backgroundLoading, error, refresh } = useApiCache(
 *     'dashboard-vendedor',         // clave única del caché
 *     () => axios.get('/api/...'),  // función fetcher async que retorna la data
 *     { ttl: 60, staleWhileRevalidate: true }
 *   );
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const CACHE_PREFIX = 'crm_cache:';

/**
 * Lee del sessionStorage de forma segura.
 * @param {string} key
 * @returns {{ data: any, timestamp: number }|null}
 */
const readStorage = (key) => {
    try {
        const raw = sessionStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

/**
 * Escribe en sessionStorage de forma segura.
 * @param {string} key
 * @param {any} data
 */
const writeStorage = (key, data) => {
    try {
        sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch {
        // sessionStorage puede estar lleno o bloqueado — ignorar silenciosamente
    }
};

/**
 * Elimina una clave del caché local.
 * @param {string} key
 */
export const clearCacheKey = (key) => {
    try {
        sessionStorage.removeItem(CACHE_PREFIX + key);
    } catch {
        // ignorar
    }
};

/**
 * Elimina todas las claves que empiecen con un prefijo.
 * @param {string} prefix
 */
export const clearCacheByPrefix = (prefix) => {
    try {
        const keysToDelete = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            if (k && k.startsWith(CACHE_PREFIX + prefix)) {
                keysToDelete.push(k);
            }
        }
        keysToDelete.forEach(k => sessionStorage.removeItem(k));
    } catch {
        // ignorar
    }
};

/**
 * Hook principal de caché con stale-while-revalidate.
 *
 * @param {string} cacheKey - Clave única para identificar estos datos en caché
 * @param {Function} fetcher - Función async que obtiene los datos. Debe retornar la data directamente.
 * @param {Object} options
 * @param {number} [options.ttl=60] - Tiempo en segundos antes de considerar el caché vencido
 * @param {boolean} [options.staleWhileRevalidate=true] - Si true, muestra datos viejos mientras recarga
 * @param {boolean} [options.enabled=true] - Si false, no hace fetch (para cargas condicionales)
 * @param {any[]} [options.deps=[]] - Dependencias que fuerzan un refresh cuando cambian (como useEffect deps)
 * @returns {{ data: any, loading: boolean, backgroundLoading: boolean, error: any, refresh: Function }}
 */
const useApiCache = (cacheKey, fetcher, options = {}) => {
    const {
        ttl = 60,
        staleWhileRevalidate = true,
        enabled = true,
        deps = []
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);          // Carga inicial (bloquea UI)
    const [backgroundLoading, setBackgroundLoading] = useState(false); // Carga silenciosa
    const [error, setError] = useState(null);
    const fetcherRef = useRef(fetcher);
    const isMounted = useRef(true);

    // Siempre apuntar al fetcher más reciente sin re-suscribirse
    useEffect(() => {
        fetcherRef.current = fetcher;
    });

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const fetchData = useCallback(async (isBackground = false) => {
        if (!enabled) return;

        try {
            if (isBackground) {
                setBackgroundLoading(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const result = await fetcherRef.current();

            if (!isMounted.current) return;

            setData(result);
            writeStorage(cacheKey, result);
        } catch (err) {
            if (!isMounted.current) return;
            setError(err);
            console.error(`[useApiCache] Error fetching "${cacheKey}":`, err?.message || err);
        } finally {
            if (!isMounted.current) return;
            setLoading(false);
            setBackgroundLoading(false);
        }
    }, [cacheKey, enabled]);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        const cached = readStorage(cacheKey);
        const now = Date.now();
        const isFresh = cached && (now - cached.timestamp) < ttl * 1000;
        const isStale = cached && !isFresh;

        if (isFresh) {
            // Datos frescos: mostrar instantáneamente, sin fetch
            setData(cached.data);
            setLoading(false);
            return;
        }

        if (isStale && staleWhileRevalidate) {
            // Datos vencidos: mostrar inmediatamente y recargar en background
            setData(cached.data);
            setLoading(false);
            fetchData(true); // background
            return;
        }

        // Sin caché o staleWhileRevalidate=false: carga normal con spinner
        fetchData(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cacheKey, ttl, enabled, staleWhileRevalidate, ...deps]);

    /**
     * Fuerza un refresh desde la API.
     * @param {boolean} isBackground - Si true, recarga en background sin spinner.
     */
    const refresh = useCallback((isBackground = false) => {
        if (!isBackground) {
            clearCacheKey(cacheKey);
        }
        fetchData(isBackground);
    }, [cacheKey, fetchData]);

    return { data, loading, backgroundLoading, error, refresh };
};

export default useApiCache;
