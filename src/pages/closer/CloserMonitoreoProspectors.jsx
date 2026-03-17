import React, { useState, useEffect } from 'react';
import { Users, Phone, Calendar, TrendingUp, RefreshCw, Activity, Target, AlertCircle, CheckCircle2, X, ChevronRight } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const CloserMonitoreoProspectors = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [periodo, setPeriodo] = useState('diario');
    const [usandoMock, setUsandoMock] = useState(false);
    const [selectedProspector, setSelectedProspector] = useState(null);

    const mockData = {
        periodo: 'diario',
        totalProspectors: 3,
        prospectors: [
            {
                prospector: { id: '1', nombre: 'Juan Pérez', correo: 'juan@example.com' },
                metricas: {
                    llamadas: { total: 15, exitosas: 8 },
                    citas: { agendadas: 2, transferidas: 2 },
                    prospectos: { total: 45, nuevos: 5, revisados: 15 },
                    tasas: { contacto: 53.3, agendamiento: 25.0 }
                },
                distribucion: { prospecto_nuevo: 20, en_contacto: 15, reunion_agendada: 10 },
                rendimiento: { estado: 'excelente', color: 'green', descripcion: 'Rendimiento excelente - Cumpliendo metas' }
            },
            {
                prospector: { id: '2', nombre: 'María García', correo: 'maria@example.com' },
                metricas: {
                    llamadas: { total: 10, exitosas: 5 },
                    citas: { agendadas: 1, transferidas: 1 },
                    prospectos: { total: 38, nuevos: 3, revisados: 10 },
                    tasas: { contacto: 50.0, agendamiento: 20.0 }
                },
                distribucion: { prospecto_nuevo: 18, en_contacto: 12, reunion_agendada: 8 },
                rendimiento: { estado: 'bueno', color: 'yellow', descripcion: 'Buen rendimiento - En camino' }
            },
            {
                prospector: { id: '3', nombre: 'Carlos López', correo: 'carlos@example.com' },
                metricas: {
                    llamadas: { total: 5, exitosas: 2 },
                    citas: { agendadas: 0, transferidas: 0 },
                    prospectos: { total: 30, nuevos: 2, revisados: 5 },
                    tasas: { contacto: 40.0, agendamiento: 0 }
                },
                distribucion: { prospecto_nuevo: 15, en_contacto: 10, reunion_agendada: 5 },
                rendimiento: { estado: 'bajo', color: 'orange', descripcion: 'Rendimiento bajo - Necesita atención' }
            }
        ]
    };

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/closer/prospectors/monitoring`, {
                params: { periodo },
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setData(response.data);
            setUsandoMock(false);
        } catch (error) {
            console.error('Error al cargar monitoreo:', error);
            setData(mockData);
            setUsandoMock(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [periodo]);

    const getColorClasses = (color) => {
        const colors = {
            green: {
                bg: 'bg-green-50',
                border: 'border-green-200',
                text: 'text-green-700',
                badge: 'bg-green-500 text-white',
            },
            yellow: {
                bg: 'bg-yellow-50',
                border: 'border-yellow-200',
                text: 'text-yellow-700',
                badge: 'bg-yellow-500 text-white',
            },
            orange: {
                bg: 'bg-orange-50',
                border: 'border-orange-200',
                text: 'text-orange-700',
                badge: 'bg-orange-500 text-white',
            },
            red: {
                bg: 'bg-red-50',
                border: 'border-red-200',
                text: 'text-red-700',
                badge: 'bg-red-500 text-white',
            }
        };
        return colors[color] || colors.green;
    };

    const getEstadoIcon = (estado) => {
        switch (estado) {
            case 'excelente': return <CheckCircle2 className="w-4 h-4" />;
            case 'bueno': return <TrendingUp className="w-4 h-4" />;
            case 'bajo': return <AlertCircle className="w-4 h-4" />;
            case 'critico': return <AlertCircle className="w-4 h-4" />;
            default: return <Activity className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando monitoreo...</p>
                </div>
            </div>
        );
    }

    if (!data || !data.prospectors || data.prospectors.length === 0) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <p className="text-gray-600">No hay datos disponibles</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Users className="w-8 h-8 text-green-600" />
                            Monitoreo de Prospectors
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Seguimiento del desempeño de tu equipo de prospección
                            {usandoMock && (
                                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-md border border-yellow-200">
                                    Datos de demostración
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={cargarDatos}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 shadow-md"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Actualizar
                    </button>
                </div>

                {/* Filtros de Período */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <span className="text-gray-700 font-medium">Período:</span>
                        <div className="flex gap-2">
                            {['diario', 'semanal', 'mensual'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriodo(p)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${periodo === p
                                        ? 'bg-green-500 text-white shadow-lg'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="ml-auto text-sm text-gray-600">
                            Total: <span className="text-gray-900 font-bold">{data.totalProspectors}</span> prospectors
                        </div>
                    </div>
                </div>

                {/* Resumen General */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                            <span className="text-2xl font-bold text-gray-900">
                                {data.prospectors.filter(p => p.rendimiento.estado === 'excelente').length}
                            </span>
                        </div>
                        <p className="text-green-700 text-sm font-semibold">Excelente</p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <TrendingUp className="w-6 h-6 text-yellow-600" />
                            <span className="text-2xl font-bold text-gray-900">
                                {data.prospectors.filter(p => p.rendimiento.estado === 'bueno').length}
                            </span>
                        </div>
                        <p className="text-yellow-700 text-sm font-semibold">Bueno</p>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <AlertCircle className="w-6 h-6 text-orange-600" />
                            <span className="text-2xl font-bold text-gray-900">
                                {data.prospectors.filter(p => p.rendimiento.estado === 'bajo').length}
                            </span>
                        </div>
                        <p className="text-orange-700 text-sm font-semibold">Bajo</p>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                            <span className="text-2xl font-bold text-gray-900">
                                {data.prospectors.filter(p => p.rendimiento.estado === 'critico').length}
                            </span>
                        </div>
                        <p className="text-red-700 text-sm font-semibold">Crítico</p>
                    </div>
                </div>

                {/* Grid de Prospectors - COMPACT */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.prospectors.map((item) => {
                        const colorClasses = getColorClasses(item.rendimiento.color);

                        return (
                            <div
                                key={item.prospector.id}
                                className={`${colorClasses.bg} border ${colorClasses.border} rounded-xl p-4 transition-all hover:shadow-lg cursor-pointer`}
                                onClick={() => setSelectedProspector(item)}
                            >
                                {/* Header Compacto */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-gray-900 truncate">{item.prospector.nombre}</h3>
                                        <p className="text-gray-600 text-xs truncate">{item.prospector.correo}</p>
                                    </div>
                                    <div className={`flex items-center gap-1 px-2 py-1 ${colorClasses.badge} rounded-lg shadow-sm ml-2 flex-shrink-0`}>
                                        {getEstadoIcon(item.rendimiento.estado)}
                                        <span className="font-semibold capitalize text-xs">{item.rendimiento.estado}</span>
                                    </div>
                                </div>

                                {/* Métricas Rápidas */}
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-gray-900">{item.metricas.llamadas.total}</p>
                                        <p className="text-xs text-gray-600">Llamadas</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-gray-900">{item.metricas.citas.agendadas}</p>
                                        <p className="text-xs text-gray-600">Citas</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-gray-900">{item.metricas.tasas.contacto}%</p>
                                        <p className="text-xs text-gray-600">Contacto</p>
                                    </div>
                                </div>

                                {/* Botón Ver Detalles */}
                                <button
                                    className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProspector(item);
                                    }}
                                >
                                    Ver Detalles
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Slide-Over Panel para Detalles */}
            {selectedProspector && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
                        onClick={() => setSelectedProspector(null)}
                    ></div>

                    {/* Panel */}
                    <div className="absolute inset-y-0 right-0 max-w-2xl w-full bg-white shadow-2xl flex flex-col">
                        {/* Header del Panel */}
                        <div className={`${getColorClasses(selectedProspector.rendimiento.color).bg} border-b ${getColorClasses(selectedProspector.rendimiento.color).border} p-6`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedProspector.prospector.nombre}</h2>
                                    <p className="text-gray-600 text-sm mt-1">{selectedProspector.prospector.correo}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedProspector(null)}
                                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                                >
                                    <X className="w-6 h-6 text-gray-700" />
                                </button>
                            </div>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 ${getColorClasses(selectedProspector.rendimiento.color).badge} rounded-lg shadow-sm mt-3`}>
                                {getEstadoIcon(selectedProspector.rendimiento.estado)}
                                <span className="font-semibold capitalize">{selectedProspector.rendimiento.estado}</span>
                            </div>
                        </div>

                        {/* Contenido del Panel */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Métricas Principales */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Métricas Principales</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Phone className="w-5 h-5 text-blue-600" />
                                            <span className="text-gray-600 text-sm font-medium">Llamadas</span>
                                        </div>
                                        <p className="text-3xl font-bold text-gray-900">{selectedProspector.metricas.llamadas.total}</p>
                                        <p className="text-sm text-blue-600 mt-1">{selectedProspector.metricas.llamadas.exitosas} exitosas</p>
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calendar className="w-5 h-5 text-green-600" />
                                            <span className="text-gray-600 text-sm font-medium">Citas</span>
                                        </div>
                                        <p className="text-3xl font-bold text-gray-900">{selectedProspector.metricas.citas.agendadas}</p>
                                        <p className="text-sm text-green-600 mt-1">{selectedProspector.metricas.citas.transferidas} transferidas</p>
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users className="w-5 h-5 text-purple-600" />
                                            <span className="text-gray-600 text-sm font-medium">Prospectos</span>
                                        </div>
                                        <p className="text-3xl font-bold text-gray-900">{selectedProspector.metricas.prospectos.total}</p>
                                        <p className="text-sm text-purple-600 mt-1">{selectedProspector.metricas.prospectos.nuevos} nuevos</p>
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Target className="w-5 h-5 text-orange-600" />
                                            <span className="text-gray-600 text-sm font-medium">Tasa Contacto</span>
                                        </div>
                                        <p className="text-3xl font-bold text-gray-900">{selectedProspector.metricas.tasas.contacto}%</p>
                                        <p className="text-sm text-orange-600 mt-1">Agendamiento: {selectedProspector.metricas.tasas.agendamiento}%</p>
                                    </div>
                                </div>
                            </div>

                            {/* Distribución del Embudo */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Distribución del Embudo</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-28 text-sm text-gray-600 font-medium">Nuevos</div>
                                        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                                            <div
                                                className="bg-blue-500 h-full rounded-full transition-all"
                                                style={{ width: `${(selectedProspector.distribucion.prospecto_nuevo / selectedProspector.metricas.prospectos.total * 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-gray-900 font-bold text-sm w-10 text-right">{selectedProspector.distribucion.prospecto_nuevo}</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-28 text-sm text-gray-600 font-medium">En Contacto</div>
                                        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                                            <div
                                                className="bg-green-500 h-full rounded-full transition-all"
                                                style={{ width: `${(selectedProspector.distribucion.en_contacto / selectedProspector.metricas.prospectos.total * 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-gray-900 font-bold text-sm w-10 text-right">{selectedProspector.distribucion.en_contacto}</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-28 text-sm text-gray-600 font-medium">Agendadas</div>
                                        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                                            <div
                                                className="bg-green-600 h-full rounded-full transition-all"
                                                style={{ width: `${(selectedProspector.distribucion.reunion_agendada / selectedProspector.metricas.prospectos.total * 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-gray-900 font-bold text-sm w-10 text-right">{selectedProspector.distribucion.reunion_agendada}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Estado y Descripción */}
                            <div className={`${getColorClasses(selectedProspector.rendimiento.color).bg} border ${getColorClasses(selectedProspector.rendimiento.color).border} rounded-lg p-4`}>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Evaluación</h3>
                                <p className={`text-sm ${getColorClasses(selectedProspector.rendimiento.color).text} font-medium`}>
                                    {selectedProspector.rendimiento.descripcion}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CloserMonitoreoProspectors;
