import { useState } from 'axios';
import axios from 'axios';

/**
 * Hook: useHistorialCompleto
 * 
 * Carga el historial completo de un cliente/prospecto con acceso a actividades
 * de AMBOS (prospector y closer)
 */

export const useHistorialCompleto = (clienteId, rolPath) => {
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const cargarHistorial = async (token) => {
        if (!clienteId || !token) return;

        setLoading(true);
        setError(null);
        try {
            // Intentar con el nuevo endpoint de historial completo
            const endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/${rolPath}/prospecto/${clienteId}/historial-completo`;
            
            const response = await axios.get(endpoint, {
                headers: { 'x-auth-token': token }
            });

            if (response.data?.timeline) {
                setTimeline(response.data.timeline);
                return response.data;
            } else {
                setError('Formato de respuesta inválido');
                return null;
            }
        } catch (err) {
            console.error('Error al cargar historial:', err);
            setError(err.response?.data?.msg || 'Error al cargar el historial');
            setTimeline([]);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        timeline,
        loading,
        error,
        cargarHistorial
    };
};

export default useHistorialCompleto;
