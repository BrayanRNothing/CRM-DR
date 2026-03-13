import React, { useState, useEffect } from 'react';
import { Phone, UserPlus, Calendar, TrendingUp, RefreshCw, Clock, CheckCircle2, Target, MessageSquare, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FunnelVisual from '../../components/FunnelVisual';

import API_URL from '../../services/api';
import socket from '../../config/socket';

const PERIODOS = [
    { key: 'dia', label: 'Hoy', suffix: 'hoy' },
    { key: 'semana', label: 'Semana', suffix: 'esta semana' },
    { key: 'mes', label: 'Mes', suffix: 'este mes' },
    { key: 'total', label: 'Total', suffix: 'en total' },
];

const EMPTY_PERIODO = { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: 0 };
const EMPTY_DATA = {
    embudo: { prospecto_nuevo: 0, en_contacto: 0, reunion_agendada: 0, transferidos: 0, total: 0 },
    tasasConversion: { contacto: 0, agendamiento: 0 },
    periodos: { dia: EMPTY_PERIODO, semana: EMPTY_PERIODO, mes: EMPTY_PERIODO, total: EMPTY_PERIODO }
};

const getAuthHeaders = () => ({ 'x-auth-token': localStorage.getItem('token') || '' });

const ProspectorDashboard = () => {
    const [data, setData] = useState(null);
    const [tareas, setTareas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingTareas, setLoadingTareas] = useState(false);
    const [sinDatos, setSinDatos] = useState(false);
    const [periodo, setPeriodo] = useState('dia');
    const navigate = useNavigate();

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/prospector/dashboard`, { headers: getAuthHeaders() });
            // Normalizar respuesta para siempre tener `periodos`
            const raw = response.data;
            if (!raw.periodos) {
                // backend viejo: construir periodos desde metricas para compatibilidad
                raw.periodos = {
                    dia: { llamadas: raw.metricas?.llamadas?.hoy || 0, mensajes: raw.metricas?.correosEnviados || 0, prospectos: raw.metricas?.prospectosHoy || 0, reuniones: raw.metricas?.reunionesAgendadas?.hoy || 0 },
                    semana: { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: raw.metricas?.reunionesAgendadas?.semana || 0 },
                    mes: { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: 0 },
                    total: { llamadas: raw.metricas?.llamadas?.totales || 0, mensajes: 0, prospectos: raw.embudo?.total || 0, reuniones: raw.metricas?.reunionesAgendadas?.totales || 0 }
                };
            }
            setData(raw);
            setSinDatos(false);
        } catch (error) {
            console.error('Error al cargar datos:', error);
            setData(EMPTY_DATA);
            setSinDatos(true);
        } finally {
            setLoading(false);
        }
    };

    const cargarTareas = async () => {
        setLoadingTareas(true);
        try {
            const response = await axios.get(`${API_URL}/api/tareas`, { headers: getAuthHeaders() });
            setTareas(response.data);
        } catch (error) {
            console.error('Error al cargar tareas:', error);
        } finally {
            setLoadingTareas(false);
        }
    };

    const completarTarea = async (id) => {
        try {
            await axios.put(`${API_URL}/api/tareas/${id}`, { estado: 'completada' }, { headers: getAuthHeaders() });
            setTareas(prev => prev.map(t => (t.id === id || t._id === id) ? { ...t, estado: 'completada' } : t));
            setTimeout(cargarTareas, 1000);
        } catch (error) {
            console.error('Error al completar tarea:', error);
        }
    };

    useEffect(() => {
        cargarDatos();
        cargarTareas();

        // Polling de 5 minutos como respaldo
        const interval = setInterval(() => {
            cargarDatos();
            cargarTareas();
        }, 5 * 60 * 1000);

        // 🚀 WebSockets Actualización en tiempo real
        socket.on('prospectos_actualizados', (obj) => {
            console.log('socket: prospectos actualizados', obj);
            cargarDatos();
            cargarTareas();
        });

        return () => {
            clearInterval(interval);
            socket.off('prospectos_actualizados');
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-[#14b8a6] animate-spin mx-auto mb-4" />
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

    const m = data.periodos?.[periodo] || EMPTY_PERIODO;
    const tareasPendientes = tareas.filter(t => t.estado === 'pendiente');

    return (
        <div className="h-full flex flex-col p-5 overflow-hidden">
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden min-h-0">

                {/* Header — Embudo + Tabs */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-[#0d9488]" />
                            Embudo de Prospección
                        </h2>

                        {/* Tabs de período */}
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            {PERIODOS.map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => setPeriodo(p.key)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${periodo === p.key
                                        ? 'bg-white text-[#0d9488] shadow-sm border border-gray-200'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {sinDatos && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-md border border-gray-200 font-semibold">
                                Sin datos
                            </span>
                        )}
                    </div>

                    {/* Visualización del Embudo */}
                    <div className="w-full overflow-hidden">
                        <FunnelVisual
                            stages={[
                                {
                                    etapa: 'Prospectos',
                                    cantidad: data.embudo.total,
                                    color: 'bg-blue-500',
                                    contadorHoy: data.periodos?.[periodo]?.prospectos ?? 0,
                                    labelContador: `recibidos ${PERIODOS.find(p => p.key === periodo)?.suffix || 'hoy'}`,
                                    cantidadExito: data.embudo.en_contacto,
                                    cantidadPerdida: data.embudo.total - data.embudo.en_contacto,
                                    porcentajeExito: data.tasasConversion.contacto,
                                    porcentajePerdida: (100 - data.tasasConversion.contacto).toFixed(1),
                                    labelExito: 'contactados',
                                    labelPerdida: 'sin contacto'
                                },
                                {
                                    etapa: 'Llamadas/Contacto',
                                    cantidad: data.embudo.en_contacto,
                                    color: 'bg-blue-800',
                                    contadorHoy: data.periodos?.[periodo]?.calls ?? data.periodos?.[periodo]?.llamadas ?? 0,
                                    labelContador: `llamadas ${PERIODOS.find(p => p.key === periodo)?.suffix || 'hoy'}`,
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
                                    contadorHoy: data.periodos?.[periodo]?.reunions ?? data.periodos?.[periodo]?.reuniones ?? 0,
                                    labelContador: `agendadas ${PERIODOS.find(p => p.key === periodo)?.suffix || 'hoy'}`,
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

                    {/* Left Side: Metrics Grid */}
                    <div className="lg:col-span-2 flex flex-col min-h-0">
                        <div className="grid grid-cols-2 grid-rows-3 gap-4 flex-1">

                            {/* Llamadas */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Phone className="w-8 h-8 text-[#0d9488] mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{m.llamadas}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Llamadas Hechas</p>
                            </div>

                            {/* Prospectos Nuevos */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <UserPlus className="w-8 h-8 text-blue-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{m.prospectos}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Prospectos Nuevos</p>
                            </div>

                            {/* Mensajes */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <MessageSquare className="w-8 h-8 text-purple-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{m.mensajes}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Mensajes Enviados</p>
                            </div>

                            {/* Citas Agendadas */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Calendar className="w-8 h-8 text-green-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{m.reuniones}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Citas Agendadas</p>
                            </div>

                            {/* Tasa de Contacto */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-indigo-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.tasasConversion.contacto}%</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Tasa de Contacto</p>
                            </div>

                            {/* Tasa de Agendamiento */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Target className="w-8 h-8 text-orange-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.tasasConversion.agendamiento}%</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Tasa Agendamiento</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Tasks Sidebar */}
                    <div className="lg:col-span-2 flex flex-col min-h-0">
                        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-md flex flex-col overflow-hidden">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 flex-shrink-0">
                                <Target className="w-6 h-6 text-[#0d9488]" />
                                Metas y Recordatorios
                            </h2>

                            <div className="flex-1 space-y-3 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3b82f6 #f3f4f6' }}>
                                {/* METAS EN MODO STACK */}
                                <div className="space-y-3 mb-6">
                                    {/* Meta 12 llamadas diarias */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                                        <div className="flex justify-between items-center text-xs font-bold text-blue-900 mb-2">
                                            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-blue-600" /> 12 Llamadas Diarias</span>
                                            <span className={data.periodos?.dia?.llamadas >= 12 ? 'text-green-600' : 'text-blue-500'}>
                                                {data.periodos?.dia?.llamadas || 0} / 12
                                            </span>
                                        </div>
                                        <div className="w-full bg-blue-100/50 rounded-full h-1.5">
                                            <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(((data.periodos?.dia?.llamadas || 0) / 12) * 100, 100)}%` }}></div>
                                        </div>
                                    </div>

                                    {/* Meta 1 prospecto diario */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                                        <div className="flex justify-between items-center text-xs font-bold text-blue-900 mb-2">
                                            <span className="flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5 text-blue-600" /> 1 Prospecto Diario</span>
                                            <span className={data.periodos?.dia?.prospectos >= 1 ? 'text-green-600' : 'text-blue-500'}>
                                                {data.periodos?.dia?.prospectos || 0} / 1
                                            </span>
                                        </div>
                                        <div className="w-full bg-blue-100/50 rounded-full h-1.5">
                                            <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(((data.periodos?.dia?.prospectos || 0) / 1) * 100, 100)}%` }}></div>
                                        </div>
                                    </div>

                                    {/* Meta 1 reunión semanal */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                                        <div className="flex justify-between items-center text-xs font-bold text-blue-900 mb-2">
                                            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-600" /> 1 Cita Semanal</span>
                                            <span className={data.periodos?.semana?.reuniones >= 1 ? 'text-green-600' : 'text-blue-500'}>
                                                {data.periodos?.semana?.reuniones || 0} / 1
                                            </span>
                                        </div>
                                        <div className="w-full bg-blue-100/50 rounded-full h-1.5">
                                            <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(((data.periodos?.semana?.reuniones || 0) / 1) * 100, 100)}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                {loadingTareas ? (
                                    <div className="flex justify-center items-center h-20">
                                        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                                    </div>
                                ) : (
                                    tareasPendientes.map((t) => {
                                        const prospectoId = t.cliente || t.clienteId;
                                        const irAProspecto = prospectoId
                                            ? () => navigate('/app/contactos', { state: { selectedId: prospectoId } })
                                            : null;
                                        return (
                                            <div
                                                key={t.id || t._id}
                                                className={`bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center justify-between group hover:border-blue-400 transition-colors shadow-sm ${irAProspecto ? 'cursor-pointer' : ''}`}
                                                onClick={irAProspecto || undefined}
                                            >
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`w-2 h-2 rounded-full ${t.prioridad === 'alta' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                                                        <h3 className="font-bold text-blue-900 text-sm truncate">{t.titulo}</h3>
                                                    </div>
                                                    <p className="text-xs text-blue-700/70 line-clamp-1">{t.descripcion}</p>
                                                    {(t.clienteNombre || irAProspecto) && (
                                                        <p className="flex items-center gap-1 text-[10px] text-blue-600 font-bold mt-1 uppercase tracking-wider">
                                                            👤 {t.clienteNombre ? `${t.clienteNombre} ${t.clienteApellido || ''}` : 'Ver prospecto'}
                                                            <ExternalLink className="w-2.5 h-2.5" />
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Clock className="w-3 h-3 text-blue-400" />
                                                        <span className="text-[10px] text-blue-400 font-medium">
                                                            {t.fechaLimite ? new Date(t.fechaLimite).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : 'Sin fecha'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); completarTarea(t.id || t._id); }}
                                                    className="bg-white border-2 border-blue-500 text-blue-600 h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-500 hover:text-white transition-all shrink-0"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Cerrar
                                                </button>
                                            </div>
                                        );
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

export default ProspectorDashboard;
