import React, { useState, useEffect } from 'react';
import { Calendar, Phone, UserPlus, RefreshCw, CheckCircle2, DollarSign, Target, Clock, ExternalLink, TrendingUp, Briefcase } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import API_URL from '../../config/api';
import socket from '../../config/socket';

const CloserDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [loadingTareas, setLoadingTareas] = useState(false);

    // Datos consolidados
    const [kpis, setKpis] = useState({
        prospectosHoy: 0,
        llamadasHoy: 0,
        citasHoy: 0,
        citasPendientes: 0,
        negociacionesActivas: 0,
        tasaEfectividad: '0.0',
        ventasMes: 0,
        montoMes: 0
    });

    const [prospectorData, setProspectorData] = useState(null);
    const [tareas, setTareas] = useState([]);
    const [proximasReuniones, setProximasReuniones] = useState([]);

    const getAuthHeaders = () => ({
        'x-auth-token': localStorage.getItem('token') || ''
    });

    const cargarDatosDashboard = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const config = { headers: { 'x-auth-token': token } };

            const [prospectorRes, closerRes, tareasRes, reunionesRes] = await Promise.all([
                axios.get(`${API_URL}/api/prospector/dashboard`, config).catch(() => ({ data: {} })),
                axios.get(`${API_URL}/api/closer/dashboard`, config).catch(() => ({ data: {} })),
                axios.get(`${API_URL}/api/tareas`, config).catch(() => ({ data: [] })),
                axios.get(`${API_URL}/api/closer/calendario`, config).catch(() => ({ data: [] }))
            ]);

            const pData = prospectorRes.data;
            const cData = closerRes.data;

            setProspectorData(pData);

            // Establecer KPIs combinados
            setKpis({
                prospectosHoy: pData.periodos?.dia?.prospectos || 0,
                llamadasHoy: pData.periodos?.dia?.llamadas || 0,
                citasHoy: pData.periodos?.dia?.reuniones || 0,
                citasPendientes: cData.metricas?.reuniones?.pendientes || 0,
                negociacionesActivas: cData.metricas?.negociaciones?.activas || 0,
                tasaEfectividad: cData.tasasConversion?.global || '0.0',
                ventasMes: cData.metricas?.ventas?.mes || 0,
                montoMes: cData.metricas?.ventas?.montoMes || 0
            });

            setTareas(tareasRes.data || []);

            // Filtrar reuniones futuras (top 3)
            const ahora = new Date();
            const reunionesFuturas = (reunionesRes.data || [])
                .filter(r => new Date(r.fecha) >= ahora && (r.resultado === 'pendiente' || !r.resultado))
                .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
                .slice(0, 3);

            setProximasReuniones(reunionesFuturas);

        } catch (error) {
            console.error('Error al cargar datos combinados:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const completarTarea = async (id) => {
        try {
            await axios.put(`${API_URL}/api/tareas/${id}`, { estado: 'completada' }, { headers: getAuthHeaders() });
            setTareas(prev => prev.map(t => (t.id === id || t._id === id) ? { ...t, estado: 'completada' } : t));
            setTimeout(() => cargarDatosDashboard(true), 1000);
        } catch (error) {
            console.error('Error al completar tarea:', error);
        }
    };

    useEffect(() => {
        cargarDatosDashboard();
        const interval = setInterval(() => {
            cargarDatosDashboard(true);
        }, 5 * 60 * 1000);

        socket.on('prospectos_actualizados', () => {
            console.log('socket: prospectos_actualizados');
            cargarDatosDashboard(true);
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
                    <RefreshCw className="w-12 h-12 text-blue-900 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Cargando tu espacio de trabajo...</p>
                </div>
            </div>
        );
    }

    const tareasPendientes = tareas.filter(t => t.estado === 'pendiente');

    return (
        <div className="h-full flex flex-col p-5 sm:p-8 overflow-hidden bg-slate-50/50">

            {/* ═══ Header ═══ */}
            <div className="mb-6 flex-shrink-0">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Mi Día</h1>
                <p className="text-slate-500 text-sm font-medium">Resumen de prospectos, tareas y agenda.</p>
            </div>

            <div className="flex-1 flex flex-col space-y-6 overflow-hidden min-h-0">

                {/* ═══ KPIs (Fila Superior) ═══ */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 flex-shrink-0">

                    {/* KPI 1: Prospectos */}
                    <div className="bg-white border text-center border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-center mb-2">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                <UserPlus className="w-5 h-5" />
                            </div>
                        </div>
                        <span className="block text-2xl font-black text-slate-800 mb-0.5">{kpis.prospectosHoy}</span>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Prospectos Hoy</p>
                    </div>

                    {/* KPI 2: Llamadas */}
                    <div className="bg-white border text-center border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-center mb-2">
                            <div className="p-2.5 bg-blue-50 text-blue-900 rounded-xl">
                                <Phone className="w-5 h-5" />
                            </div>
                        </div>
                        <span className="block text-2xl font-black text-slate-800 mb-0.5">{kpis.llamadasHoy}</span>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Llamadas Hoy</p>
                    </div>

                    {/* KPI 3: Citas Agendadas */}
                    <div className="bg-white border text-center border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-center mb-2">
                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Calendar className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="flex items-end justify-center gap-2 mb-0.5">
                            <span className="block text-2xl font-black text-slate-800">{kpis.citasHoy}</span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                            Agendadas Hoy <span className="bg-indigo-100 text-indigo-700 px-1.5 py-px rounded text-[9px] ml-1">{kpis.citasPendientes} PEND</span>
                        </p>
                    </div>

                    {/* KPI 4: Negociaciones Activas */}
                    <div className="bg-white border text-center border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-center mb-2">
                            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                        </div>
                        <span className="block text-2xl font-black text-slate-800 mb-0.5">{kpis.negociacionesActivas}</span>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">En Negociación</p>
                    </div>

                    {/* KPI 5: Tasa Efectividad */}
                    <div className="bg-white border text-center border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <div className="flex justify-center mb-2 relative z-10">
                            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                                <Target className="w-5 h-5" />
                            </div>
                        </div>
                        <span className="block text-2xl font-black text-slate-800 mb-0.5 relative z-10">{kpis.tasaEfectividad}%</span>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider relative z-10">Cierre Global</p>
                    </div>

                    {/* KPI 6: Ventas Mes */}
                    <div className="bg-white border text-center border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-center mb-2">
                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                                <DollarSign className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="flex items-end justify-center gap-2 mb-0.5">
                            <span className="block text-xl font-black text-slate-800">
                                ${(kpis.montoMes || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                            Ventas Mes <span className="bg-emerald-100 text-emerald-700 px-1.5 py-px rounded text-[9px] ml-1">{kpis.ventasMes}</span>
                        </p>
                    </div>

                </div>

                {/* ═══ Main Content Columns ═══ */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">

                    {/* ═══ Columna Izquierda: Metas y Tareas ═══ */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col overflow-hidden min-h-0">
                        <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 flex-shrink-0">
                            <Target className="w-5 h-5 text-indigo-500" />
                            Metas y Tareas Pendientes
                        </h2>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6" style={{ scrollbarWidth: 'thin' }}>
                            {/* Barras de Progreso */}
                            <div className="space-y-4">
                                {/* Meta 12 llamadas diarias */}
                                <div>
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" /> Meta: 12 Llamadas Diarias
                                        </span>
                                        <span className={kpis.llamadasHoy >= 12 ? 'text-emerald-600' : 'text-slate-500'}>
                                            {kpis.llamadasHoy} / 12
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(((kpis.llamadasHoy) / 12) * 100, 100)}%` }}></div>
                                    </div>
                                </div>

                                {/* Meta 1 prospecto diario */}
                                <div>
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <UserPlus className="w-3.5 h-3.5 text-slate-400" /> Meta: 1 Prospecto Diario
                                        </span>
                                        <span className={kpis.prospectosHoy >= 1 ? 'text-emerald-600' : 'text-slate-500'}>
                                            {kpis.prospectosHoy} / 1
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(((kpis.prospectosHoy) / 1) * 100, 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Tareas */}
                            <div className="space-y-3">
                                {tareasPendientes.length === 0 ? (
                                    <div className="text-center py-6 text-slate-400 text-sm font-medium">
                                        <CheckCircle2 className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                                        Al día. No hay tareas pendientes.
                                    </div>
                                ) : (
                                    tareasPendientes.map((t) => {
                                        const prospectoId = t.cliente || t.clienteId;
                                        const irAProspecto = prospectoId
                                            ? () => navigate('/closer/prospectos', { state: { selectedId: prospectoId } }) // Redirigir siempre a prospectos unificados
                                            : null;

                                        return (
                                            <div
                                                key={t.id || t._id}
                                                className={`bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between group hover:border-indigo-300 transition-colors shadow-sm ${irAProspecto ? 'cursor-pointer' : ''}`}
                                                onClick={irAProspecto || undefined}
                                            >
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`w-2 h-2 rounded-full ${t.prioridad === 'alta' ? 'bg-rose-500' : 'bg-indigo-500'}`}></span>
                                                        <h3 className="font-bold text-slate-800 text-sm truncate">{t.titulo}</h3>
                                                    </div>
                                                    <p className="text-xs text-slate-500 line-clamp-1">{t.descripcion}</p>
                                                    {(t.clienteNombre || irAProspecto) && (
                                                        <p className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                                                            <Briefcase className="w-3 h-3" /> {t.clienteNombre ? `${t.clienteNombre} ${t.clienteApellido || ''}` : 'Ver prospecto'}
                                                            <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); completarTarea(t.id || t._id); }}
                                                    className="bg-white border border-slate-200 text-slate-600 h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shrink-0"
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

                    {/* ═══ Columna Derecha: Próximas Citas ═══ */}
                    <div className="bg-white border text-center border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col overflow-hidden min-h-0">
                        <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center justify-center gap-2 flex-shrink-0">
                            <Clock className="w-5 h-5 text-sky-500" />
                            Agenda de Hoy (Próximas Reuniones)
                        </h2>

                        <div className="flex-1 overflow-y-auto space-y-4" style={{ scrollbarWidth: 'thin' }}>
                            {proximasReuniones.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 pb-8">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                        <Calendar className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <p className="text-sm font-medium">No tienes reuniones próximas agendadas.</p>
                                </div>
                            ) : (
                                proximasReuniones.map((t) => {
                                    let meetLink = null;
                                    if (t.notas) {
                                        const meetMatch = t.notas.match(/https:\/\/(?:meet\.google\.com|us\d+web\.zoom\.us\/j)\/[^\s]+/i);
                                        if (meetMatch) meetLink = meetMatch[0];
                                    }

                                    return (
                                        <div key={t.id || t._id} className="bg-sky-50/50 border border-sky-100 rounded-xl p-5 text-left flex flex-col group hover:border-sky-300 transition-colors relative">

                                            <div className="absolute top-4 right-4 bg-sky-100 text-sky-700 font-black text-sm px-3 py-1.5 rounded-lg border border-sky-200">
                                                {new Date(t.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                            </div>

                                            <div className="pr-20">
                                                <h3 className="font-black text-slate-800 text-base mb-1 truncate">
                                                    {t.cliente?.nombres} {t.cliente?.apellidoPaterno}
                                                </h3>
                                                {t.cliente?.empresa && (
                                                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 mb-3 bg-white px-2 py-0.5 rounded-md border border-slate-100">
                                                        <Briefcase className="w-3 h-3" /> {t.cliente.empresa}
                                                    </span>
                                                )}
                                            </div>

                                            {t.notas && (
                                                <div className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100 italic line-clamp-2 mt-1">
                                                    {t.notas}
                                                </div>
                                            )}

                                            {meetLink && (
                                                <a
                                                    href={meetLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-md shadow-slate-900/20 active:scale-[0.98]"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
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
    );
};

export default CloserDashboard;
