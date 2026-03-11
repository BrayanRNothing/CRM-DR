import React, { useState, useEffect } from 'react';
import { Calendar, Phone, UserPlus, RefreshCw, CheckCircle2, DollarSign, Target, Clock, ExternalLink, TrendingUp, Briefcase } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import API_URL from '../../config/api';
import socket from '../../config/socket';
import { getUser } from '../../utils/authUtils';

const DashboardMain = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [usuario, setUsuario] = useState(null);

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

    const [tareas, setTareas] = useState([]);
    const [proximasReuniones, setProximasReuniones] = useState([]);

    const getAuthHeaders = () => ({
        'x-auth-token': localStorage.getItem('token') || ''
    });

    useEffect(() => {
        const currentUser = getUser();
        if (currentUser) {
            setUsuario(currentUser);
        }
    }, []);

    const cargarDatosDashboard = async (silent = false) => {
        if (!usuario) return;
        if (!silent) setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const config = { headers: { 'x-auth-token': token } };

            const rol = usuario.rol;
            let prospectorData = {};
            let closerData = {};
            let reunionesData = [];

            // Fetch base de tareas (común para todos)
            const tareasRes = await axios.get(`${API_URL}/api/tareas`, config).catch(() => ({ data: [] }));
            setTareas(tareasRes.data || []);

            // Lógica según el rol (admin hereda vista completa tipo doctor)
            if (rol === 'admin' || rol === 'doctor') {
                const [pRes, cRes, rRes] = await Promise.all([
                    axios.get(`${API_URL}/api/prospector/dashboard`, config).catch(() => ({ data: {} })),
                    axios.get(`${API_URL}/api/closer/dashboard`, config).catch(() => ({ data: {} })),
                    axios.get(`${API_URL}/api/closer/calendario`, config).catch(() => ({ data: [] }))
                ]);
                prospectorData = pRes.data;
                closerData = cRes.data;
                reunionesData = rRes.data;

                setKpis({
                    prospectosHoy: prospectorData.periodos?.dia?.prospectos || 0,
                    llamadasHoy: prospectorData.periodos?.dia?.llamadas || 0,
                    citasHoy: prospectorData.periodos?.dia?.reuniones || 0,
                    citasPendientes: closerData.metricas?.reuniones?.pendientes || 0,
                    negociacionesActivas: closerData.metricas?.negociaciones?.activas || 0,
                    tasaEfectividad: closerData.tasasConversion?.global || '0.0',
                    ventasMes: closerData.metricas?.ventas?.mes || 0,
                    montoMes: closerData.metricas?.ventas?.montoMes || 0
                });

            } else if (rol === 'prospector') {
                const [pRes] = await Promise.all([
                    axios.get(`${API_URL}/api/prospector/dashboard`, config).catch(() => ({ data: {} }))
                ]);
                prospectorData = pRes.data;
                // Asumimos estructura del backend
                setKpis(prev => ({
                    ...prev,
                    prospectosHoy: prospectorData.periodos?.dia?.prospectos || prospectorData.metricas?.prospectosHoy || 0,
                    llamadasHoy: prospectorData.periodos?.dia?.llamadas || prospectorData.metricas?.llamadas?.hoy || 0,
                    citasHoy: prospectorData.periodos?.dia?.reuniones || prospectorData.metricas?.reunionesAgendadas?.hoy || 0,
                    tasaEfectividad: prospectorData.tasasConversion?.contacto || '0.0'
                }));

            } else if (rol === 'closer') {
                const [cRes, rRes] = await Promise.all([
                    axios.get(`${API_URL}/api/closer/dashboard`, config).catch(() => ({ data: {} })),
                    axios.get(`${API_URL}/api/closer/calendario`, config).catch(() => ({ data: [] }))
                ]);
                closerData = cRes.data;
                reunionesData = rRes.data;

                setKpis(prev => ({
                    ...prev,
                    prospectosHoy: closerData.metricas?.prospectosNuevosHoy || 0,
                    citasPendientes: closerData.metricas?.reuniones?.pendientes || 0,
                    negociacionesActivas: closerData.metricas?.negociaciones?.activas || 0,
                    tasaEfectividad: closerData.tasasConversion?.global || '0.0',
                    ventasMes: closerData.metricas?.ventas?.mes || 0,
                    montoMes: closerData.metricas?.ventas?.montoMes || 0
                }));
            }

            const ahora = new Date();
            const reunionesFuturas = (reunionesData || [])
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
        if (!usuario) return;
        cargarDatosDashboard();
        const interval = setInterval(() => {
            cargarDatosDashboard(true);
        }, 5 * 60 * 1000);

        socket.on('prospectos_actualizados', () => {
            cargarDatosDashboard(true);
        });

        return () => {
            clearInterval(interval);
            socket.off('prospectos_actualizados');
        };
    }, [usuario]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                        <RefreshCw className="w-16 h-16 text-blue-600 animate-spin" />
                    </div>
                    <p className="text-slate-600 font-semibold text-lg">Cargando tu espacio de trabajo...</p>
                </div>
            </div>
        );
    }

    const tareasPendientes = tareas.filter(t => t.estado === 'pendiente');

    // KPI card configs adaptativas
    const kpiCards = [
        {
            icon: UserPlus, value: kpis.prospectosHoy, label: 'Nuevos Contactos Hoy',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', glow: 'rgba(102,126,234,0.35)',
            show: true
        },
        {
            icon: Phone, value: kpis.llamadasHoy, label: 'Llamadas Hoy',
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', glow: 'rgba(245,87,108,0.35)',
            show: usuario.rol === 'admin' || usuario.rol === 'doctor' || usuario.rol === 'prospector'
        },
        {
            icon: Calendar, value: kpis.citasHoy, label: 'Agendadas Hoy',
            gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', glow: 'rgba(79,172,254,0.35)',
            badge: kpis.citasPendientes > 0 ? `${kpis.citasPendientes} PENDIENTES` : null, badgeColor: 'rgba(255,255,255,0.25)',
            show: true
        },
        {
            icon: TrendingUp, value: kpis.negociacionesActivas, label: 'En Negociación',
            gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', glow: 'rgba(250,112,154,0.35)',
            show: usuario.rol === 'admin' || usuario.rol === 'doctor' || usuario.rol === 'closer'
        },
        {
            icon: Target, value: `${kpis.tasaEfectividad}%`, label: 'Efectividad',
            gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', glow: 'rgba(161,140,209,0.35)',
            show: true
        },
        {
            icon: DollarSign, value: `$${(kpis.montoMes || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, label: 'Ventas del Mes',
            gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', glow: 'rgba(67,233,123,0.35)',
            badge: kpis.ventasMes > 0 ? `${kpis.ventasMes} ventas` : null, badgeColor: 'rgba(255,255,255,0.25)',
            show: usuario.rol === 'admin' || usuario.rol === 'doctor' || usuario.rol === 'closer'
        },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden" style={{ background: 'linear-gradient(160deg, #f8faff 0%, #eef2ff 50%, #f0fdf4 100%)' }}>
            <div className="flex-1 flex flex-col px-6 pt-6 pb-6 gap-5 overflow-hidden min-h-0">

                {/* ═══ KPI Cards ═══ */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 shrink-0">
                    {kpiCards.filter(c => c.show).map((card, i) => {
                        const Icon = card.icon;
                        return (
                            <div key={i} className="relative rounded-2xl p-4 text-center overflow-hidden flex flex-col items-center justify-center"
                                style={{ background: card.gradient, boxShadow: `0 8px 24px ${card.glow}, 0 2px 8px rgba(0,0,0,0.06)` }}>
                                <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 60%)' }} />
                                <div className="relative z-10 mb-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.22)' }}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <span className="relative z-10 block text-2xl font-black text-white mb-0.5 drop-shadow">{card.value}</span>
                                <p className="relative z-10 text-white/80 text-[10px] font-bold uppercase tracking-wider">{card.label}</p>
                                {card.badge && (
                                    <span className="relative z-10 mt-1.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white/90" style={{ background: card.badgeColor, border: '1px solid rgba(255,255,255,0.3)' }}>
                                        {card.badge}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ═══ Main Content ═══ */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-0">
                    {/* Tareas */}
                    <div className="rounded-2xl flex flex-col overflow-hidden min-h-0" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                        <div className="px-6 pt-5 pb-4 shrink-0 border-b border-slate-100">
                            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                                <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', boxShadow: '0 4px 12px rgba(102,126,234,0.3)' }}>
                                    <Target className="w-4 h-4 text-white" />
                                </div>
                                Tareas Pendientes
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 scrollbar-hide">
                            {tareasPendientes.length === 0 ? (
                                <div className="text-center py-8 flex flex-col items-center gap-3">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                    <p className="text-slate-500 text-sm font-semibold">¡Al día! No hay tareas pendientes.</p>
                                </div>
                            ) : (
                                tareasPendientes.map((t) => (
                                    <div key={t.id || t._id} className="rounded-xl p-4 flex items-center justify-between group transition-all" style={{ background: 'rgba(248,250,255,0.8)', border: '1px solid rgba(102,126,234,0.12)' }}>
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${t.prioridad === 'alta' ? 'bg-rose-500' : 'bg-indigo-400'}`} />
                                                <h3 className="font-bold text-slate-800 text-sm truncate">{t.titulo}</h3>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-1">{t.descripcion}</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); completarTarea(t.id || t._id); }} className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white transition-all">
                                            <CheckCircle2 className="w-4 h-4" /> Cerrar
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Próximas Citas */}
                    <div className="rounded-2xl flex flex-col overflow-hidden min-h-0" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                        <div className="px-6 pt-5 pb-4 shrink-0 border-b border-slate-100">
                            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                                <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)', boxShadow: '0 4px 12px rgba(79,172,254,0.3)' }}>
                                    <Clock className="w-4 h-4 text-white" />
                                </div>
                                Agenda — Próximas Reuniones
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-hide">
                            {proximasReuniones.length === 0 ? (
                                <div className="text-center py-8 flex flex-col items-center gap-3">
                                    <Calendar className="w-10 h-10 text-blue-400" />
                                    <p className="text-slate-500 text-sm font-semibold">No tienes reuniones próximas agendadas.</p>
                                </div>
                            ) : (
                                proximasReuniones.map((t, idx) => (
                                    <div key={t.id || t._id} className="rounded-2xl p-5 flex flex-col relative overflow-hidden transition-transform hover:-translate-y-0.5" style={{ background: 'rgba(248,252,255,0.9)', border: '1px solid rgba(79,172,254,0.15)' }}>
                                        <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-blue-500" />
                                        <div className="absolute top-4 right-4 font-black text-sm px-3 py-1.5 rounded-xl bg-blue-500 text-white">
                                            {new Date(t.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="pl-4 pr-24">
                                            <h3 className="font-black text-slate-800 text-base mb-1.5">{t.cliente?.nombres}</h3>
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

export default DashboardMain;
