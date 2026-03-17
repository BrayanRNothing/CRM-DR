import React, { useState, useEffect } from 'react';
import { Users, Phone, Calendar, TrendingUp, RefreshCw, Activity, Target, AlertCircle, CheckCircle2, X, ChevronRight, ChevronDown, BarChart3, Eye, ArrowLeft } from 'lucide-react';
import axios from 'axios';

import API_URL from '../../config/api';
import socket from '../../config/socket';

const CloserMonitoreoProspectors = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [periodo, setPeriodo] = useState('diario');
    const [usandoMock, setUsandoMock] = useState(false);
    const [selectedProspectorId, setSelectedProspectorId] = useState(null);
    const [viewMode, setViewMode] = useState('cards');
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [prospectosData, setProspectosData] = useState({});
    const [filtroLista, setFiltroLista] = useState('todos'); // 'todos' | 'semana' | 'hoy'
    const [detailProspectos, setDetailProspectos] = useState({ loading: false, todos: [], semana: [] });
    const [expandedTimelineItems, setExpandedTimelineItems] = useState(new Set());
    const [filtroTimeline, setFiltroTimeline] = useState('hoy');

    const seleccionarProspector = (id) => { setSelectedProspectorId(id); setFiltroTimeline('hoy'); };

    const toggleTimelineItem = (key) => {
        setExpandedTimelineItems(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

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
                rendimiento: { estado: 'excelente', color: 'green', descripcion: 'Rendimiento excelente - Cumpliendo metas' },
                detalleHoy: { llamadas: 15, llamadasExitosas: 8, mensajes: 2, citasAgendadas: 2, prospectosRegistrados: 5, estado: 'excelente', color: 'green' },
                detalleSemana: { llamadas: 65, llamadasExitosas: 30, mensajes: 10, citasAgendadas: 9, prospectosRegistrados: 20, estado: 'excelente', color: 'green' }
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
                rendimiento: { estado: 'bueno', color: 'yellow', descripcion: 'Buen rendimiento - En camino' },
                detalleHoy: { llamadas: 8, llamadasExitosas: 3, mensajes: 1, citasAgendadas: 1, prospectosRegistrados: 2, estado: 'bueno', color: 'yellow' },
                detalleSemana: { llamadas: 45, llamadasExitosas: 20, mensajes: 5, citasAgendadas: 5, prospectosRegistrados: 12, estado: 'bueno', color: 'yellow' }
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
                rendimiento: { estado: 'bajo', color: 'orange', descripcion: 'Rendimiento bajo - Necesita atención' },
                detalleHoy: { llamadas: 2, llamadasExitosas: 0, mensajes: 0, citasAgendadas: 0, prospectosRegistrados: 0, estado: 'critico', color: 'red' },
                detalleSemana: { llamadas: 15, llamadasExitosas: 5, mensajes: 2, citasAgendadas: 1, prospectosRegistrados: 4, estado: 'bajo', color: 'orange' }
            }
        ]
    };

    const etapaLabel = (etapa) => {
        const etiquetas = {
            prospecto_nuevo: 'Prospecto Nuevo',
            en_contacto: 'En Contacto',
            reunion_agendada: 'Reunión Agendada',
            transferido: 'Transferido',
            perdido: 'Perdido',
            venta_ganada: 'Venta Ganada',
        };
        return etiquetas[etapa] || etapa;
    };

    const toggleProspectos = async (prospectorId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(prospectorId)) {
            newExpanded.delete(prospectorId);
            setExpandedRows(newExpanded);
            return;
        }
        newExpanded.add(prospectorId);
        setExpandedRows(newExpanded);
        if (prospectosData[prospectorId]) return;
        setProspectosData(prev => ({ ...prev, [prospectorId]: { loading: true, prospectos: [] } }));
        try {
            const response = await axios.get(
                `${API_URL}/api/closer/prospectors/monitoring/${prospectorId}/prospectos`,
                { params: { periodo }, headers: { 'x-auth-token': localStorage.getItem('token') } }
            );
            setProspectosData(prev => ({ ...prev, [prospectorId]: { loading: false, prospectos: response.data.prospectos || [] } }));
        } catch (err) {
            console.error('Error cargando prospectos:', err);
            setProspectosData(prev => ({ ...prev, [prospectorId]: { loading: false, prospectos: [] } }));
        }
    };

    const cargarDatos = async (silent = false) => {
        if (!silent) setLoading(true);
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
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
        setExpandedRows(new Set());
        setProspectosData({});
        const interval = setInterval(() => cargarDatos(true), 5 * 60 * 1000);
        socket.on('prospectos_actualizados', (obj) => {
            cargarDatos(true);
        });
        return () => {
            clearInterval(interval);
            socket.off('prospectos_actualizados');
        };
    }, [periodo]);

    useEffect(() => {
        if (!selectedProspectorId) {
            setDetailProspectos({ loading: false, todos: [], semana: [] });
            return;
        }
        const headers = { 'x-auth-token': localStorage.getItem('token') };
        setDetailProspectos(prev => ({ ...prev, loading: true }));
        Promise.all([
            axios.get(`${API_URL}/api/closer/prospectors/monitoring/${selectedProspectorId}/prospectos`, { params: { periodo: 'todos' }, headers }),
            axios.get(`${API_URL}/api/closer/prospectors/monitoring/${selectedProspectorId}/prospectos`, { params: { periodo: 'semanal' }, headers }),
        ]).then(([rTodos, rSemana]) => {
            setDetailProspectos({
                loading: false,
                todos: rTodos.data.prospectos || [],
                semana: rSemana.data.prospectos || [],
            });
        }).catch(err => {
            console.error('Error cargando prospectos del detalle:', err);
            setDetailProspectos({ loading: false, todos: [], semana: [] });
        });
    }, [selectedProspectorId]);

    // Color helpers aligned with system green theme
    const getColorClasses = (color) => {
        const colors = {
            green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-500 text-white', dot: 'bg-green-500' },
            yellow: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-500 text-white', dot: 'bg-amber-500' },
            orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-500 text-white', dot: 'bg-orange-500' },
            red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-500 text-white', dot: 'bg-red-500' },
            gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-500 text-white', dot: 'bg-gray-500' },
        };
        return colors[color] || colors.green;
    };

    const getEstadoIcon = (estado) => {
        switch (estado) {
            case 'excelente': return <CheckCircle2 className="w-3.5 h-3.5" />;
            case 'bueno': return <TrendingUp className="w-3.5 h-3.5" />;
            case 'bajo': return <AlertCircle className="w-3.5 h-3.5" />;
            case 'critico': return <AlertCircle className="w-3.5 h-3.5" />;
            default: return <Activity className="w-3.5 h-3.5" />;
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-10 h-10 text-green-500 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Cargando monitoreo...</p>
                </div>
            </div>
        );
    }

    if (!data || !data.prospectors || data.prospectors.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 text-sm">No hay datos disponibles</p>
            </div>
        );
    }

    // ── VISTA DETALLE DE PROSPECTOR ──
    const selectedItem = selectedProspectorId ? data.prospectors.find(p => p.prospector.id === selectedProspectorId) : null;

    if (selectedItem) {
        const statsHoy = selectedItem.detalleHoy || {};
        const statsHist = selectedItem.metricas || {};
        const rendimientoHist = selectedItem.rendimiento || {};
        const colorDot = rendimientoHist.color === 'green' ? 'bg-green-500' :
            rendimientoHist.color === 'yellow' ? 'bg-amber-500' :
                rendimientoHist.color === 'orange' ? 'bg-orange-500' : 'bg-red-500';
        const estadoBadge = rendimientoHist.color === 'green' ? 'bg-green-100 text-green-700 border border-green-200' :
            rendimientoHist.color === 'yellow' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                rendimientoHist.color === 'orange' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                    'bg-red-100 text-red-700 border border-red-200';

        return (
            <div className="h-full flex flex-col p-4 gap-3 overflow-hidden">
                {/* Header compacto */}
                <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl px-4 py-3 shadow-sm flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSelectedProspectorId(null)}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 text-gray-500" />
                            </button>
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center relative">
                                <Users className="w-5 h-5 text-gray-400" />
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${colorDot}`} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900">{selectedItem.prospector.nombre}</h2>
                                <p className="text-xs text-gray-400">{selectedItem.prospector.correo}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Filtro período */}
                            <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                                {[['diario', 'Hoy'], ['semanal', 'Semana'], ['mensual', 'Mes']].map(([val, lbl]) => (
                                    <button
                                        key={val}
                                        onClick={() => setPeriodo(val)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${periodo === val ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {lbl}
                                    </button>
                                ))}
                            </div>
                            <span className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold capitalize ${estadoBadge}`}>
                                {getEstadoIcon(rendimientoHist.estado)}
                                {rendimientoHist.estado}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Grid principal */}
                <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
                    {/* Izquierda: métricas de hoy */}
                    <div className="col-span-7 flex flex-col gap-3 min-h-0">
                        {/* 4 KPIs en fila */}
                        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
                            {[
                                { icon: <Users className="w-4 h-4 text-green-600" />, bg: 'bg-green-50', val: statsHoy.prospectosActivos || 0, label: 'Activos', sub: `+${statsHoy.prospectosRegistrados || 0} hoy` },
                                { icon: <Calendar className="w-4 h-4 text-emerald-600" />, bg: 'bg-emerald-50', val: statsHoy.prospectosTransferidos || statsHoy.citasAgendadas || 0, label: 'Citas Agend.', sub: `${((statsHoy.citasAgendadas / (statsHoy.prospectosRegistrados || 1)) * 100).toFixed(0)}% efic.` },
                                { icon: <Phone className="w-4 h-4 text-blue-600" />, bg: 'bg-blue-50', val: statsHoy.llamadas || 0, label: 'Llamadas', sub: `${statsHoy.llamadasExitosas || 0} exitosas` },
                                { icon: <AlertCircle className="w-4 h-4 text-red-500" />, bg: 'bg-red-50', val: statsHoy.prospectosDescartados || 0, label: 'Descartados', sub: `${((statsHoy.prospectosDescartados / (statsHoy.prospectosRegistrados || 1)) * 100).toFixed(0)}% desc.` },
                            ].map((k, i) => (
                                <div key={i} className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl p-3 shadow-sm">
                                    <div className={`w-8 h-8 ${k.bg} rounded-xl flex items-center justify-center mb-2`}>{k.icon}</div>
                                    <p className="text-2xl font-black text-gray-900 leading-none mb-0.5">{k.val}</p>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{k.label}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* Lista de prospectos con filtro */}
                        <div className="flex-1 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col min-h-0">
                            {/* Header con filtro */}
                            <div className="flex items-center justify-between mb-3 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-bold text-gray-800">Prospectos</span>
                                </div>
                                <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                                    <button
                                        onClick={() => setFiltroLista('todos')}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filtroLista === 'todos' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        onClick={() => setFiltroLista('semana')}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filtroLista === 'semana' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Semana
                                    </button>
                                    <button
                                        onClick={() => setFiltroLista('hoy')}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filtroLista === 'hoy' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Hoy
                                    </button>
                                </div>
                            </div>
                            {/* Lista */}
                            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#8bc34a #f3f4f6' }}>
                                {(() => {
                                    if (detailProspectos.loading) {
                                        return (
                                            <div className="flex items-center justify-center h-full gap-2 text-gray-400 text-xs">
                                                <RefreshCw className="w-4 h-4 animate-spin" /> Cargando...
                                            </div>
                                        );
                                    }
                                    const listaHoy = statsHoy.listaProspectosHoy || [];
                                    const lista = filtroLista === 'hoy' ? listaHoy
                                        : filtroLista === 'semana' ? detailProspectos.semana
                                        : detailProspectos.todos;
                                    if (lista.length === 0) {
                                        return (
                                            <div className="flex items-center justify-center h-full">
                                                <p className="text-gray-400 text-xs italic text-center py-8">
                                                    {filtroLista === 'hoy' ? 'No hay prospectos registrados hoy.'
                                                        : filtroLista === 'semana' ? 'No hay prospectos esta semana.'
                                                        : 'No hay prospectos disponibles.'}
                                                </p>
                                            </div>
                                        );
                                    }
                                    return lista.map(p => {
                                        const nombre = p.nombre || [p.nombres, p.apellidoPaterno].filter(Boolean).join(' ') || 'Sin nombre';
                                        return (
                                            <div key={p.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-green-200 transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-green-600 font-bold text-xs flex-shrink-0">
                                                        {nombre.charAt(0) || 'P'}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-800 text-xs leading-tight">{nombre}</p>
                                                        <p className="text-gray-400 text-[10px]">{(p.etapaEmbudo || '').replace(/_/g, ' ')}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.etapaEmbudo === 'perdido' ? 'bg-red-100 text-red-600' :
                                                    p.closerAsignado ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                                                    }`}>
                                                    {p.closerAsignado ? 'Transferido' : p.etapaEmbudo === 'perdido' ? 'Descartado' : 'Activo'}
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Derecha: timeline de actividades */}
                    <div className="col-span-5 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col gap-2 min-h-0">
                        <div className="flex items-center gap-2 shrink-0">
                            <Activity className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-bold text-gray-800">
                                {filtroTimeline === 'hoy' ? 'Actividad de Hoy' : filtroTimeline === 'semana' ? 'Actividad de la Semana' : 'Todo el Historial'}
                            </span>
                            {/* Tabs */}
                            <div className="ml-auto flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
                                {[['hoy','Hoy'],['semana','Semana'],['todo','Todo']].map(([key, label]) => (
                                    <button key={key} onClick={() => setFiltroTimeline(key)}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${
                                            filtroTimeline === key ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                        }`}>{label}</button>
                                ))}
                            </div>
                        </div>

                        {/* Timeline scrollable */}
                        <div className="flex-1 overflow-y-auto min-h-0 pr-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#8bc34a #f3f4f6' }}>
                            {(() => {
                                const statsDetalle = selectedItem;
                                let timeline;
                                if (filtroTimeline === 'hoy') {
                                    timeline = statsHoy.actividadesTimeline || [];
                                } else if (filtroTimeline === 'semana') {
                                    timeline = statsDetalle.detalleSemana?.actividadesTimeline || [];
                                } else {
                                    timeline = statsDetalle.detalleSemana?.actividadesTimelineTodo || [];
                                }
                                const labelVacio = filtroTimeline === 'hoy' ? 'Sin actividad registrada hoy' : filtroTimeline === 'semana' ? 'Sin actividad esta semana' : 'Sin actividad registrada';
                                if (timeline.length === 0) {
                                    return (
                                        <div className="flex flex-col items-center justify-center h-full gap-2 py-6">
                                            <Activity className="w-8 h-8 text-gray-200" />
                                            <p className="text-gray-400 text-xs italic text-center">{labelVacio}</p>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="relative space-y-2 pl-6">
                                        {/* línea vertical */}
                                        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-100 rounded-full" />
                                        {timeline.map((evt, i) => {
                                            const fechaObj = evt.fecha ? new Date(evt.fecha) : null;
                                            const hora = fechaObj ? fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--';
                                            const fecha = fechaObj ? fechaObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : null;
                                            let icon, iconBg, label, detail;
                                            if (evt.tipo === 'prospecto_registrado') {
                                                icon = <Users className="w-3 h-3 text-green-600" />;
                                                iconBg = 'bg-green-100';
                                                label = `Nuevo prospecto registrado`;
                                                detail = evt.nombre || null;
                                            } else if (evt.subTipo === 'llamada') {
                                                const exitosa = evt.resultado === 'exitoso';
                                                icon = <Phone className={`w-3 h-3 ${exitosa ? 'text-blue-600' : 'text-gray-400'}`} />;
                                                iconBg = exitosa ? 'bg-blue-100' : 'bg-gray-100';
                                                label = exitosa ? 'Llamada exitosa' : 'Llamada sin respuesta';
                                                detail = evt.notas || null;
                                            } else if (['whatsapp', 'mensaje', 'correo'].includes(evt.subTipo)) {
                                                icon = <Calendar className="w-3 h-3 text-purple-600" />;
                                                iconBg = 'bg-purple-100';
                                                label = evt.subTipo === 'correo' ? 'Correo enviado' : evt.subTipo === 'whatsapp' ? 'WhatsApp enviado' : 'Mensaje enviado';
                                                detail = evt.notas || null;
                                            } else if (evt.subTipo === 'cita') {
                                                icon = <Calendar className="w-3 h-3 text-emerald-600" />;
                                                iconBg = 'bg-emerald-100';
                                                label = 'Cita agendada';
                                                detail = evt.notas || null;
                                            } else {
                                                icon = <Activity className="w-3 h-3 text-gray-500" />;
                                                iconBg = 'bg-gray-100';
                                                label = evt.subTipo || 'Actividad';
                                                detail = evt.notas || null;
                                            }
                                            const key = `${i}-${evt.fecha}`;
                                            const isExpanded = expandedTimelineItems.has(key);
                                            const isLong = detail && detail.length > 40;
                                            return (
                                                <div key={i} className="relative flex items-start gap-2.5">
                                                    {/* dot */}
                                                    <div className={`absolute -left-6 w-5 h-5 ${iconBg} rounded-full flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0 mt-0.5`}>
                                                        {icon}
                                                    </div>
                                                    <div
                                                        className={`flex-1 min-w-0 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 ${isLong ? 'cursor-pointer hover:border-green-200 hover:bg-green-50/30 transition-colors' : ''}`}
                                                        onClick={() => isLong && toggleTimelineItem(key)}
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-xs font-semibold text-gray-800 truncate">{label}</p>
                                                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                                                                {fecha && (
                                                                    <span className="text-[9px] text-gray-400 font-medium">{fecha}</span>
                                                                )}
                                                                <span className="text-[10px] text-gray-400 font-mono">{hora}</span>
                                                                {isLong && (
                                                                    <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                                )}
                                                            </div>
                                                        </div>
                                                        {evt.prospecto && (
                                                            <p className="text-[10px] text-green-600 font-semibold mt-0.5 flex items-center gap-1">
                                                                <Users className="w-2.5 h-2.5" />{evt.prospecto}
                                                            </p>
                                                        )}
                                                        {detail && (
                                                            <p className={`text-[10px] text-gray-600 mt-1 leading-relaxed ${isExpanded ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
                                                                {detail}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Tasas resumen al fondo */}
                        <div className="grid grid-cols-2 gap-2 shrink-0 pt-1 border-t border-gray-100">
                            <div className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2 text-center">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Contacto</p>
                                <p className="text-base font-black text-gray-800">{statsHist.tasas?.contacto?.toFixed(1) || 0}%</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2 text-center">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Agendado</p>
                                <p className="text-base font-black text-gray-800">{statsHist.tasas?.agendamiento?.toFixed(1) || 0}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── VISTA PRINCIPAL (lista de prospectors) ──
    return (
        <div className="h-full flex flex-col p-4 gap-3 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-tight">Monitoreo de Prospectors</h1>
                        <p className="text-xs text-gray-400">
                            {data.totalProspectors} prospectors activos
                            {usandoMock && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[10px] font-semibold">Demo</span>}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Período */}
                    <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                        {[['diario', 'Hoy'], ['semanal', 'Semana'], ['mensual', 'Mes']].map(([val, lbl]) => (
                            <button
                                key={val}
                                onClick={() => setPeriodo(val)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${periodo === val ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {lbl}
                            </button>
                        ))}
                    </div>
                    {/* Vista */}
                    <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                        <button onClick={() => setViewMode('cards')} className={`px-2.5 py-1.5 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setViewMode('table')} className={`px-2.5 py-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <BarChart3 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    {/* Actualizar */}
                    <button onClick={cargarDatos} className="px-3 py-1.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Resumen KPIs */}
            <div className="grid grid-cols-4 gap-3 flex-shrink-0">
                {[
                    { icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, bg: 'bg-green-50 border-green-200', count: data.prospectors.filter(p => p.rendimiento.estado === 'excelente').length, label: 'Excelente', text: 'text-green-700' },
                    { icon: <TrendingUp className="w-4 h-4 text-amber-600" />, bg: 'bg-amber-50 border-amber-200', count: data.prospectors.filter(p => p.rendimiento.estado === 'bueno').length, label: 'Bueno', text: 'text-amber-700' },
                    { icon: <AlertCircle className="w-4 h-4 text-orange-600" />, bg: 'bg-orange-50 border-orange-200', count: data.prospectors.filter(p => p.rendimiento.estado === 'bajo').length, label: 'Bajo', text: 'text-orange-700' },
                    { icon: <AlertCircle className="w-4 h-4 text-red-600" />, bg: 'bg-red-50 border-red-200', count: data.prospectors.filter(p => p.rendimiento.estado === 'critico').length, label: 'Crítico', text: 'text-red-700' },
                ].map((k, i) => (
                    <div key={i} className={`${k.bg} border rounded-xl p-3 flex items-center gap-3`}>
                        <div className="bg-white rounded-lg w-8 h-8 flex items-center justify-center shadow-sm">{k.icon}</div>
                        <div>
                            <p className={`text-xl font-black ${k.text}`}>{k.count}</p>
                            <p className={`text-xs font-semibold ${k.text}`}>{k.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#8bc34a #f3f4f6' }}>
                {viewMode === 'cards' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {data.prospectors.map((item) => {
                            const cc = getColorClasses(item.rendimiento.color);
                            const isExpanded = expandedRows.has(item.prospector.id);
                            const pData = prospectosData[item.prospector.id];

                            return (
                                <div key={item.prospector.id} className={`${cc.bg} border ${cc.border} rounded-2xl p-4 transition-all hover:shadow-md`}>
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3 cursor-pointer" onClick={() => seleccionarProspector(item.prospector.id)}>
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className={`w-8 h-8 rounded-xl ${cc.bg} border ${cc.border} flex items-center justify-center flex-shrink-0`}>
                                                <span className={`text-sm font-black ${cc.text}`}>{item.prospector.nombre.charAt(0)}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-gray-900 truncate">{item.prospector.nombre}</h3>
                                                <p className="text-gray-400 text-[10px] truncate">{item.prospector.correo}</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-1 px-2 py-1 ${cc.badge} rounded-lg text-[10px] font-bold capitalize ml-2 flex-shrink-0`}>
                                            {getEstadoIcon(item.rendimiento.estado)}
                                            {item.rendimiento.estado}
                                        </div>
                                    </div>

                                    {/* Métricas */}
                                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                                        {[
                                            { val: item.metricas.llamadas.total, label: 'Llamadas' },
                                            { val: item.metricas.citas.agendadas, label: 'Citas' },
                                            { val: item.metricas.prospectos.nuevos, label: 'Prospectos' },
                                        ].map((m, i) => (
                                            <div key={i} className="bg-white/60 rounded-xl py-2 px-1 text-center">
                                                <p className="text-base font-black text-gray-900">{m.val}</p>
                                                <p className="text-[10px] text-gray-500 font-medium">{m.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Botones */}
                                    <div className="flex gap-1.5">
                                        <button
                                            className="flex-1 bg-white border border-gray-200 text-gray-700 py-1.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 text-xs font-semibold"
                                            onClick={() => seleccionarProspector(item.prospector.id)}
                                        >
                                            Ver Detalles <ChevronRight className="w-3 h-3" />
                                        </button>
                                        <button
                                            className={`flex-1 border py-1.5 rounded-xl transition-colors flex items-center justify-center gap-1 text-xs font-semibold ${isExpanded ? 'bg-green-500 text-white border-green-500 hover:bg-green-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                                            onClick={() => toggleProspectos(item.prospector.id)}
                                        >
                                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                                            Prospectos
                                        </button>
                                    </div>

                                    {/* Expandido */}
                                    {isExpanded && (
                                        <div className="mt-2 bg-white border border-green-200 rounded-xl overflow-hidden">
                                            <div className="px-3 py-1.5 bg-green-50 border-b border-green-100">
                                                <p className="text-[10px] font-bold text-green-700 flex items-center gap-1">
                                                    <Users className="w-3 h-3" /> Prospectos — {periodo}
                                                </p>
                                            </div>
                                            {pData?.loading ? (
                                                <div className="flex items-center gap-2 text-gray-400 text-xs p-3">
                                                    <RefreshCw className="w-3 h-3 animate-spin" /> Cargando...
                                                </div>
                                            ) : !pData || pData.prospectos.length === 0 ? (
                                                <p className="text-gray-400 text-xs p-3 italic">Sin prospectos en este período.</p>
                                            ) : (
                                                <ul className="divide-y divide-gray-50 max-h-36 overflow-y-auto">
                                                    {pData.prospectos.map((p) => (
                                                        <li key={p.id} className="px-3 py-1.5 hover:bg-gray-50">
                                                            <p className="font-semibold text-gray-900 text-[11px]">{[p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ')}</p>
                                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                                {p.telefono && <span className="text-gray-400 text-[10px]">{p.telefono}</span>}
                                                                <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-semibold">{etapaLabel(p.etapaEmbudo)}</span>
                                                                <span className="text-gray-400 text-[10px]">{new Date(p.fechaRegistro).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // VISTA TABLA compacta
                    <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full">
                            <thead className="bg-gray-50/80 border-b border-gray-200">
                                <tr>
                                    <th className="px-2 py-2.5 w-8"></th>
                                    <th className="text-left px-4 py-2.5 text-gray-600 font-semibold text-xs">Prospector</th>
                                    <th className="text-center px-3 py-2.5 text-gray-600 font-semibold text-xs">Llamadas</th>
                                    <th className="text-center px-3 py-2.5 text-gray-600 font-semibold text-xs">Exitosas</th>
                                    <th className="text-center px-3 py-2.5 text-gray-600 font-semibold text-xs">Tasa</th>
                                    <th className="text-center px-3 py-2.5 text-gray-600 font-semibold text-xs">Citas</th>
                                    <th className="text-center px-3 py-2.5 text-gray-600 font-semibold text-xs">Prospectos</th>
                                    <th className="text-center px-3 py-2.5 text-gray-600 font-semibold text-xs">Estado</th>
                                    <th className="text-center px-3 py-2.5 text-gray-600 font-semibold text-xs">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.prospectors.map((item, index) => {
                                    const cc = getColorClasses(item.rendimiento.color);
                                    const isExpanded = expandedRows.has(item.prospector.id);
                                    const pData = prospectosData[item.prospector.id];
                                    return (
                                        <React.Fragment key={item.prospector.id}>
                                            <tr className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/50'} hover:bg-green-50/30 transition-colors`}>
                                                <td className="px-2 py-2.5 text-center">
                                                    <button
                                                        onClick={() => toggleProspectos(item.prospector.id)}
                                                        className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
                                                    >
                                                        {isExpanded
                                                            ? <ChevronDown className="w-3.5 h-3.5 text-green-600" />
                                                            : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <p className="font-semibold text-gray-900 text-sm">{item.prospector.nombre}</p>
                                                    <p className="text-gray-400 text-[10px]">{item.prospector.correo}</p>
                                                </td>
                                                <td className="text-center px-3 py-2.5 text-gray-900 font-bold text-sm">{item.metricas.llamadas.total}</td>
                                                <td className="text-center px-3 py-2.5 text-green-600 font-bold text-sm">{item.metricas.llamadas.exitosas}</td>
                                                <td className="text-center px-3 py-2.5">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                                        {item.metricas.tasas.contacto}%
                                                    </span>
                                                </td>
                                                <td className="text-center px-3 py-2.5 text-purple-600 font-bold text-sm">{item.metricas.citas.agendadas}</td>
                                                <td className="text-center px-3 py-2.5">
                                                    <button onClick={() => toggleProspectos(item.prospector.id)} className="font-bold text-gray-900 text-sm underline decoration-dotted hover:text-green-600">
                                                        {item.metricas.prospectos.nuevos}
                                                    </button>
                                                    <span className="text-gray-400 text-[10px]"> / {item.metricas.prospectos.total}</span>
                                                </td>
                                                <td className="text-center px-3 py-2.5">
                                                    <div className={`inline-flex items-center gap-1 px-2 py-1 ${cc.badge} rounded-lg text-[10px] font-bold capitalize`}>
                                                        {getEstadoIcon(item.rendimiento.estado)}
                                                        {item.rendimiento.estado}
                                                    </div>
                                                </td>
                                                <td className="text-center px-3 py-2.5">
                                                    <button onClick={() => seleccionarProspector(item.prospector.id)} className="text-green-600 hover:text-green-700 font-bold text-xs">
                                                        Ver
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="border-b border-green-100">
                                                    <td colSpan={9} className="bg-green-50/50 px-6 py-3">
                                                        <p className="text-[10px] font-bold text-green-700 mb-2 flex items-center gap-1">
                                                            <Users className="w-3 h-3" /> Prospectos — período {periodo}
                                                        </p>
                                                        {pData?.loading ? (
                                                            <div className="flex items-center gap-2 text-gray-400 text-xs">
                                                                <RefreshCw className="w-3 h-3 animate-spin" /> Cargando...
                                                            </div>
                                                        ) : !pData || pData.prospectos.length === 0 ? (
                                                            <p className="text-gray-400 text-xs italic">No hay prospectos en este período.</p>
                                                        ) : (
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="text-left text-gray-400 text-[10px] border-b border-green-200">
                                                                        <th className="pb-1.5 pr-4">Nombre</th>
                                                                        <th className="pb-1.5 pr-4">Teléfono</th>
                                                                        <th className="pb-1.5 pr-4">Correo</th>
                                                                        <th className="pb-1.5 pr-4">Empresa</th>
                                                                        <th className="pb-1.5 pr-4">Etapa</th>
                                                                        <th className="pb-1.5">Registro</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {pData.prospectos.map((p) => (
                                                                        <tr key={p.id} className="border-b border-green-100 hover:bg-green-100/50">
                                                                            <td className="py-1.5 pr-4 font-medium text-gray-800">{[p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ')}</td>
                                                                            <td className="py-1.5 pr-4 text-gray-500">{p.telefono || '—'}</td>
                                                                            <td className="py-1.5 pr-4 text-gray-500">{p.correo || '—'}</td>
                                                                            <td className="py-1.5 pr-4 text-gray-500">{p.empresa || '—'}</td>
                                                                            <td className="py-1.5 pr-4">
                                                                                <span className="px-1.5 py-0.5 bg-white border border-green-200 rounded-full text-[10px] text-green-700 font-semibold">{etapaLabel(p.etapaEmbudo)}</span>
                                                                            </td>
                                                                            <td className="py-1.5 text-gray-400">{new Date(p.fechaRegistro).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CloserMonitoreoProspectors;
