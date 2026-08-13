export const ESTADOS_ENTIDAD = {
    'nuevo': { label: 'Nuevo', color: 'bg-blue-100 text-blue-700' },
    'en_contacto': { label: 'En contacto', color: 'bg-cyan-100 text-cyan-700' },
    'con_oportunidad': { label: 'Oportunidad', color: 'bg-purple-100 text-purple-700' },
    'activo': { label: 'Activo', color: 'bg-emerald-100 text-emerald-700' },
    'inactivo': { label: 'Inactivo', color: 'bg-slate-100 text-slate-700' },
    'perdido': { label: 'Perdido', color: 'bg-rose-100 text-rose-700' }
};

export const getEstadoLabel = (estado) => ESTADOS_ENTIDAD[estado]?.label || estado || 'Nuevo';
export const getEstadoColor = (estado) => ESTADOS_ENTIDAD[estado]?.color || 'bg-gray-100 text-gray-600';

/**
 * Calcula el estado actual de un prospecto o cliente.
 * 
 * @param {Object} entidad - Objeto del cliente o prospecto (p. ej. traido de la base de datos).
 * @param {Number} oportunidadesActivas - Cantidad de oportunidades activas que tiene. 
 *                                      Si no se pasa, se asume 0, a menos que entidad.oportunidadesActivas venga poblado.
 * @returns {String} El key del estado (ej. 'nuevo', 'activo', 'perdido')
 */
export const calcularEstado = (entidad, oportunidadesActivas = 0) => {
    if (!entidad) return 'nuevo';

    // 1. Estado manual 'perdido' sobreescribe todo
    if (entidad.etapaEmbudo === 'perdido' || entidad.etapaCliente === 'perdido') {
        return 'perdido';
    }

    // 2. Oportunidades activas (puede venir por parametro o dentro del objeto si el backend lo devuelve)
    const opps = oportunidadesActivas > 0 ? oportunidadesActivas : (entidad.oportunidadesActivas || 0);
    if (opps > 0) {
        return 'con_oportunidad';
    }

    // Identificar última actividad
    const ultimaAct = entidad.ultimaActFecha || 
                      entidad.fechaUltimaActividad || 
                      entidad.ultimaActividad || 
                      entidad.fechaUltimaEtapa ||
                      (entidad.interacciones?.length > 0 ? entidad.interacciones[0]?.fecha : null);

    const tieneHistorial = (entidad.interacciones && entidad.interacciones.length > 0) || entidad.ultimaActTipo;

    // 3. Evaluar actividad reciente
    if (ultimaAct) {
        const diffMs = new Date() - new Date(ultimaAct);
        const diffDias = diffMs / (1000 * 60 * 60 * 24);

        if (diffDias > 30) {
            return 'inactivo';
        }
        
        if (tieneHistorial) {
            return 'activo';
        }
    } else if (tieneHistorial) {
        return 'en_contacto';
    }

    // Si tiene un estado antiguo en BD que indique contacto, mapearlo para que no retroceda a "nuevo" visualmente
    const estadosPreviosContacto = ['en_contacto', 'reunion_agendada', 'reunion_realizada', 'en_negociacion', 'en_seguimiento'];
    if (estadosPreviosContacto.includes(entidad.etapaEmbudo) || estadosPreviosContacto.includes(entidad.etapaCliente)) {
        return 'en_contacto';
    }

    // 4. Fallback: Nuevo
    return 'nuevo';
};

export const ORDEN_ESTADO = {
    'con_oportunidad': 1,
    'activo': 2,
    'en_contacto': 3,
    'nuevo': 4,
    'inactivo': 5,
    'perdido': 99
};
