import React, { useState, useEffect } from 'react';
import { Phone, UserPlus, Calendar, TrendingUp, RefreshCw, Clock, UserCheck, CheckCircle2, Target, Mail } from 'lucide-react';
import axios from 'axios';
import FunnelVisual from '../../components/FunnelVisual';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const ProspectorDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [usandoMock, setUsandoMock] = useState(false);

    const mockData = {
        metricas: {
            llamadas: { totales: 156, hoy: 14 },
            contactosExitosos: { totales: 30 },
            reunionesAgendadas: { totales: 10, semana: 9 },
            prospectosHoy: 12,
            correosEnviados: 45
        },
        embudo: {
            prospecto_nuevo: 60,
            en_contacto: 30,
            reunion_agendada: 10,
            transferidos: 10,
            total: 100
        },
        tasasConversion: {
            contacto: 50.0,
            agendamiento: 33.3
        }
    };

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/prospector/dashboard`);
            setData(response.data);
            setUsandoMock(false);
        } catch (error) {
            console.error('Error al cargar datos:', error);
            setData(mockData);
            setUsandoMock(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-600">No hay datos disponibles</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-5 overflow-hidden">
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden min-h-0">
                {/* Header - White Section */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-teal-600" />
                            Embudo de Prospección
                        </h2>
                        {usandoMock && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-md border border-yellow-200 font-semibold">
                                Datos de demostración
                            </span>
                        )}
                    </div>

                    {/* Visualización del Embudo */}
                    <div className="w-full overflow-hidden">
                        <FunnelVisual
                            stages={[
                                {
                                    etapa: 'Prospectos',
                                    cantidad: data.embudo.prospecto_nuevo,
                                    color: 'bg-blue-500',
                                    contadorHoy: data.metricas.prospectosHoy,
                                    labelContador: 'recibidos hoy',
                                    // De Prospectos (60) -> Contacto (30)
                                    cantidadExito: data.embudo.en_contacto,
                                    cantidadPerdida: data.embudo.prospecto_nuevo - data.embudo.en_contacto,
                                    porcentajeExito: data.tasasConversion.contacto,
                                    porcentajePerdida: (100 - data.tasasConversion.contacto).toFixed(1),
                                    labelExito: 'contactados',
                                    labelPerdida: 'sin contacto'
                                },
                                {
                                    etapa: 'Llamadas/Contacto',
                                    cantidad: data.embudo.en_contacto,
                                    color: 'bg-teal-500',
                                    // De Contacto (30) -> Agenda (10)
                                    cantidadExito: data.embudo.reunion_agendada,
                                    cantidadPerdida: data.embudo.en_contacto - data.embudo.reunion_agendada,
                                    porcentajeExito: data.tasasConversion.agendamiento,
                                    porcentajePerdida: (100 - data.tasasConversion.agendamiento).toFixed(1),
                                    labelExito: 'agendan cita',
                                    labelPerdida: 'no agendan'
                                },
                                {
                                    etapa: 'Citas Agendadas',
                                    cantidad: data.embudo.reunion_agendada,
                                    color: 'bg-green-500',
                                    // Fin del proceso prospector
                                    cantidadExito: data.embudo.reunion_agendada,
                                    porcentajeExito: 100,
                                    labelExito: 'transferidas'
                                }
                            ]}
                            type="prospector"
                        />
                    </div>
                </div>

                {/* Main Content: Metrics Grid + Tasks Sidebar */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
                    {/* Left Side: Metrics Grid (2 columns) */}
                    <div className="lg:col-span-2 flex flex-col min-h-0">
                        <div className="grid grid-cols-2 grid-rows-3 gap-4 flex-1">
                            {/* Row 1 */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Phone className="w-8 h-8 text-teal-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.metricas.llamadas.hoy}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Llamadas Hoy</p>
                            </div>

                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <UserPlus className="w-8 h-8 text-blue-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.metricas.prospectosHoy}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Prospectos Nuevos</p>
                            </div>

                            {/* Row 2 */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Mail className="w-8 h-8 text-purple-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.metricas.correosEnviados || 45}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Correos / Mensajes</p>
                            </div>

                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Calendar className="w-8 h-8 text-green-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.metricas.reunionesAgendadas.totales}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Citas Agendadas</p>
                            </div>

                            {/* Row 3 - Rates */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-indigo-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.tasasConversion.contacto}%</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Tasa de Contacto</p>
                            </div>

                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Target className="w-8 h-8 text-orange-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.tasasConversion.agendamiento}%</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Tasa Agendamiento</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Tasks/Goals Sidebar - White Section (2 columns) */}
                    <div className="lg:col-span-2 flex flex-col min-h-0">
                        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-md flex flex-col overflow-hidden">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 flex-shrink-0">
                                <Target className="w-6 h-6 text-green-600" />
                                Tareas y Metas
                            </h2>

                            <div className="flex-1 space-y-4 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#8bc34a #f3f4f6' }}>
                                {/* Meta del Mes */}
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-gray-900 text-sm">Meta de Citas (Mes)</h3>
                                        <Calendar className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div className="mb-2">
                                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                                            <span>{data.metricas.reunionesAgendadas.totales} / 40 citas</span>
                                            <span>{(data.metricas.reunionesAgendadas.totales / 40 * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-500 h-2 rounded-full transition-all"
                                                style={{ width: `${(data.metricas.reunionesAgendadas.totales / 40 * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600">Faltan {40 - data.metricas.reunionesAgendadas.totales} citas para completar</p>
                                </div>

                                {/* Tareas Pendientes */}
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        Tareas de Hoy
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2 text-xs">
                                            <input type="checkbox" className="mt-0.5 accent-green-600" />
                                            <span className="text-gray-700">Realizar seguimiento a 5 prospectos nuevos</span>
                                        </div>
                                        <div className="flex items-start gap-2 text-xs">
                                            <input type="checkbox" className="mt-0.5 accent-green-600" />
                                            <span className="text-gray-700">Confirmar citas para mañana</span>
                                        </div>
                                        <div className="flex items-start gap-2 text-xs">
                                            <input type="checkbox" className="mt-0.5 accent-green-600" />
                                            <span className="text-gray-700">Enviar correos de presentación</span>
                                        </div>
                                        <div className="flex items-start gap-2 text-xs">
                                            <input type="checkbox" defaultChecked className="mt-0.5 accent-green-600" />
                                            <span className="text-gray-700 line-through">Revisar leads entrantes de la noche</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Recordatorio */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-blue-800 mb-1">💡 Tip de Prospección</p>
                                    <p className="text-xs text-blue-700">
                                        Recuerda calificar la calidad del lead después de la primera llamada.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProspectorDashboard;
