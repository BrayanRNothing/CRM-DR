import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Users, RefreshCw, Award, Clock, BarChart3, Target, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import FunnelVisual from '../../components/FunnelVisual';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Mock data con 4 fases
const MOCK_DATA = {
    embudo: {
        reunion_agendada: 10,
        reunion_realizada: 8,
        propuesta_enviada: 6,
        venta_ganada: 4
    },
    metricas: {
        reuniones: { hoy: 3, pendientes: 10, realizadas: 8 },
        ventas: { mes: 4, montoMes: 180000, totales: 4 },
        negociaciones: { activas: 6 }
    },
    tasasConversion: {
        asistencia: 80.0,      // (8/10)*100
        interes: 75.0,         // (6/8)*100
        cierre: 66.7,          // (4/6)*100
        global: 40.0           // (4/10)*100
    }
};

const CloserDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [usandoMock, setUsandoMock] = useState(false);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            if (!token) {
                setData(MOCK_DATA);
                setUsandoMock(true);
                setLoading(false);
                return;
            }

            const config = { headers: { 'x-auth-token': token } };

            try {
                const res = await axios.get(`${API_URL}/api/closer/dashboard`, config);
                setData(res.data);
                setUsandoMock(false);
            } catch (error) {
                console.log('⚠️ Usando datos mock:', error.message);
                setData(MOCK_DATA);
                setUsandoMock(true);
            }
        } catch (error) {
            setData(MOCK_DATA);
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
            <div className="min-h-screen p-6 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-5 overflow-hidden">
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden min-h-0">
                {/* Embudo Header - White Section */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-green-600" />
                            Embudo de Ventas
                        </h2>
                        {usandoMock && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-md border border-yellow-200 font-semibold">
                                Datos de demostración
                            </span>
                        )}
                    </div>
                    <FunnelVisual
                        stages={[
                            {
                                etapa: 'Reuniones Agendadas',
                                cantidad: data.embudo.reunion_agendada,
                                color: 'bg-blue-500',
                                contadorHoy: data.metricas.reuniones.hoy,
                                labelContador: 'hoy',
                                cantidadExito: data.embudo.reunion_realizada,
                                cantidadPerdida: data.embudo.reunion_agendada - data.embudo.reunion_realizada,
                                porcentajeExito: data.tasasConversion.asistencia,
                                porcentajePerdida: (100 - data.tasasConversion.asistencia).toFixed(1),
                                labelExito: 'asisten',
                                labelPerdida: 'no asisten'
                            },
                            {
                                etapa: 'Reuniones Realizadas',
                                cantidad: data.embudo.reunion_realizada,
                                color: 'bg-cyan-500',
                                cantidadExito: data.embudo.propuesta_enviada,
                                cantidadPerdida: data.embudo.reunion_realizada - data.embudo.propuesta_enviada,
                                porcentajeExito: data.tasasConversion.interes,
                                porcentajePerdida: (100 - data.tasasConversion.interes).toFixed(1),
                                labelExito: 'piden propuesta',
                                labelPerdida: 'no interesados'
                            },
                            {
                                etapa: 'Propuestas Enviadas',
                                cantidad: data.embudo.propuesta_enviada,
                                color: 'bg-orange-500',
                                cantidadExito: data.embudo.venta_ganada,
                                cantidadPerdida: data.embudo.propuesta_enviada - data.embudo.venta_ganada,
                                porcentajeExito: data.tasasConversion.cierre,
                                porcentajePerdida: (100 - data.tasasConversion.cierre).toFixed(1),
                                labelExito: 'aceptada',
                                labelPerdida: 'rechazada'
                            },
                            {
                                etapa: 'Ventas Cerradas',
                                cantidad: data.embudo.venta_ganada,
                                color: 'bg-green-500',
                                cantidadExito: data.embudo.venta_ganada,
                                porcentajeExito: 100,
                                labelExito: 'ganadas'
                            }
                        ]}
                        type="closer"
                    />
                </div>

                {/* Main Content: Metrics Grid + Tasks Sidebar */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
                    {/* Left Side: Metrics Grid (2 columns) */}
                    <div className="lg:col-span-2 flex flex-col min-h-0">
                        <div className="grid grid-cols-2 grid-rows-3 gap-4 flex-1">
                            {/* Row 1 */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Calendar className="w-8 h-8 text-blue-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.metricas.reuniones.hoy}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Reuniones Hoy</p>
                            </div>

                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Users className="w-8 h-8 text-orange-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.embudo.propuesta_enviada}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Propuestas Enviadas</p>
                            </div>

                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-cyan-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.tasasConversion.asistencia}%</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Tasa de Asistencia</p>
                            </div>

                            {/* Row 2 */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.tasasConversion.cierre}%</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Tasa de Cierre</p>
                            </div>

                            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 shadow-md col-span-2">
                                <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    Próximas Reuniones
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="border-l-2 border-blue-500 pl-2">
                                        <p className="text-xs font-semibold text-gray-900">10:00 AM</p>
                                        <p className="text-xs text-gray-600">Tech Solutions</p>
                                    </div>
                                    <div className="border-l-2 border-orange-500 pl-2">
                                        <p className="text-xs font-semibold text-gray-900">3:00 PM</p>
                                        <p className="text-xs text-gray-600">Marketing Pro</p>
                                    </div>
                                    <div className="border-l-2 border-green-500 pl-2">
                                        <p className="text-xs font-semibold text-gray-900">5:00 PM</p>
                                        <p className="text-xs text-gray-600">Innovation Corp</p>
                                    </div>
                                </div>
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
                                        <h3 className="font-bold text-gray-900 text-sm">Meta del Mes</h3>
                                        <Award className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div className="mb-2">
                                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                                            <span>{data.metricas.ventas.mes} / 10 ventas</span>
                                            <span>{(data.metricas.ventas.mes / 10 * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-500 h-2 rounded-full transition-all"
                                                style={{ width: `${(data.metricas.ventas.mes / 10 * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600">Faltan {10 - data.metricas.ventas.mes} ventas para completar</p>
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
                                            <span className="text-gray-700">Llamar a 3 clientes con propuestas pendientes</span>
                                        </div>
                                        <div className="flex items-start gap-2 text-xs">
                                            <input type="checkbox" className="mt-0.5 accent-green-600" />
                                            <span className="text-gray-700">Preparar presentación para reunión de las 3pm</span>
                                        </div>
                                        <div className="flex items-start gap-2 text-xs">
                                            <input type="checkbox" className="mt-0.5 accent-green-600" />
                                            <span className="text-gray-700">Enviar seguimiento a 2 clientes</span>
                                        </div>
                                        <div className="flex items-start gap-2 text-xs">
                                            <input type="checkbox" defaultChecked className="mt-0.5 accent-green-600" />
                                            <span className="text-gray-700 line-through">Revisar emails de la mañana</span>
                                        </div>
                                    </div>
                                </div>




                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CloserDashboard;
