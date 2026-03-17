import React, { useState } from 'react';
import { CheckSquare, Plus, Search, Calendar, AlertCircle } from 'lucide-react';

const VendedorTareas = () => {
    const [tareas, setTareas] = useState([
        {
            id: 1,
            titulo: 'Llamar a Carlos López',
            descripcion: 'Seguimiento de propuesta enviada la semana pasada',
            fechaVencimiento: '2026-02-10',
            prioridad: 'alta',
            completada: false,
            cliente: 'Carlos López - Tech Solutions SA'
        },
        {
            id: 2,
            titulo: 'Enviar propuesta a Ana Rodríguez',
            descripcion: 'Preparar cotización para nuevo proyecto',
            fechaVencimiento: '2026-02-11',
            prioridad: 'media',
            completada: false,
            cliente: 'Ana Rodríguez - Digital Corp'
        },
        {
            id: 3,
            titulo: 'Seguimiento Pedro Hernández',
            descripcion: 'Revisar avances del proyecto actual',
            fechaVencimiento: '2026-02-12',
            prioridad: 'baja',
            completada: false,
            cliente: 'Pedro Hernández - Innovate Inc'
        },
        {
            id: 4,
            titulo: 'Reunión con equipo',
            descripcion: 'Revisión semanal de objetivos',
            fechaVencimiento: '2026-02-09',
            prioridad: 'media',
            completada: true,
            cliente: null
        }
    ]);

    const [filtro, setFiltro] = useState('pendientes');
    const [busqueda, setBusqueda] = useState('');

    const getPrioridadColor = (prioridad) => {
        switch (prioridad) {
            case 'alta': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'media': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'baja': return 'bg-green-500/20 text-green-400 border-green-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const tareasFiltradas = tareas.filter(tarea => {
        const matchFiltro = filtro === 'todas' ||
            (filtro === 'pendientes' && !tarea.completada) ||
            (filtro === 'completadas' && tarea.completada);

        const matchBusqueda = busqueda === '' ||
            tarea.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
            tarea.descripcion?.toLowerCase().includes(busqueda.toLowerCase());

        return matchFiltro && matchBusqueda;
    });

    const toggleTarea = (id) => {
        setTareas(tareas.map(t =>
            t.id === id ? { ...t, completada: !t.completada } : t
        ));
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                {/* Filtros */}
                <div className="mb-6">
                    <div className="backdrop-blur-sm border border-white/10 rounded-xl p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Búsqueda */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar tareas..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="w-full bg-gray-900/50 border border-gray-600 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Filtros */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFiltro('todas')}
                                    className={`px-4 py-2 rounded-lg transition-all ${filtro === 'todas'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    Todas
                                </button>
                                <button
                                    onClick={() => setFiltro('pendientes')}
                                    className={`px-4 py-2 rounded-lg transition-all ${filtro === 'pendientes'
                                        ? 'bg-yellow-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    Pendientes
                                </button>
                                <button
                                    onClick={() => setFiltro('completadas')}
                                    className={`px-4 py-2 rounded-lg transition-all ${filtro === 'completadas'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    Completadas
                                </button>
                            </div>

                            {/* Botón Nueva Tarea */}
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/50 whitespace-nowrap">
                                <Plus className="w-5 h-5" />
                                Nueva
                            </button>
                        </div>
                    </div>
                </div>

                {/* Grid de tareas - Mosaico */}
                {tareasFiltradas.length === 0 ? (
                    <div className="backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
                        <CheckSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">No hay tareas</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tareasFiltradas.map((tarea) => (
                            <div
                                key={tarea.id}
                                className={`backdrop-blur-md border rounded-xl p-5 transition-all cursor-pointer group hover:scale-[1.02] ${tarea.completada
                                    ? 'border-green-400/30 hover:border-green-400/60 opacity-70'
                                    : 'border-white/10 hover:border-blue-400/60'
                                    }`}
                            >
                                {/* Header con checkbox y prioridad */}
                                <div className="flex items-center justify-between mb-4">
                                    <button
                                        onClick={() => toggleTarea(tarea.id)}
                                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${tarea.completada
                                            ? 'bg-green-600 border-green-600'
                                            : 'border-gray-600 hover:border-blue-500'
                                            }`}
                                    >
                                        {tarea.completada && (
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPrioridadColor(tarea.prioridad)}`}>
                                        {tarea.prioridad.charAt(0).toUpperCase() + tarea.prioridad.slice(1)}
                                    </span>
                                </div>

                                {/* Título */}
                                <h3 className={`text-lg font-bold mb-2 ${tarea.completada ? 'line-through text-gray-500' : 'text-white group-hover:text-blue-400'} transition-colors`}>
                                    {tarea.titulo}
                                </h3>

                                {/* Descripción */}
                                {tarea.descripcion && (
                                    <p className="text-sm text-gray-400 mb-4">{tarea.descripcion}</p>
                                )}

                                {/* Info adicional */}
                                <div className="space-y-2 pt-4 border-t border-white/5">
                                    {tarea.cliente && (
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                            </svg>
                                            <span>{tarea.cliente}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <Calendar className="w-3 h-3" />
                                        <span>{tarea.fechaVencimiento}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VendedorTareas;
