import React, { useState } from 'react';
import { Calendar, Phone, MessageSquare, User, CheckCircle2, AlertCircle, Zap, Trash2 } from 'lucide-react';

/**
 * COMPONENTE MEJORADO: HistorialInteracciones
 * 
 * Muestra el timeline completo de un prospecto/cliente con claridad sobre:
 * - Quién registró cada interacción (prospector vs closer)
 * - Cambios de etapa
 * - Fecha y hora exactas
 * - Rol del vendedor
 */

export const HistorialInteracciones = ({ timeline = [], esProspector = true, onDeleteActividad }) => {
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [deletingId, setDeletingId] = useState(null);

    const handleDelete = async (item) => {
        if (!onDeleteActividad) return;
        if (!window.confirm(`¿Eliminar esta ${item.tipoActividad || 'actividad'} registrada el ${new Date(item.fecha).toLocaleDateString('es-MX')}? Esta acción no se puede deshacer.`)) return;
        setDeletingId(item.id);
        try {
            await onDeleteActividad(item.id);
        } finally {
            setDeletingId(null);
        }
    };

    // Mapeo de iconos por tipo de evento
    const getIcon = (item) => {
        if (item.tipo === 'cambio_etapa') {
            return <Zap className="w-5 h-5 text-amber-500" />;
        }

        switch (item.tipoActividad) {
            case 'llamada':
                return item.resultado === 'exitoso'
                    ? <Phone className="w-5 h-5 text-green-500" />
                    : <Phone className="w-5 h-5 text-red-500" />;
            case 'cita':
                return <Calendar className="w-5 h-5 text-blue-500" />;
            case 'whatsapp':
            case 'mensaje':
                return <MessageSquare className="w-5 h-5 text-emerald-500" />;
            case 'correo':
                return <AlertCircle className="w-5 h-5 text-purple-500" />;
            default:
                return <CheckCircle2 className="w-5 h-5 text-slate-500" />;
        }
    };

    // Etiqueta legible del tipo
    const getLabel = (item) => {
        if (item.tipo === 'cambio_etapa') {
            const etapaLabels = {
                prospecto_nuevo: '🆕 Prospecto nuevo',
                en_contacto: '📞 En contacto',
                reunion_agendada: '📅 Reunión agendada',
                reunion_realizada: '✓ Reunión realizada',
                en_negociacion: '💼 En negociación',
                venta_ganada: '🏆 Venta ganada',
                perdido: '❌ Perdido'
            };
            return etapaLabels[item.etapa] || item.etapa;
        }

        // Para actividades tipo 'cita', mostrar la descripcion detallada del backend como título principal
        if (item.tipoActividad === 'cita') {
            if (item.resultado === 'pendiente') return '📅 Cita Agendada';
            if (item.descripcion) {
                const desc = item.descripcion;
                if (desc.includes('no asistió') || desc.includes('No asistió')) return '❌ ' + desc;
                if (desc.includes('Venta cerrada') || desc.includes('¡Venta')) return '🎉 ' + desc;
                if (desc.includes('cotización') || desc.includes('Cotización')) return '💰 ' + desc;
                if (desc.includes('otra reunión') || desc.includes('Otra reunión')) return '📅 ' + desc;
                if (desc.includes('No le interesó') || desc.includes('no le interesó')) return '😐 ' + desc;
                return '📅 ' + desc;
            }
            if (item.resultado === 'exitoso') return '✅ Reunión Realizada';
            if (item.resultado === 'fallido') return '❌ Reunión — Cliente no asistió';
            return '📅 Reunión';
        }

        const tipoLabels = {
            llamada: 'Llamada',
            whatsapp: 'WhatsApp',
            mensaje: 'Mensaje',
            correo: 'Correo',
            cliente: 'Convertido a Cliente',
            prospecto: 'Prospecto'
        };

        return tipoLabels[item.tipoActividad] || item.tipoActividad;
    };

    // Resultado legible para citas (evita mostrar 'exitoso'/'fallido' crudo)
    const getResultadoLegible = (item) => {
        if (item.tipoActividad !== 'cita') return item.resultado;
        if (item.resultado === 'pendiente') return 'Pendiente';
        if (item.resultado === 'exitoso') return 'Reunión realizada';
        if (item.resultado === 'fallido') return 'No asistió';
        if (item.resultado === 'convertido') return 'Venta cerrada';
        return item.resultado;
    };

    // Badge del rol
    const getRolBadge = (item) => {
        if (item.tipo === 'cambio_etapa') {
            return <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">Sistema</span>;
        }

        const esProspectorActividad = item.vendedorRol === 'prospector';

        return esProspectorActividad ? (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">🎯 Prospector</span>
        ) : (
            <span className="text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-semibold">🏁 Closer</span>
        );
    };

    // Formatear fecha
    const formatFecha = (fecha) => {
        const d = new Date(fecha);
        return d.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Filtrar timeline
    const timelineFiltered = filtroTipo === 'todos'
        ? timeline
        : timeline.filter(item => {
            if (filtroTipo === 'etapas') return item.tipo === 'cambio_etapa';
            if (filtroTipo === 'reuniones') return item.tipoActividad === 'cita';
            if (filtroTipo === 'llamadas') return item.tipoActividad === 'llamada';
            if (filtroTipo === 'prospector') return item.vendedorRol === 'prospector';
            if (filtroTipo === 'closer') return item.vendedorRol === 'closer';
            return item.tipoActividad === filtroTipo;
        });

    // Contar reuniones reales (solo actividades tipo 'cita', no cambios de etapa)
    const totalReuniones = timeline.filter(i => i.tipoActividad === 'cita').length;

    if (timeline.length === 0) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Sin interacciones registradas aún</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                    onClick={() => setFiltroTipo('todos')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filtroTipo === 'todos'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                >
                    Todos ({timeline.length})
                </button>
                <button
                    onClick={() => setFiltroTipo('etapas')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filtroTipo === 'etapas'
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                >
                    📊 Etapas
                </button>
                <button
                    onClick={() => setFiltroTipo('prospector')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filtroTipo === 'prospector'
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                >
                    🎯 Prospector
                </button>
                <button
                    onClick={() => setFiltroTipo('closer')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filtroTipo === 'closer'
                            ? 'bg-teal-500 text-white'
                            : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                        }`}
                >
                    🏁 Closer
                </button>
                <button
                    onClick={() => setFiltroTipo('reuniones')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filtroTipo === 'reuniones'
                            ? 'bg-indigo-500 text-white'
                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        }`}
                >
                    📅 Reuniones ({totalReuniones})
                </button>
                <button
                    onClick={() => setFiltroTipo('llamadas')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filtroTipo === 'llamadas'
                            ? 'bg-green-500 text-white'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                >
                    📞 Llamadas
                </button>
            </div>

            {/* Timeline */}
            <div className="space-y-3 border-l-2 border-slate-200 pl-4">
                {timelineFiltered.length === 0 ? (
                    <div className="text-slate-500 text-sm py-4">
                        No hay actividades de este tipo
                    </div>
                ) : (
                    timelineFiltered.map((item, idx) => (
                        <div key={idx} className="relative">
                            {/* Punto en la línea */}
                            <div className="absolute -left-[28px] w-4 h-4 bg-white border-2 border-slate-300 rounded-full mt-1.5"></div>

                            {/* Card del evento */}
                            <div className={`bg-white border rounded-xl p-4 transition-all hover:shadow-md ${item.tipo === 'cambio_etapa'
                                    ? 'border-amber-200 bg-amber-50'
                                    : item.tipoActividad === 'cita' && item.resultado !== 'pendiente'
                                        ? item.descripcion?.includes('no asistió') || item.descripcion?.includes('No asistió')
                                            ? 'border-red-200 bg-red-50'
                                            : item.descripcion?.includes('Venta cerrada') || item.descripcion?.includes('¡Venta')
                                                ? 'border-green-200 bg-green-50'
                                                : item.descripcion?.includes('cotización')
                                                    ? 'border-indigo-200 bg-indigo-50'
                                                    : item.descripcion?.includes('otra reunión')
                                                        ? 'border-yellow-200 bg-yellow-50'
                                                        : item.descripcion?.includes('No le interesó')
                                                            ? 'border-gray-200 bg-gray-50'
                                                            : 'border-teal-200 bg-teal-50'
                                        : item.vendedorRol === 'prospector'
                                            ? 'border-blue-200 bg-blue-50'
                                            : 'border-teal-200 bg-teal-50'
                                }`}>
                                {/* Encabezado */}
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="p-2 rounded-lg bg-white">
                                            {getIcon(item)}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-900">
                                                {getLabel(item)}
                                            </h4>
                                            {item.tipo !== 'cambio_etapa' && item.vendedorNombre && (
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Por: <span className="font-medium">{item.vendedorNombre}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getRolBadge(item)}
                                        {item.tipo !== 'cambio_etapa' && onDeleteActividad && (
                                            <button
                                                onClick={() => handleDelete(item)}
                                                disabled={deletingId === item.id}
                                                title="Eliminar actividad"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Contenido */}
                                <div className="space-y-2 text-sm">
                                    {item.tipo === 'cambio_etapa' && item.descripcion && (
                                        <p className="text-slate-700 italic">{item.descripcion}</p>
                                    )}

                                    {item.tipo !== 'cambio_etapa' && item.descripcion && (
                                        <p className="text-slate-700">{item.descripcion}</p>
                                    )}

                                    {item.resultado && item.tipo !== 'cambio_etapa' && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">Resultado:</span>
                                            <span className={`text-xs font-semibold px-2 py-1 rounded ${item.resultado === 'exitoso' || item.resultado === 'convertido'
                                                    ? 'bg-green-100 text-green-700'
                                                    : item.resultado === 'fallido'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {getResultadoLegible(item)}
                                            </span>
                                        </div>
                                    )}

                                    {item.notas && (
                                        <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                                            <p className="text-xs text-slate-600">
                                                📝 <em>"{item.notas}"</em>
                                            </p>
                                        </div>
                                    )}

                                    {/* Fecha */}
                                    <p className="text-xs text-slate-400 pt-1 border-t border-slate-200">
                                        {formatFecha(item.fecha)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Resumen */}
            <div className="pt-4 border-t border-slate-200">
                <div className="grid grid-cols-4 gap-3 text-sm">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-blue-600 font-semibold mb-1">Del Prospector</p>
                        <p className="text-xl font-bold text-blue-700">
                            {timeline.filter(i => i.vendedorRol === 'prospector').length}
                        </p>
                    </div>
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-teal-600 font-semibold mb-1">Del Closer</p>
                        <p className="text-xl font-bold text-teal-700">
                            {timeline.filter(i => i.vendedorRol === 'closer').length}
                        </p>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-indigo-600 font-semibold mb-1">Reuniones</p>
                        <p className="text-xl font-bold text-indigo-700">
                            {totalReuniones}
                        </p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-amber-600 font-semibold mb-1">Cambios de Etapa</p>
                        <p className="text-xl font-bold text-amber-700">
                            {timeline.filter(i => i.tipo === 'cambio_etapa').length}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HistorialInteracciones;
