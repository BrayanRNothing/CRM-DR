import React, { useState, useEffect } from 'react';
import { Phone, UserPlus, Calendar, TrendingUp, RefreshCw, Clock, CheckCircle2, Target, MessageSquare, ExternalLink, BarChart3, Users, Award, DollarSign, AlertTriangle, TrendingDown, Zap } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FunnelVisual from '../../components/FunnelVisual';

import API_URL from '../../config/api';
import socket from '../../config/socket';

const PERIODOS = [
    { key: 'dia', label: 'Hoy', suffix: 'hoy' },
    { key: 'semana', label: 'Semana', suffix: 'esta semana' },
    { key: 'mes', label: 'Mes', suffix: 'este mes' },
    { key: 'total', label: 'Total', suffix: 'en total' },
];

const EMPTY_PERIODO = { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: 0 };
const INITIAL_PROSPECTOR_DATA = {
    embudo: { prospecto_nuevo: 0, en_contacto: 0, reunion_agendada: 0, transferidos: 0, total: 0 },
    tasasConversion: { contacto: 0, agendamiento: 0 },
    periodos: { dia: EMPTY_PERIODO, semana: EMPTY_PERIODO, mes: EMPTY_PERIODO, total: EMPTY_PERIODO }
};

const INITIAL_CLOSER_DATA = {
    embudo: { reunion_agendada: 0, reunion_realizada: 0, propuesta_enviada: 0, venta_ganada: 0 },
    metricas: {
        reuniones: { hoy: 0, pendientes: 0, realizadas: 0, realizadasHoy: 0, propuestasHoy: 0 },
        ventas: { mes: 0, montoMes: 0, totales: 0, montoTotal: 0, ventasHoy: 0 },
    },
    tasasConversion: { asistencia: 0, interes: 0, cierre: 0 },
    analisisPerdidas: { no_asistio: 0, no_interesado: 0 }
};

const getAuthHeaders = () => ({ 'x-auth-token': localStorage.getItem('token') || '' });

const VendedorDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [prospectorData, setProspectorData] = useState(null);
    const [closerData, setCloserData] = useState(null);
    const [tareas, setTareas] = useState([]);
    const [reuniones, setReuniones] = useState([]);
    const [loadingTareas, setLoadingTareas] = useState(false);
    const [loadingReuniones, setLoadingReuniones] = useState(false);
    const [periodo, setPeriodo] = useState('dia');
    const navigate = useNavigate();

    const sanitizeCloserData = (rawData) => {
        if (!rawData) return INITIAL_CLOSER_DATA;
        const getNumero = (val) => { const num = parseFloat(val); return isNaN(num) || num === null ? 0 : num; };
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
                }
            },
            tasasConversion: {
                asistencia: getNumero(rawData?.tasasConversion?.asistencia),
                interes: getNumero(rawData?.tasasConversion?.interes),
                cierre: getNumero(rawData?.tasasConversion?.cierre)
            },
            analisisPerdidas: {
                no_asistio: getNumero(rawData?.analisisPerdidas?.no_asistio),
                no_interesado: getNumero(rawData?.analisisPerdidas?.no_interesado)
            }
        };
    };

    const cargarDatos = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            // Cargar datos de prospector para la vista unificada (usamos la misma API ya que el rol vendedor tendrá acceso a sus propios datos como prospector)
            try {
                const resP = await axios.get(`${API_URL}/api/prospector/dashboard`, { headers: getAuthHeaders() });
                let rawP = resP.data;
                if (!rawP.periodos) {
                    rawP.periodos = {
                        dia: { llamadas: rawP.metricas?.llamadas?.hoy || 0, mensajes: rawP.metricas?.correosEnviados || 0, prospectos: rawP.metricas?.prospectosHoy || 0, reuniones: rawP.metricas?.reunionesAgendadas?.hoy || 0 },
                        semana: { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: rawP.metricas?.reunionesAgendadas?.semana || 0 },
                        mes: { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: 0 },
                        total: { llamadas: rawP.metricas?.llamadas?.totales || 0, mensajes: 0, prospectos: rawP.embudo?.total || 0, reuniones: rawP.metricas?.reunionesAgendadas?.totales || 0 }
                    };
                }
                setProspectorData(rawP);
            } catch (e) {
                console.error('Error prospector data:', e);
                setProspectorData(INITIAL_PROSPECTOR_DATA);
            }

            // Cargar datos de closer para la sección de cierre (usamos la API de closer)
            try {
                const resC = await axios.get(`${API_URL}/api/closer/dashboard`, { headers: getAuthHeaders() });
                setCloserData(sanitizeCloserData(resC.data));
            } catch (e) {
                console.error('Error closer data:', e);
                setCloserData(INITIAL_CLOSER_DATA);
            }

        } catch (error) {
            console.error('Error cargando dashboard unificado', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const cargarListas = async (silent = false) => {
        if (!silent) {
            setLoadingTareas(true);
            setLoadingReuniones(true);
        }
        try {
            // Tareas pendientes
            const resT = await axios.get(`${API_URL}/api/tareas`, { headers: getAuthHeaders() });
            setTareas(resT.data);
            if (!silent) setLoadingTareas(false);

            // Próximas reuniones
            try {
                const resR = await axios.get(`${API_URL}/api/closer/calendario`, { headers: getAuthHeaders() });
                const ahora = new Date();
                const proximas = resR.data.filter(r => {
                    const fecha = new Date(r.fecha);
                    const esPendiente = r.resultado === 'pendiente' || !r.resultado;
                    return fecha >= ahora && esPendiente;
                });
                proximas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                setReuniones(proximas.slice(0, 3));
            } catch (e) {
                console.error('Error calendario data:', e);
            }
            if (!silent) setLoadingReuniones(false);

        } catch (error) {
            console.error('Error al cargar listas:', error);
            setLoadingTareas(false);
            setLoadingReuniones(false);
        }
    };

    const completarTarea = async (id) => {
        try {
            await axios.put(`${API_URL}/api/tareas/${id}`, { estado: 'completada' }, { headers: getAuthHeaders() });
            setTareas(prev => prev.map(t => (t.id === id || t._id === id) ? { ...t, estado: 'completada' } : t));
        } catch (error) {
            console.error('Error al completar tarea:', error);
        }
    };

    useEffect(() => {
        cargarDatos();
        cargarListas();

        const interval = setInterval(() => {
            cargarDatos(true);
            cargarListas(true);
        }, 5 * 60 * 1000);

        socket.on('prospectos_actualizados', (obj) => {
            cargarDatos(true);
            cargarListas(true);
        });

        return () => {
            clearInterval(interval);
            socket.off('prospectos_actualizados');
        };
    }, []);

    if (loading || !prospectorData || !closerData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-(--theme-500) animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando dashboard unificado...</p>
                </div>
            </div>
        );
    }

    const mP = prospectorData.periodos?.[periodo] || EMPTY_PERIODO;
    const tareasPendientes = tareas.filter(t => t.estado === 'pendiente');

    return (
        <div className="h-full flex flex-col p-5 overflow-y-auto overflow-x-hidden space-y-6 bg-gray-50/50">
            {/* --- SECCIÓN 1: PROSPECCIÓN --- */}
            <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-(--theme-600)" />
                        Rendimiento de Prospección
                    </h2>
                    {/* Tabs de período para prospección */}
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                        {PERIODOS.map(p => (
                            <button
                                key={p.key}
                                onClick={() => setPeriodo(p.key)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${periodo === p.key
                                    ? 'bg-(--theme-50) text-(--theme-600) shadow-sm border border-(--theme-100)'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-4">
                             <FunnelVisual
                                stages={[
                                    {
                                        etapa: 'Prospectos',
                                        cantidad: prospectorData.embudo.total,
                                        color: 'bg-blue-500',
                                        contadorHoy: prospectorData.periodos?.[periodo]?.prospectos ?? 0,
                                        labelContador: `recibidos ${PERIODOS.find(p => p.key === periodo)?.suffix || 'hoy'}`,
                                        cantidadExito: prospectorData.embudo.en_contacto,
                                        cantidadPerdida: prospectorData.embudo.total - prospectorData.embudo.en_contacto,
                                        porcentajeExito: prospectorData.tasasConversion.contacto,
                                        porcentajePerdida: (100 - prospectorData.tasasConversion.contacto).toFixed(1),
                                        labelExito: 'contactados',
                                        labelPerdida: 'sin contacto'
                                    },
                                    {
                                        etapa: 'Llamadas/Contacto',
                                        cantidad: prospectorData.embudo.en_contacto,
                                        color: 'bg-indigo-500',
                                        contadorHoy: prospectorData.periodos?.[periodo]?.calls ?? prospectorData.periodos?.[periodo]?.llamadas ?? 0,
                                        labelContador: `llamadas ${PERIODOS.find(p => p.key === periodo)?.suffix || 'hoy'}`,
                                        cantidadExito: prospectorData.embudo.reunion_agendada,
                                        cantidadPerdida: prospectorData.embudo.en_contacto - prospectorData.embudo.reunion_agendada,
                                        porcentajeExito: prospectorData.tasasConversion.agendamiento,
                                        porcentajePerdida: (100 - prospectorData.tasasConversion.agendamiento).toFixed(1),
                                        labelExito: 'agendan cita',
                                        labelPerdida: 'no agendan'
                                    },
                                    {
                                        etapa: 'Citas Agendadas',
                                        cantidad: prospectorData.embudo.reunion_agendada,
                                        color: 'bg-emerald-500',
                                        contadorHoy: prospectorData.periodos?.[periodo]?.reunions ?? prospectorData.periodos?.[periodo]?.reuniones ?? 0,
                                        labelContador: `agendadas ${PERIODOS.find(p => p.key === periodo)?.suffix || 'hoy'}`,
                                        cantidadExito: prospectorData.embudo.reunion_agendada,
                                        porcentajeExito: 100,
                                        labelExito: 'listas para cierre'
                                    }
                                ]}
                                type="prospector"
                            />
                        </div>
                        {/* Metrics Prospección */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white border text-center border-gray-200 rounded-xl p-4 shadow-sm">
                                <Phone className="w-6 h-6 mx-auto text-indigo-500 mb-2" />
                                <div className="text-2xl font-bold text-gray-900">{mP.llamadas}</div>
                                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">Llamadas</div>
                            </div>
                            <div className="bg-white border text-center border-gray-200 rounded-xl p-4 shadow-sm">
                                <UserPlus className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                                <div className="text-2xl font-bold text-gray-900">{mP.prospectos}</div>
                                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">Prospectos</div>
                            </div>
                            <div className="bg-white border text-center border-gray-200 rounded-xl p-4 shadow-sm">
                                <MessageSquare className="w-6 h-6 mx-auto text-purple-500 mb-2" />
                                <div className="text-2xl font-bold text-gray-900">{mP.mensajes}</div>
                                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">Mensajes</div>
                            </div>
                            <div className="bg-white border text-center border-gray-200 rounded-xl p-4 shadow-sm">
                                <Calendar className="w-6 h-6 mx-auto text-emerald-500 mb-2" />
                                <div className="text-2xl font-bold text-gray-900">{mP.reuniones}</div>
                                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">Citas Agendadas</div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Tareas (Prospección) */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col max-h-[500px]">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 shrink-0">
                            <Target className="w-5 h-5 text-indigo-500" /> Tareas Pendientes
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3" style={{ scrollbarWidth: 'thin' }}>
                            {loadingTareas ? (
                                <div className="flex justify-center p-4"><RefreshCw className="animate-spin text-gray-400 w-5 h-5" /></div>
                            ) : tareasPendientes.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">No hay tareas pendientes.</p>
                            ) : (
                                tareasPendientes.map(t => (
                                    <div key={t.id || t._id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 group">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 truncate pr-2">{t.titulo}</div>
                                                <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{t.descripcion}</div>
                                                {t.clienteNombre && (
                                                    <div className="text-[10px] uppercase font-bold text-(--theme-600) mt-1">👤 {t.clienteNombre}</div>
                                                )}
                                            </div>
                                            <button onClick={() => completarTarea(t.id || t._id)} className="text-gray-400 hover:text-green-500 transition-colors">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <hr className="border-gray-200/60 my-2" />

            {/* --- SECCIÓN 2: CIERRE --- */}
            <div className="flex flex-col space-y-4 pb-10">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Award className="w-6 h-6 text-amber-500" />
                    Rendimiento de Cierre
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-4">
                            <FunnelVisual
                                stages={[
                                    {
                                        etapa: 'Reuniones Realizadas',
                                        cantidad: closerData.embudo.reunion_realizada,
                                        color: 'bg-cyan-500',
                                        contadorHoy: closerData.metricas.reuniones.realizadasHoy,
                                        labelContador: 'hoy',
                                        cantidadExito: closerData.embudo.propuesta_enviada,
                                        cantidadPerdida: closerData.analisisPerdidas.no_interesado,
                                        porcentajeExito: Math.round(closerData.tasasConversion.interes) || 0,
                                        porcentajePerdida: closerData.embudo.reunion_realizada > 0 ? ((closerData.analisisPerdidas.no_interesado / closerData.embudo.reunion_realizada) * 100).toFixed(1) : 0,
                                        labelExito: 'piden propuesta',
                                        labelPerdida: 'no interesados'
                                    },
                                    {
                                        etapa: 'Propuestas Enviadas',
                                        cantidad: closerData.embudo.propuesta_enviada,
                                        color: 'bg-orange-500',
                                        contadorHoy: closerData.metricas.reuniones.propuestasHoy,
                                        labelContador: 'hoy',
                                        cantidadExito: closerData.embudo.venta_ganada,
                                        cantidadPerdida: closerData.embudo.propuesta_enviada - closerData.embudo.venta_ganada,
                                        porcentajeExito: Math.round(closerData.tasasConversion.cierre) || 0,
                                        porcentajePerdida: closerData.embudo.propuesta_enviada > 0 ? (((closerData.embudo.propuesta_enviada - closerData.embudo.venta_ganada) / closerData.embudo.propuesta_enviada) * 100).toFixed(1) : 0,
                                        labelExito: 'aceptada',
                                        labelPerdida: 'rechazada o en proceso'
                                    },
                                    {
                                        etapa: 'Ventas Cerradas',
                                        cantidad: closerData.embudo.venta_ganada,
                                        color: 'bg-green-500',
                                        contadorHoy: closerData.metricas.ventas.ventasHoy,
                                        labelContador: 'hoy',
                                        cantidadExito: closerData.embudo.venta_ganada,
                                        porcentajeExito: 100,
                                        labelExito: 'ganadas'
                                    }
                                ]}
                                type="closer"
                            />
                        </div>
                        {/* Metrics Cierre */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <div className="bg-white border text-center border-gray-200 rounded-xl p-4 shadow-sm">
                                <TrendingUp className="w-6 h-6 mx-auto text-green-500 mb-2" />
                                <div className="text-2xl font-bold text-gray-900">{Math.round(closerData.tasasConversion.cierre) || 0}%</div>
                                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">Tasa Cierre</div>
                            </div>
                            <div className="bg-white border text-center border-gray-200 rounded-xl p-4 shadow-sm">
                                <DollarSign className="w-6 h-6 mx-auto text-amber-500 mb-2" />
                                <div className="text-xl font-bold text-gray-900">${(closerData.metricas.ventas.montoMes || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}</div>
                                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">Monto Mensual</div>
                            </div>
                            <div className="bg-white border text-center border-gray-200 rounded-xl p-4 shadow-sm">
                                <Award className="w-6 h-6 mx-auto text-pink-500 mb-2" />
                                <div className="text-2xl font-bold text-gray-900">{closerData.metricas.ventas.mes}</div>
                                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">Ventas Mensuales</div>
                            </div>
                            <div className="bg-white border text-center border-gray-200 rounded-xl p-4 shadow-sm">
                                <CheckCircle2 className="w-6 h-6 mx-auto text-cyan-500 mb-2" />
                                <div className="text-2xl font-bold text-gray-900">{Math.round(closerData.tasasConversion.asistencia) || 0}%</div>
                                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">Tasa Asistencia</div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Reuniones (Cierre) */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col max-h-[500px]">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 shrink-0">
                            <Clock className="w-5 h-5 text-amber-500" /> Próximas Citas
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3" style={{ scrollbarWidth: 'thin' }}>
                            {loadingReuniones ? (
                                <div className="flex justify-center p-4"><RefreshCw className="animate-spin text-gray-400 w-5 h-5" /></div>
                            ) : reuniones.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">Libre de reuniones.</p>
                            ) : (
                                reuniones.map(r => (
                                    <div key={r.id || r._id} className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 group">
                                        <div className="text-sm font-bold text-gray-900 truncate">{r.cliente?.nombres} {r.cliente?.apellidoPaterno}</div>
                                        <div className="flex justify-between items-center mt-2">
                                            <div className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                                                {new Date(r.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {r.cliente?.telefono && <div className="text-[10px] text-gray-500">📞 {r.cliente.telefono}</div>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default VendedorDashboard;
