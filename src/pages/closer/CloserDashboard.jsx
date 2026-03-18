import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Users, RefreshCw, Award, Clock, BarChart3, Target, CheckCircle2, DollarSign, AlertTriangle, TrendingDown, Zap } from 'lucide-react';
import axios from 'axios';
import FunnelVisual from '../../components/FunnelVisual';

import API_URL from '../../config/api';
import socket from '../../config/socket';

// Datos iniciales en 0 cuando no hay conexión
const INITIAL_DATA = {
    embudo: {
        reunion_agendada: 0,
        reunion_realizada: 0,
        propuesta_enviada: 0,
        venta_ganada: 0
    },
    metricas: {
        reuniones: { hoy: 0, pendientes: 0, realizadas: 0 },
        ventas: { mes: 0, montoMes: 0, totales: 0, montoTotal: 0 },
        clientes: { totales: 0 },
        negociaciones: { activas: 0 }
    },
    tasasConversion: {
        asistencia: 0,
        interes: 0,
        cierre: 0,
        global: 0
    },
    analisisPerdidas: {
        no_asistio: 0,
        no_interesado: 0
    }
};

const CloserDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [tareas, setTareas] = useState([]);
    const [loadingTareas, setLoadingTareas] = useState(false);


    // Función para sanitizar datos y evitar NaN
    const sanitizeData = (rawData) => {
        if (!rawData) return INITIAL_DATA;

        const getNumero = (val) => {
            const num = parseFloat(val);
            return isNaN(num) || num === null ? 0 : num;
        };

        return {
            ...rawData,
            embudo: {
                reunion_agendada: getNumero(rawData?.embudo?.reunion_agendada),
                reunion_realizada: getNumero(rawData?.embudo?.reunion_realizada),
                propuesta_enviada: getNumero(rawData?.embudo?.propuesta_enviada),
                venta_ganada: getNumero(rawData?.embudo?.venta_ganada)
            },
            metricas: {
                reuniones: {
                    hoy: getNumero(rawData?.metricas?.reuniones?.hoy),
                    pendientes: getNumero(rawData?.metricas?.reuniones?.pendientes),
                    realizadas: getNumero(rawData?.metricas?.reuniones?.realizadas),
                    realizadasHoy: getNumero(rawData?.metricas?.reuniones?.realizadasHoy),
                    propuestasHoy: getNumero(rawData?.metricas?.reuniones?.propuestasHoy)
                },
                ventas: {
                    mes: getNumero(rawData?.metricas?.ventas?.mes),
                    montoMes: getNumero(rawData?.metricas?.ventas?.montoMes),
                    totales: getNumero(rawData?.metricas?.ventas?.totales),
                    montoTotal: getNumero(rawData?.metricas?.ventas?.montoTotal),
                    ventasHoy: getNumero(rawData?.metricas?.ventas?.ventasHoy)
                },
                clientes: {
                    totales: getNumero(rawData?.metricas?.clientes?.totales)
                },
                negociaciones: {
                    activas: getNumero(rawData?.metricas?.negociaciones?.activas)
                }
            },
            tasasConversion: {
                asistencia: getNumero(rawData?.tasasConversion?.asistencia),
                interes: getNumero(rawData?.tasasConversion?.interes),
                cierre: getNumero(rawData?.tasasConversion?.cierre),
                global: getNumero(rawData?.tasasConversion?.global)
            },
            analisisPerdidas: {
                no_asistio: getNumero(rawData?.analisisPerdidas?.no_asistio),
                no_interesado: getNumero(rawData?.analisisPerdidas?.no_interesado)
            }
        };
    };

    const getAuthHeaders = () => ({
        'x-auth-token': localStorage.getItem('token') || ''
    });

    const cargarDatos = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const token = localStorage.getItem('token');

            if (!token) {
                setData(INITIAL_DATA);
                setLoading(false);
                return;
            }

            const config = { headers: { 'x-auth-token': token } };

            try {
                const res = await axios.get(`${API_URL}/api/closer/dashboard`, config);
                setData(sanitizeData(res.data));
            } catch (error) {
                console.log('⚠️ Usando datos iniciales (sin backend):', error.message);
                setData(INITIAL_DATA);
            }
        } catch (error) {
            setData(INITIAL_DATA);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const cargarProximasReuniones = async (silent = false) => {
        if (!silent) setLoadingTareas(true);
        try {
            const response = await axios.get(`${API_URL}/api/closer/calendario`, { headers: getAuthHeaders() });

            const ahora = new Date();

            // 1. Filtrar solo las reuniones que NO han pasado (de ahora en adelante)
            // 2. Filtrar que sigan pendientes (por si la API trae algo más)
            const proximas = response.data.filter(r => {
                const fecha = new Date(r.fecha);
                const esPendiente = r.resultado === 'pendiente' || !r.resultado;
                return fecha >= ahora && esPendiente;
            });

            // 3. Ordenar por fecha (más cercanas primero)
            proximas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

            // 4. Tomar solo las top 3
            setTareas(proximas.slice(0, 3));
        } catch (error) {
            console.error('Error al cargar próximas reuniones:', error);
        } finally {
            if (!silent) setLoadingTareas(false);
        }
    };

    useEffect(() => {
        cargarDatos();
        cargarProximasReuniones();
        const interval = setInterval(() => {
            cargarDatos(true);
            cargarProximasReuniones(true);
        }, 5 * 60 * 1000);

        socket.on('prospectos_actualizados', (obj) => {
            console.log('socket: prospectos actualizados detectado', obj);
            cargarDatos(true);
            cargarProximasReuniones(true);
        });

        return () => {
            clearInterval(interval);
            socket.off('prospectos_actualizados');
        };
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

    if (!data) return null;

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
                    </div>
                    <FunnelVisual
                        stages={[
                            {
                                etapa: 'Reuniones Agendadas',
                                cantidad: data.embudo.reunion_agendada,
                                color: 'bg-(--theme-500)',
                                contadorHoy: data.metricas.reuniones.hoy,
                                labelContador: 'hoy',
                                cantidadExito: data.embudo.reunion_realizada,
                                cantidadPerdida: data.analisisPerdidas.no_asistio,
                                porcentajeExito: Math.round(data.tasasConversion.asistencia) || 0,
                                porcentajePerdida: data.embudo.reunion_agendada > 0 ? ((data.analisisPerdidas.no_asistio / data.embudo.reunion_agendada) * 100).toFixed(1) : 0,
                                labelExito: 'asisten',
                                labelPerdida: 'no asisten'
                            },
                            {
                                etapa: 'Reuniones Realizadas',
                                cantidad: data.embudo.reunion_realizada,
                                color: 'bg-cyan-500',
                                contadorHoy: data.metricas.reuniones.realizadasHoy,
                                labelContador: 'hoy',
                                cantidadExito: data.embudo.propuesta_enviada,
                                cantidadPerdida: data.analisisPerdidas.no_interesado,
                                porcentajeExito: Math.round(data.tasasConversion.interes) || 0,
                                porcentajePerdida: data.embudo.reunion_realizada > 0 ? ((data.analisisPerdidas.no_interesado / data.embudo.reunion_realizada) * 100).toFixed(1) : 0,
                                labelExito: 'piden propuesta',
                                labelPerdida: 'no interesados'
                            },
                            {
                                etapa: 'Propuestas Enviadas',
                                cantidad: data.embudo.propuesta_enviada,
                                color: 'bg-orange-500',
                                contadorHoy: data.metricas.reuniones.propuestasHoy,
                                labelContador: 'hoy',
                                cantidadExito: data.embudo.venta_ganada,
                                cantidadPerdida: data.embudo.propuesta_enviada - data.embudo.venta_ganada,
                                porcentajeExito: Math.round(data.tasasConversion.cierre) || 0,
                                porcentajePerdida: data.embudo.propuesta_enviada > 0 ? (((data.embudo.propuesta_enviada - data.embudo.venta_ganada) / data.embudo.propuesta_enviada) * 100).toFixed(1) : 0,
                                labelExito: 'aceptada',
                                labelPerdida: 'rechazada o en proceso'
                            },
                            {
                                etapa: 'Ventas Cerradas',
                                cantidad: data.embudo.venta_ganada,
                                color: 'bg-green-500',
                                contadorHoy: data.metricas.ventas.ventasHoy,
                                labelContador: 'hoy',
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
                                <Calendar className="w-8 h-8 text-(--theme-600) mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.metricas.reuniones.hoy}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Reuniones Hoy</p>
                            </div>

                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-cyan-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{Math.round(data.tasasConversion.asistencia) || 0}%</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Tasa de Asistencia</p>
                            </div>

                            {/* Row 2 */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{Math.round(data.tasasConversion.cierre) || 0}%</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Tasa de Cierre</p>
                            </div>

                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <DollarSign className="w-8 h-8 text-(--theme-600) mb-2" />
                                <span className="text-2xl font-bold text-gray-900 mb-1">${(data.metricas.ventas.montoMes || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Monto del Mes</p>
                            </div>

                            {/* Row 3 */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Award className="w-8 h-8 text-purple-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{Math.round(data.tasasConversion.interes) || 0}%</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Tasa de Interés</p>
                            </div>

                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <TrendingUp className="w-8 h-8 text-pink-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.metricas.ventas.mes}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Ventas del Mes</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Tasks/Goals Sidebar - White Section (2 columns) */}
                    <div className="lg:col-span-2 flex flex-col min-h-0">
                        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-md flex flex-col overflow-hidden">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 flex-shrink-0">
                                <Calendar className="w-6 h-6 text-(--theme-600)" />
                                Próximas Reuniones
                            </h2>

                            <div className="flex-1 space-y-4 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3b82f6 #f3f4f6' }}>
                                {loadingTareas ? (
                                    <div className="flex justify-center items-center h-20">
                                        <RefreshCw className="w-6 h-6 animate-spin text-(--theme-500)" />
                                    </div>
                                ) : tareas.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                        <Calendar className="w-10 h-10 opacity-20" />
                                        <p className="text-sm">No tienes reuniones próximas programadas.</p>
                                    </div>
                                ) : (
                                    tareas.map((t) => {
                                        // Extraer links de Google Meet o Zoom de las notas
                                        let meetLink = null;
                                        if (t.notas) {
                                            const meetMatch = t.notas.match(/https:\/\/(?:meet\.google\.com|us\d+web\.zoom\.us\/j)\/[^\s]+/i);
                                            if (meetMatch) meetLink = meetMatch[0];
                                        }

                                        return (
                                            <div key={t.id || t._id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col group hover:border-(--theme-300) transition-colors shadow-sm gap-2">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="w-2 h-2 rounded-full bg-(--theme-500)"></span>
                                                            <h3 className="font-bold text-gray-900 text-sm truncate">
                                                                {t.cliente?.nombres} {t.cliente?.apellidoPaterno}
                                                            </h3>
                                                        </div>
                                                        {t.cliente?.empresa && (
                                                            <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                                                🏢 {t.cliente.empresa}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="bg-(--theme-100) text-(--theme-700) font-bold text-xs px-2 py-1 rounded-md shrink-0 border border-(--theme-200)">
                                                        {new Date(t.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                    {t.cliente?.telefono && (
                                                        <span className="flex items-center gap-1 truncate text-[10px]">
                                                            📞 {t.cliente.telefono}
                                                        </span>
                                                    )}
                                                    {t.cliente?.correo && (
                                                        <span className="flex items-center gap-1 truncate text-[10px]">
                                                            📧 {t.cliente.correo}
                                                        </span>
                                                    )}
                                                </div>

                                                {t.notas && (
                                                    <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border border-gray-100 italic">
                                                        {t.notas}
                                                    </div>
                                                )}

                                                {meetLink && (
                                                    <a
                                                        href={meetLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-2 w-full bg-(--theme-600) hover:bg-(--theme-700) text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 text-xs transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                        Unirse a la Reunión
                                                    </a>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CloserDashboard;
