import React, { useState, useEffect } from 'react';
import { Calendar, Phone, UserPlus, RefreshCw, CheckCircle2, DollarSign, Target, Clock, ExternalLink, TrendingUp, Briefcase, Zap, Star } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import API_URL from '../../config/api';
import socket from '../../config/socket';

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

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
                axios.get(`${API_URL}/api/doctor/dashboard`, config).catch(() => ({ data: {} })),
                axios.get(`${API_URL}/api/doctor/dashboard-extra`, config).catch(() => ({ data: {} })),
                axios.get(`${API_URL}/api/tareas`, config).catch(() => ({ data: [] })),
                axios.get(`${API_URL}/api/doctor/calendario`, config).catch(() => ({ data: [] }))
            ]);

            const pData = prospectorRes.data;
            const cData = closerRes.data;

            setProspectorData(pData);

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
            cargarDatosDashboard(true);
        });

        return () => {
            clearInterval(interval);
            socket.off('prospectos_actualizados');
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
                        <RefreshCw className="w-16 h-16 text-white animate-spin" />
                    </div>
                    <p className="text-white/90 font-semibold text-lg">Cargando tu espacio de trabajo...</p>
                </div>
            </div>
        );
    }

    const tareasPendientes = tareas.filter(t => t.estado === 'pendiente');

    // KPI card configs
    const kpiCards = [
        {
            icon: UserPlus,
            value: kpis.prospectosHoy,
            label: 'Prospectos Hoy',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            glow: 'rgba(102,126,234,0.35)',
            badge: null,
        },
        {
            icon: Phone,
            value: kpis.llamadasHoy,
            label: 'Llamadas Hoy',
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            glow: 'rgba(245,87,108,0.35)',
            badge: null,
        },
        {
            icon: Calendar,
            value: kpis.citasHoy,
            label: 'Agendadas Hoy',
            gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            glow: 'rgba(79,172,254,0.35)',
            badge: kpis.citasPendientes > 0 ? `${kpis.citasPendientes} PENDIENTES` : null,
            badgeColor: 'rgba(255,255,255,0.25)',
        },
        {
            icon: TrendingUp,
            value: kpis.negociacionesActivas,
            label: 'En Negociación',
            gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            glow: 'rgba(250,112,154,0.35)',
            badge: null,
        },
        {
            icon: Target,
            value: `${kpis.tasaEfectividad}%`,
            label: 'Cierre Global',
            gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
            glow: 'rgba(161,140,209,0.35)',
            badge: null,
        },
        {
            icon: DollarSign,
            value: `$${(kpis.montoMes || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`,
            label: 'Ventas del Mes',
            gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            glow: 'rgba(67,233,123,0.35)',
            badge: kpis.ventasMes > 0 ? `${kpis.ventasMes} ventas` : null,
            badgeColor: 'rgba(255,255,255,0.25)',
        },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden" style={{ background: 'linear-gradient(160deg, #f8faff 0%, #eef2ff 50%, #f0fdf4 100%)' }}>

            {/* ═══ Header ═══ */}
            <div className="px-6 pt-2 pb-1 shrink-0">
                <div className="flex items-center gap-3">

                </div>
            </div>

            <div className="flex-1 flex flex-col px-6 pb-6 gap-5 overflow-hidden min-h-0">

                {/* ═══ KPI Cards ═══ */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 shrink-0">
                    {kpiCards.map((card, i) => {
                        const Icon = card.icon;
                        return (
                            <div
                                key={i}
                                className="relative rounded-2xl p-4 text-center overflow-hidden flex flex-col items-center justify-center"
                                style={{
                                    background: card.gradient,
                                    boxShadow: `0 8px 24px ${card.glow}, 0 2px 8px rgba(0,0,0,0.06)`,
                                }}
                            >
                                {/* Shiny overlay */}
                                <div className="absolute inset-0 pointer-events-none" style={{
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 60%)',
                                }} />

                                <div className="relative z-10 mb-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.22)' }}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <span className="relative z-10 block text-2xl font-black text-white mb-0.5 drop-shadow">
                                    {card.value}
                                </span>
                                <p className="relative z-10 text-white/80 text-[10px] font-bold uppercase tracking-wider">
                                    {card.label}
                                </p>
                                {card.badge && (
                                    <span className="relative z-10 mt-1.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white/90" style={{ background: card.badgeColor || 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
                                        {card.badge}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ═══ Main Content ═══ */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-0">

                    {/* ═══ Columna Izquierda: Metas y Tareas ═══ */}
                    <div className="rounded-2xl flex flex-col overflow-hidden min-h-0" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(255,255,255,0.9)' }}>
                        {/* Card header */}
                        <div className="px-6 pt-5 pb-4 shrink-0 border-b border-slate-100">
                            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                                <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', boxShadow: '0 4px 12px rgba(102,126,234,0.3)' }}>
                                    <Target className="w-4 h-4 text-white" />
                                </div>
                                Metas y Tareas Pendientes
                            </h2>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5" style={{ scrollbarWidth: 'thin' }}>
                            {/* Progress Bars */}
                            <div className="space-y-4">
                                {/* Meta: Llamadas */}
                                <div>
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
                                        <span className="flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5 text-pink-400" />
                                            Meta: 12 Llamadas Diarias
                                        </span>
                                        <span className={kpis.llamadasHoy >= 12 ? 'text-emerald-600 font-black' : 'text-slate-400'}>
                                            {kpis.llamadasHoy} / 12
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="h-2.5 rounded-full transition-all duration-700"
                                            style={{
                                                width: `${Math.min((kpis.llamadasHoy / 12) * 100, 100)}%`,
                                                background: 'linear-gradient(90deg, #f093fb, #f5576c)',
                                                boxShadow: '0 0 8px rgba(245,87,108,0.5)'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Meta: Prospectos */}
                                <div>
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
                                        <span className="flex items-center gap-1.5">
                                            <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                                            Meta: 1 Paciente Diario
                                        </span>
                                        <span className={kpis.prospectosHoy >= 1 ? 'text-emerald-600 font-black' : 'text-slate-400'}>
                                            {kpis.prospectosHoy} / 1
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="h-2.5 rounded-full transition-all duration-700"
                                            style={{
                                                width: `${Math.min((kpis.prospectosHoy / 1) * 100, 100)}%`,
                                                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                                                boxShadow: '0 0 8px rgba(102,126,234,0.5)'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-slate-100" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tareas</span>
                                <div className="flex-1 h-px bg-slate-100" />
                            </div>

                            {/* Tareas */}
                            <div className="space-y-3">
                                {tareasPendientes.length === 0 ? (
                                    <div className="text-center py-8 flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #43e97b, #38f9d7)', boxShadow: '0 8px 20px rgba(67,233,123,0.3)' }}>
                                            <CheckCircle2 className="w-8 h-8 text-white" />
                                        </div>
                                        <p className="text-slate-500 text-sm font-semibold">¡Al día! No hay tareas pendientes.</p>
                                    </div>
                                ) : (
                                    tareasPendientes.map((t) => {
                                        const prospectoId = t.cliente || t.clienteId;
                                        const irAProspecto = prospectoId
                                            ? () => navigate('/closer/prospectos', { state: { selectedId: prospectoId } })
                                            : null;

                                        return (
                                            <div
                                                key={t.id || t._id}
                                                className={`rounded-xl p-4 flex items-center justify-between group transition-all duration-200 ${irAProspecto ? 'cursor-pointer' : ''}`}
                                                style={{ background: 'rgba(248,250,255,0.8)', border: '1px solid rgba(102,126,234,0.12)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
                                                onClick={irAProspecto || undefined}
                                                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(102,126,234,0.4)'}
                                                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(102,126,234,0.12)'}
                                            >
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${t.prioridad === 'alta' ? 'bg-rose-500' : 'bg-indigo-400'}`} style={{ boxShadow: t.prioridad === 'alta' ? '0 0 6px rgba(239,68,68,0.5)' : '0 0 6px rgba(99,102,241,0.5)' }} />
                                                        <h3 className="font-bold text-slate-800 text-sm truncate">{t.titulo}</h3>
                                                    </div>
                                                    <p className="text-xs text-slate-500 line-clamp-1">{t.descripcion}</p>
                                                    {(t.clienteNombre || irAProspecto) && (
                                                        <p className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                                                            <Briefcase className="w-3 h-3" />
                                                            {t.clienteNombre ? `${t.clienteNombre} ${t.clienteApellido || ''}` : 'Ver paciente'}
                                                            <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); completarTarea(t.id || t._id); }}
                                                    className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all duration-200"
                                                    style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', boxShadow: '0 2px 6px rgba(16,185,129,0.1)' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #43e97b, #38f9d7)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'transparent'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; e.currentTarget.style.color = '#10b981'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.25)'; }}
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
                    <div className="rounded-2xl flex flex-col overflow-hidden min-h-0" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(255,255,255,0.9)' }}>
                        {/* Card header */}
                        <div className="px-6 pt-5 pb-4 shrink-0 border-b border-slate-100">
                            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                                <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)', boxShadow: '0 4px 12px rgba(79,172,254,0.3)' }}>
                                    <Clock className="w-4 h-4 text-white" />
                                </div>
                                Agenda de Hoy — Próximas Reuniones
                            </h2>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                            {proximasReuniones.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 pb-8">
                                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)', boxShadow: '0 12px 30px rgba(79,172,254,0.3)' }}>
                                        <Calendar className="w-10 h-10 text-white" />
                                    </div>
                                    <p className="text-slate-500 text-sm font-semibold">No tienes reuniones próximas agendadas.</p>
                                </div>
                            ) : (
                                proximasReuniones.map((t, idx) => {
                                    let meetLink = null;
                                    if (t.notas) {
                                        const meetMatch = t.notas.match(/https:\/\/(?:meet\.google\.com|us\d+web\.zoom\.us\/j)\/[^\s]+/i);
                                        if (meetMatch) meetLink = meetMatch[0];
                                    }

                                    const gradients = [
                                        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                    ];
                                    const glows = ['rgba(79,172,254,0.2)', 'rgba(102,126,234,0.2)', 'rgba(245,87,108,0.2)'];

                                    return (
                                        <div
                                            key={t.id || t._id}
                                            className="rounded-2xl p-5 text-left flex flex-col relative overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
                                            style={{
                                                background: 'rgba(248,252,255,0.9)',
                                                border: '1px solid rgba(79,172,254,0.15)',
                                                boxShadow: `0 4px 20px ${glows[idx % 3]}`
                                            }}
                                        >
                                            {/* Colored left accent bar */}
                                            <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" style={{ background: gradients[idx % 3] }} />

                                            {/* Time badge */}
                                            <div
                                                className="absolute top-4 right-4 font-black text-sm px-3 py-1.5 rounded-xl text-white"
                                                style={{ background: gradients[idx % 3], boxShadow: `0 4px 12px ${glows[idx % 3]}` }}
                                            >
                                                {new Date(t.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                            </div>

                                            <div className="pl-4 pr-24">
                                                <h3 className="font-black text-slate-800 text-base mb-1.5 truncate">
                                                    {t.cliente?.nombres} {t.cliente?.apellidoPaterno}
                                                </h3>
                                                {t.cliente?.empresa && (
                                                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 mb-3 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
                                                        <Briefcase className="w-3 h-3" /> {t.cliente.empresa}
                                                    </span>
                                                )}
                                            </div>

                                            {t.notas && (
                                                <div className="pl-4 text-sm text-slate-600 bg-white/80 p-3 rounded-xl border border-slate-100 italic line-clamp-2 mt-1 ml-4 mr-0" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                                    {t.notas}
                                                </div>
                                            )}

                                            {meetLink && (
                                                <a
                                                    href={meetLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-4 ml-4 w-auto font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm active:scale-[0.97] transition-transform text-white"
                                                    style={{ background: gradients[idx % 3], boxShadow: `0 6px 16px ${glows[idx % 3]}` }}
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    Unirse a la Reunión
                                                </a>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoctorDashboard;
