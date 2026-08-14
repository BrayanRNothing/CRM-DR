import React, { useState, useEffect, useCallback } from 'react';
import { calcularEstado } from '../utils/estadosEntidad';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Sliders, Phone, UserPlus, Calendar, TrendingUp, RefreshCw, Clock, CheckCircle2, Target, MessageSquare, ExternalLink, Users, Award, DollarSign, AlertTriangle, TrendingDown, Zap, Bell, ArrowRightLeft, PercentCircle, BarChart3, Search, FileText, Video, Globe, XCircle, Plus, Pencil, Trash2, Activity, ChevronRight, ChevronLeft, ChevronsRight, LogIn, LogOut, History, MousePointer2 } from 'lucide-react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import FunnelVisual from '../components/FunnelVisual';

import API_URL from '../config/api';
import socket from '../config/socket';
import StatCard from '../components/ui/StatCard';

import MetricKPICard from '../components/ui/MetricKPICard';

const PERIODOS = [
    { key: 'dia', label: 'Hoy', suffix: 'hoy' },
    { key: 'semana', label: 'Semana', suffix: 'esta semana' },
    { key: 'mes', label: 'Mes', suffix: 'este mes' },
    { key: 'total', label: 'Total', suffix: 'en total' },
];

const EMPTY_PERIODO = { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: 0 };
const INITIAL_VENDEDOR_DATA = {
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
    analisisPerdidas: { no_asistio: 0, no_interesado: 0 },
    analisisPerdidasPremium: {},
    analisisFuentes: {},
    eficiencia: { cicloVentaDias: 0, responseTimeHoras: 0, leadsEstancados: 0 }
};

const GOAL_LABELS = {
    ventas_monto: 'Meta ventas $',
    ventas_cantidad: 'Meta ventas #',
    clientes: 'Meta clientes',
    actividades: 'Meta actividades'
};

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const clampPercent = (value) => Math.max(0, Math.min(100, toNumber(value)));
const formatPercent = (value) => `${clampPercent(value).toFixed(1)}%`;

const sanitizeVendedorData = (rawData) => {
    const getNumero = (val) => {
        const num = parseFloat(val);
        return Number.isFinite(num) ? num : 0;
    };

    const fallbackDia = {
        llamadas: getNumero(rawData?.metricas?.llamadas?.hoy),
        mensajes: getNumero(rawData?.metricas?.correosEnviados),
        prospectos: getNumero(rawData?.metricas?.prospectosHoy),
        reuniones: getNumero(rawData?.metricas?.reunionesAgendadas?.hoy)
    };

    const fallbackTotal = {
        llamadas: getNumero(rawData?.metricas?.llamadas?.totales),
        mensajes: 0,
        prospectos: getNumero(rawData?.embudo?.total),
        reuniones: getNumero(rawData?.metricas?.reunionesAgendadas?.totales)
    };

    return {
        embudo: {
            total: getNumero(rawData?.embudo?.total),
            prospecto_nuevo: getNumero(rawData?.embudo?.prospecto_nuevo),
            en_contacto: getNumero(rawData?.embudo?.en_contacto),
            reunion_agendada: getNumero(rawData?.embudo?.reunion_agendada),
            transferidos: getNumero(rawData?.embudo?.transferidos),
            reunion_realizada: getNumero(rawData?.embudo?.reunion_realizada),
            venta_ganada: getNumero(rawData?.embudo?.venta_ganada)
        },
        tasasConversion: {
            contacto: getNumero(rawData?.tasasConversion?.contacto),
            agendamiento: getNumero(rawData?.tasasConversion?.agendamiento)
        },
        periodos: {
            dia: {
                llamadas: getNumero(rawData?.periodos?.dia?.llamadas ?? fallbackDia.llamadas),
                mensajes: getNumero(rawData?.periodos?.dia?.mensajes ?? fallbackDia.mensajes),
                prospectos: getNumero(rawData?.periodos?.dia?.prospectos ?? fallbackDia.prospectos),
                reuniones: getNumero(rawData?.periodos?.dia?.reuniones ?? fallbackDia.reuniones)
            },
            semana: {
                llamadas: getNumero(rawData?.periodos?.semana?.llamadas),
                mensajes: getNumero(rawData?.periodos?.semana?.mensajes),
                prospectos: getNumero(rawData?.periodos?.semana?.prospectos),
                reuniones: getNumero(rawData?.periodos?.semana?.reuniones)
            },
            mes: {
                llamadas: getNumero(rawData?.periodos?.mes?.llamadas),
                mensajes: getNumero(rawData?.periodos?.mes?.mensajes),
                prospectos: getNumero(rawData?.periodos?.mes?.prospectos),
                reuniones: getNumero(rawData?.periodos?.mes?.reuniones)
            },
            total: {
                llamadas: getNumero(rawData?.periodos?.total?.llamadas ?? fallbackTotal.llamadas),
                mensajes: getNumero(rawData?.periodos?.total?.mensajes ?? fallbackTotal.mensajes),
                prospectos: getNumero(rawData?.periodos?.total?.prospectos ?? fallbackTotal.prospectos),
                reuniones: getNumero(rawData?.periodos?.total?.reuniones ?? fallbackTotal.reuniones)
            }
        },
        analisisFuentes: rawData?.analisisFuentes || {}
    };
};

import { getToken } from '../utils/authUtils';
import useWindowSize from '../hooks/useWindowSize';
import DashboardMobile from './DashboardMobile';
import useApiCache, { clearCacheByPrefix } from '../hooks/useApiCache';

const getAuthHeaders = () => ({ 'x-auth-token': getToken() || '' });

const Dashboard = () => {
    const { width } = useWindowSize();
    const location = useLocation();
    const navigate = useNavigate();
    const fromLogin = location.state?.fromLogin;
    // loading y backgroundLoading los provee useApiCache (ver más abajo)

    const [vendedorData, setVendedorData] = useState(null);
    const [closerData, setCloserData] = useState(null);
    const [recordatorios, setRecordatorios] = useState([]);
    const [reuniones, setReuniones] = useState([]);
    const [loadingReuniones, setLoadingReuniones] = useState(true);
    const [periodo, setPeriodo] = useState('dia');
    const [healthTab, setHealthTab] = useState('resumen');
    const [actividades, setActividades] = useState([]);
    const [loadingActividades, setLoadingActividades] = useState(false);

    const fetchActividades = async () => {
        try {
            setLoadingActividades(true);
            const res = await axios.get(`${API_URL}/api/actividades`, {
                headers: getAuthHeaders()
            });
            const data = Array.isArray(res.data) ? res.data : [];
            setActividades(data);
        } catch (error) {
            console.error('Error al cargar actividades:', error);
            setActividades([]);
        } finally {
            setLoadingActividades(false);
        }
    };

    useEffect(() => {
        if (healthTab === 'acciones') {
            fetchActividades();
        }
    }, [healthTab]);
    const [metasEquipo, setMetasEquipo] = useState([]);
    const [teamTasks, setTeamTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [newTask, setNewTask] = useState({ titulo: '', descripcion: '', prioridad: 'media' });

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
            },
            analisisPerdidasPremium: rawData?.analisisPerdidasPremium || {},
            analisisFuentes: rawData?.analisisFuentes || {},
            eficiencia: rawData?.eficiencia || { cicloVentaDias: 0, responseTimeHoras: 0, leadsEstancados: 0 }
        };
    };

    const cargarMetasEquipo = async () => {
        try {
            const periodoMeta = new Date().toISOString().slice(0, 7);
            const res = await axios.get(`${API_URL}/api/equipos/mi-equipo/metricas`, {
                headers: getAuthHeaders(),
                params: { periodo: periodoMeta }
            });

            const metricas = Array.isArray(res.data?.metricas) ? res.data.metricas : [];
            const acumuladas = new Map();

            for (const m of metricas) {
                const goals = Array.isArray(m.goals) ? m.goals : [];
                for (const g of goals) {
                    const tipo = String(g.tipo || '');
                    if (!tipo) continue;
                    const curr = acumuladas.get(tipo) || { tipo, objetivo: 0, actual: 0 };
                    curr.objetivo += toNumber(g.objetivo);
                    curr.actual += toNumber(g.actual);
                    acumuladas.set(tipo, curr);
                }
            }

            const resumen = Array.from(acumuladas.values())
                .map((g) => ({
                    ...g,
                    progreso: g.objetivo > 0 ? clampPercent((g.actual / g.objetivo) * 100) : 0
                }))
                .sort((a, b) => b.progreso - a.progreso);

            setMetasEquipo(resumen);
        } catch (error) {
            setMetasEquipo([]);
        }
    };

    const {
        data: dashboardRaw,
        loading: loadingDashboard,
        backgroundLoading: bgLoadingDashboard,
        refresh: refreshDashboard
    } = useApiCache(
        'dashboard-vendedor',
        async () => {
            const res = await axios.get(`${API_URL}/api/vendedor/dashboard`, { headers: getAuthHeaders() });
            return sanitizeVendedorData(res.data);
        },
        { ttl: 60, staleWhileRevalidate: true }
    );

    const {
        data: closerRaw,
        loading: loadingCloser,
        backgroundLoading: bgLoadingCloser,
        refresh: refreshCloser
    } = useApiCache(
        'dashboard-closer',
        async () => {
            const res = await axios.get(`${API_URL}/api/vendedor/dashboard-closer`, { headers: getAuthHeaders() });
            return sanitizeCloserData(res.data);
        },
        { ttl: 60, staleWhileRevalidate: true }
    );

    // ── Datos reales de prospectos (nueva arquitectura)
    const {
        data: prospectosList,
        loading: loadingProspectos,
        refresh: refreshProspectos
    } = useApiCache(
        'dashboard-prospectos',
        async () => {
            const res = await axios.get(`${API_URL}/api/vendedor/prospectos`, { headers: getAuthHeaders() });
            return Array.isArray(res.data) ? res.data : [];
        },
        { ttl: 60, staleWhileRevalidate: true }
    );

    // ── Datos reales de clientes (para ventas y cierres) ──────────────────────
    const {
        data: clientesList,
        loading: loadingClientes,
        refresh: refreshClientes
    } = useApiCache(
        'dashboard-clientes',
        async () => {
            const res = await axios.get(`${API_URL}/api/vendedor/clientes-ganados`, { headers: getAuthHeaders() });
            return Array.isArray(res.data) ? res.data : [];
        },
        { ttl: 60, staleWhileRevalidate: true }
    );

    // ── Datos reales de oportunidades (nueva arquitectura)
    const {
        data: oportunidadesList,
        loading: loadingOportunidades,
        refresh: refreshOportunidades
    } = useApiCache(
        'dashboard-oportunidades',
        async () => {
            const res = await axios.get(`${API_URL}/api/oportunidades/todas`, { headers: getAuthHeaders() });
            return Array.isArray(res.data) ? res.data : [];
        },
        { ttl: 60, staleWhileRevalidate: true }
    );

    const isOportunidadGanada = o => {
        const e = (o.etapa || '').toLowerCase();
        const est = (o.estado || '').toLowerCase();
        return e === 'ganada' || e === 'venta_ganada' || est === 'ganada' || est === 'venta_ganada';
    };

    const isOportunidadPerdida = o => {
        const e = (o.etapa || '').toLowerCase();
        const est = (o.estado || '').toLowerCase();
        return e === 'perdida' || e === 'perdido' || est === 'perdida' || est === 'perdido';
    };

    const getOportunidadesActivas = useCallback((entidadId) => {
        if (!oportunidadesList) return 0;
        return oportunidadesList.filter(o => 
            String(o.cliente_id) === String(entidadId) && 
            !isOportunidadGanada(o) && 
            !isOportunidadPerdida(o)
        ).length;
    }, [oportunidadesList]);

    useEffect(() => {
        if (dashboardRaw) setVendedorData(dashboardRaw);
    }, [dashboardRaw]);

    useEffect(() => {
        if (closerRaw) setCloserData(closerRaw);
    }, [closerRaw]);

    const loading = loadingDashboard || loadingCloser || loadingProspectos || loadingOportunidades || loadingClientes;
    const backgroundLoading = bgLoadingDashboard || bgLoadingCloser;

    const cargarDatos = async (silent = false) => {
        if (!silent) {
            clearCacheByPrefix('dashboard');
        }
        refreshDashboard(silent);
        refreshCloser(silent);
        refreshProspectos(silent);
        refreshOportunidades(silent);
        refreshClientes(silent);
    };

    const cargarListas = async (silent = false) => {
        if (!silent) {
            setLoadingReuniones(true);
        }
        try {
            const getItemKey = (item, fallbackFields = []) => {
                const directId = item?.id || item?._id;
                if (directId !== null && directId !== undefined && directId !== '') {
                    return String(directId);
                }

                return fallbackFields
                    .map((field) => {
                        const value = item?.[field];
                        if (value === null || value === undefined) return '';
                        if (field === 'fecha' || field === 'proximaLlamada') {
                            const dateValue = new Date(value);
                            return Number.isNaN(dateValue.getTime()) ? String(value) : dateValue.toISOString();
                        }
                        return String(value);
                    })
                    .join('|');
            };

            try {
                const resR = await axios.get(`${API_URL}/api/vendedor/calendario`, { headers: getAuthHeaders() });
                const ahora = new Date();
                const proximas = resR.data.filter(r => {
                    const fecha = new Date(r.fecha);
                    const esPendiente = r.resultado === 'pendiente' || !r.resultado;
                    return fecha >= ahora && esPendiente;
                });
                const reunionesUnicas = [];
                const reunionesVistas = new Set();

                proximas
                    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
                    .forEach((reunion) => {
                        const key = getItemKey(reunion, ['fecha', 'clienteId', 'resultado']);
                        if (!reunionesVistas.has(key)) {
                            reunionesVistas.add(key);
                            reunionesUnicas.push(reunion);
                        }
                    });

                setReuniones(reunionesUnicas.slice(0, 3));
            } catch (e) {
                console.error('Error calendario data:', e);
            }
            if (!silent) setLoadingReuniones(false);

            try {
                const [resProspectos, resClientes, resTareas] = await Promise.allSettled([
                    axios.get(`${API_URL}/api/vendedor/prospectos`, { headers: getAuthHeaders() }),
                    axios.get(`${API_URL}/api/vendedor/clientes-ganados`, { headers: getAuthHeaders() }),
                    axios.get(`${API_URL}/api/tareas`, { headers: getAuthHeaders() })
                ]);

                const todosLosPendientes = [];
                const pendientesVistos = new Set();

                if (resProspectos.status === 'fulfilled') {
                    const leads = (resProspectos.value.data || []).filter(p => !!p.proximaLlamada && (p.nombres || p.nombre));
                    leads.forEach((lead) => {
                        const key = getItemKey(lead, ['proximaLlamada', 'nombres', 'apellidoPaterno', 'telefono']);
                        if (!pendientesVistos.has(key)) {
                            pendientesVistos.add(key);
                            todosLosPendientes.push(lead);
                        }
                    });
                }

                if (resClientes.status === 'fulfilled') {
                    const clientesConRec = (resClientes.value.data || []).filter(c => !!c.proximaLlamada && (c.nombres || c.nombre));
                    clientesConRec.forEach(c => {
                        const key = getItemKey(c, ['proximaLlamada', 'nombres', 'apellidoPaterno', 'telefono']);
                        if (!pendientesVistos.has(key)) {
                            pendientesVistos.add(key);
                            todosLosPendientes.push({ ...c, esCliente: true });
                        }
                    });
                }

                if (resTareas.status === 'fulfilled') {
                    const tareasRecordatorios = (resTareas.value.data || []).filter(t => t.titulo === 'Recordatorio de llamada' && t.estado === 'pendiente' && t.clienteNombre);

                    tareasRecordatorios.forEach(t => {
                        const key = getItemKey(t, ['cliente', 'fechaLimite', 'titulo']);
                        if (!pendientesVistos.has(key) && !todosLosPendientes.find(existing => (existing.id || existing._id) === t.cliente)) {
                            pendientesVistos.add(key);
                            todosLosPendientes.push({
                                id: t.cliente,
                                nombres: t.clienteNombre,
                                apellidoPaterno: t.clienteApellido || '',
                                proximaLlamada: t.fechaLimite,
                                esTarea: true
                            });
                        }
                    });
                }

                const manualTasks = (resTareas.status === 'fulfilled' ? (resTareas.value.data || []) : [])
                    .filter(t => t.titulo !== 'Recordatorio de llamada');
                setTeamTasks(manualTasks);

                const recordatoriosUnicos = [];
                const recordatoriosVistos = new Set();

                todosLosPendientes
                    .sort((a, b) => new Date(a.proximaLlamada) - new Date(b.proximaLlamada))
                    .forEach((recordatorio) => {
                        const key = getItemKey(recordatorio, ['proximaLlamada', 'nombres', 'apellidoPaterno', 'telefono']);
                        if (!recordatoriosVistos.has(key)) {
                            recordatoriosVistos.add(key);
                            recordatoriosUnicos.push(recordatorio);
                        }
                    });

                setRecordatorios(recordatoriosUnicos.slice(0, 15));

            } catch (e) {
                console.error('Error general en recordatorios:', e);
            }

        } catch (error) {
            console.error('Error al cargar listas:', error);
            setLoadingReuniones(false);
        }
    };

    const handleSaveTask = async (e) => {
        e.preventDefault();
        setLoadingTasks(true);
        try {
            if (editingTask) {
                await axios.put(`${API_URL}/api/tareas/${editingTask.id || editingTask._id}`, newTask, { headers: getAuthHeaders() });
            } else {
                await axios.post(`${API_URL}/api/tareas`, newTask, { headers: getAuthHeaders() });
            }
            setShowTaskModal(false);
            setEditingTask(null);
            setNewTask({ titulo: '', descripcion: '', prioridad: 'media' });
            cargarListas(true);
            socket.emit('prospectos_actualizados');
        } catch (error) {
            console.error('Error al guardar tarea:', error);
        } finally {
            setLoadingTasks(false);
        }
    };

    const handleDeleteTask = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar esta tarea?')) return;
        try {
            await axios.delete(`${API_URL}/api/tareas/${id}`, { headers: getAuthHeaders() });
            cargarListas(true);
            socket.emit('prospectos_actualizados');
        } catch (error) {
            console.error('Error al eliminar tarea:', error);
        }
    };

    const toggleTaskStatus = async (task) => {
        try {
            const nuevoEstado = task.estado === 'completada' ? 'pendiente' : 'completada';
            setTeamTasks(prev => prev.map(t =>
                (t.id === task.id || t._id === task._id)
                    ? { ...t, estado: nuevoEstado }
                    : t
            ));
            await axios.put(`${API_URL}/api/tareas/${task.id || task._id}`, { estado: nuevoEstado }, { headers: getAuthHeaders() });
            setTimeout(() => {
                cargarListas(true);
                socket.emit('prospectos_actualizados');
            }, 800);
        } catch (error) {
            console.error('Error al cambiar estado de tarea:', error);
            cargarListas(true);
        }
    };

    useEffect(() => {
        cargarListas();
        cargarMetasEquipo();

        const interval = setInterval(() => {
            cargarDatos(true);
            cargarListas(true);
            cargarMetasEquipo();
        }, 5 * 60 * 1000);

        const handleSocketUpdate = () => {
            cargarDatos(true);
            cargarListas(true);
            cargarMetasEquipo();
        };
        socket.on('prospectos_actualizados', handleSocketUpdate);
        socket.on('oportunidades_actualizadas', handleSocketUpdate);
        socket.on('clientes_actualizados', handleSocketUpdate);

        return () => {
            clearInterval(interval);
            socket.off('prospectos_actualizados', handleSocketUpdate);
            socket.off('oportunidades_actualizadas', handleSocketUpdate);
            socket.off('clientes_actualizados', handleSocketUpdate);
        };
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.15, delayChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
    };

    const bottomVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 } }
    };

    if (loading || !vendedorData || !closerData) {
        return <div className="h-full flex-1"></div>;
    }

    if (width < 1024) {
        return (
            <DashboardMobile
                vendedorData={vendedorData}
                closerData={closerData}
                recordatorios={recordatorios}
                reuniones={reuniones}
                teamTasks={teamTasks}
                periodo={periodo}
                setPeriodo={setPeriodo}
            />
        );
    }

    const mP = vendedorData.periodos?.[periodo] || EMPTY_PERIODO;
    const periodoSuffix = PERIODOS.find(p => p.key === periodo)?.suffix || 'hoy';
    const formatMoney = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
    const formatNumber = new Intl.NumberFormat('es-MX');

    // ── Conteos reales desde los endpoints actuales ──────────────────────────
    const allProspectos = prospectosList || [];
    const allOportunidades = oportunidadesList || [];

    const filterByPeriod = (items, dateField, p) => {
        if (p === 'total') return items;
        const hoy = new Date();
        return items.filter(item => {
            const dateStr = item[dateField] || item.fechaCreacion || item.fecha || item.createdAt;
            if (!dateStr) return false;
            const itemDate = new Date(dateStr);
            if (isNaN(itemDate.getTime())) return false;
            
            if (p === 'dia') {
                return itemDate.toDateString() === hoy.toDateString();
            } else if (p === 'semana') {
                const diff = (hoy - itemDate) / (1000 * 60 * 60 * 24);
                return diff <= 7 && diff >= 0;
            } else if (p === 'mes') {
                return itemDate.getMonth() === hoy.getMonth() && itemDate.getFullYear() === hoy.getFullYear();
            }
            return true;
        });
    };

    const prospectosPeriodo = filterByPeriod(allProspectos, 'createdAt', periodo);
    const oportunidadesPeriodo = filterByPeriod(allOportunidades, 'createdAt', periodo);

    const esProspectoCheck = (oportunidad) => {
        if (oportunidad.cliente_tipo) return oportunidad.cliente_tipo === 'prospecto';
        const etapa = oportunidad.cliente_etapaEmbudo || oportunidad.cliente_etapaembudo;
        if (!etapa) return false;
        const ETAPAS_PROSPECTO_LIST = ['prospecto_nuevo', 'en_contacto', 'reunion_agendada', 'reunion_realizada', 'en_negociacion', 'venta_ganada', 'perdido'];
        return ETAPAS_PROSPECTO_LIST.includes(String(etapa).toLowerCase().trim());
    };

    // Nuevos KPIs:
    const oportunidadesActivasPeriodo = oportunidadesPeriodo.filter(o => !isOportunidadGanada(o) && !isOportunidadPerdida(o));
    const valorOportunidadesPeriodo = oportunidadesActivasPeriodo.reduce((acc, o) => acc + (Number(o.monto) || 0), 0);
    const cantidadOportunidadesPeriodo = oportunidadesActivasPeriodo.length;
    
    let oppsProspectos = 0;
    let oppsClientes = 0;
    oportunidadesActivasPeriodo.forEach(o => {
        if (esProspectoCheck(o)) oppsProspectos++;
        else oppsClientes++;
    });

    let inactivosPeriodo = 0;
    let activosPeriodo = 0;
    prospectosPeriodo.forEach(p => {
        const est = calcularEstado(p, getOportunidadesActivas(p.id || p._id));
        if (est === 'inactivo') inactivosPeriodo++;
        else if (est === 'activo' || est === 'en_contacto' || est === 'con_oportunidad') activosPeriodo++;
    });

    const allClientes = clientesList || [];
    const ventasGanadasPeriodo = filterByPeriod(allClientes, 'createdAt', periodo);
    const valorClientesPeriodo = ventasGanadasPeriodo.reduce((acc, c) => acc + (Number(c.totalFacturado) || Number(c.facturado) || 0), 0);
    
    const oppsGanadasPeriodo = filterByPeriod(allOportunidades.filter(o => isOportunidadGanada(o)), 'updatedAt', periodo);
    const valorOppsGanadas = oppsGanadasPeriodo.reduce((acc, o) => acc + (Number(o.monto) || 0), 0);

    const valorVentasPeriodo = valorClientesPeriodo + valorOppsGanadas;
    const cantidadVentasPeriodo = ventasGanadasPeriodo.length + oppsGanadasPeriodo.length;
    const detalleVentas = `${oppsGanadasPeriodo.length} opps, ${ventasGanadasPeriodo.length} directas`;

    // Prospectos totales
    const totalEntrada = allProspectos.length;
    const prospectosActivos = totalEntrada; // alias usado en otras partes

    // En contacto: prospectos cuyo estado calculado NO es 'nuevo' ni 'perdido'
    const enContacto = allProspectos.filter(p => {
        const estado = calcularEstado(p, getOportunidadesActivas(p.id || p._id));
        return estado === 'en_contacto' || estado === 'activo' || estado === 'con_oportunidad';
    }).length;
    const sinContactar = Math.max(0, totalEntrada - enContacto);

    const totalOportunidades = allOportunidades.length;
    // Oportunidades activas (etapas que no son ganada ni perdida)
    const oportunidadesActivas = allOportunidades.filter(o => !isOportunidadGanada(o) && !isOportunidadPerdida(o)).length;

    // Cierres: oportunidades ganadas
    const ganadas = allOportunidades.filter(o => isOportunidadGanada(o)).length;
    const perdidas = allOportunidades.filter(o => isOportunidadPerdida(o)).length;

    // Tasas de conversión
    const tasaGlobal = totalEntrada > 0 ? clampPercent((ganadas / totalEntrada) * 100) : 0;
    const tasaContacto = totalEntrada > 0 ? clampPercent((enContacto / totalEntrada) * 100) : 0;
    const tasaOportunidad = enContacto > 0 ? clampPercent((totalOportunidades / enContacto) * 100) : 0;
    const tasaCierre = totalOportunidades > 0 ? clampPercent((ganadas / totalOportunidades) * 100) : 0;

    // Compatibilidad con referencias legacy
    const negociacion = vendedorData.embudo.reunion_realizada || 0;

    const analisisFuentesCombinado = {};
    const mergeFuentes = (fuentesData) => {
        if (!fuentesData) return;
        Object.entries(fuentesData).forEach(([fuente, data]) => {
            const count = typeof data === 'object' ? (data.count || 0) : data;
            const revenue = typeof data === 'object' ? (data.revenue || 0) : 0;
            if (!analisisFuentesCombinado[fuente]) {
                analisisFuentesCombinado[fuente] = { count: 0, revenue: 0 };
            }
            analisisFuentesCombinado[fuente].count += count;
            analisisFuentesCombinado[fuente].revenue += revenue;
        });
    };
    mergeFuentes(vendedorData?.analisisFuentes);
    mergeFuentes(closerData?.analisisFuentes);

    return (
        <motion.div
            className="h-full flex flex-col gap-3 p-3 xl:overflow-hidden bg-gray-50/50 scrollbar-hide"
            initial={fromLogin ? "hidden" : "show"}
            animate="show"
            variants={containerVariants}
        >
            <motion.div variants={itemVariants} className="shrink-0 flex flex-col">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-(--theme-600)" />
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-widest">Resumen de Ventas</span>
                    </div>

                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                        {PERIODOS.map(p => (
                            <button
                                key={p.key}
                                onClick={() => setPeriodo(p.key)}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${periodo === p.key
                                    ? 'bg-(--theme-50) text-(--theme-600) shadow-sm border border-(--theme-100)'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="shrink-0">
                <FunnelVisual
                    fromLogin={fromLogin}
                    stages={[
                        {
                            etapa: 'Prospectos',
                            cantidad: totalEntrada,
                            color: 'bg-(--theme-600)',
                            contadorHoy: vendedorData.periodos?.[periodo]?.prospectos ?? 0,
                            labelContador: `nuevos ${periodoSuffix}`,
                            cantidadExito: enContacto,
                            cantidadPerdida: sinContactar,
                            porcentajeExito: formatPercent(tasaContacto),
                            porcentajePerdida: formatPercent(100 - tasaContacto),
                            labelExito: 'Contactados',
                            labelPerdida: 'Sin contactar'
                        },
                        {
                            etapa: 'Contacto',
                            cantidad: enContacto,
                            color: 'bg-(--theme-500)',
                            contadorHoy: vendedorData.periodos?.[periodo]?.llamadas ?? 0,
                            labelContador: `esfuerzos ${periodoSuffix}`,
                            cantidadExito: totalOportunidades,
                            cantidadPerdida: Math.max(0, enContacto - totalOportunidades),
                            porcentajeExito: formatPercent(tasaOportunidad),
                            porcentajePerdida: formatPercent(100 - tasaOportunidad),
                            labelExito: 'Con oportunidad',
                            labelPerdida: 'Sin oportunidad'
                        },
                        {
                            etapa: 'Oportunidades',
                            cantidad: totalOportunidades,
                            color: 'bg-(--theme-400)',
                            contadorHoy: allOportunidades.filter(o => {
                                const hoy = new Date(); hoy.setHours(0,0,0,0);
                                const creado = o.createdAt ? new Date(o.createdAt) : null;
                                return creado && creado >= hoy;
                            }).length,
                            labelContador: `nuevas ${periodoSuffix}`,
                            cantidadExito: ganadas,
                            cantidadPerdida: perdidas,
                            porcentajeExito: formatPercent(totalOportunidades > 0 ? (ganadas / totalOportunidades) * 100 : 0),
                            porcentajePerdida: formatPercent(totalOportunidades > 0 ? (perdidas / totalOportunidades) * 100 : 0),
                            labelExito: 'Ganadas',
                            labelPerdida: 'Perdidas'
                        },
                        {
                            etapa: 'Cierres',
                            cantidad: ganadas,
                            color: 'bg-green-500',
                            contadorHoy: allOportunidades.filter(o => {
                                if (!isOportunidadGanada(o)) return false;
                                const hoy = new Date(); hoy.setHours(0,0,0,0);
                                const upd = o.updatedAt ? new Date(o.updatedAt) : null;
                                return upd && upd >= hoy;
                            }).length,
                            labelContador: `ganadas ${periodoSuffix}`,
                            cantidadExito: ganadas,
                            porcentajeExito: formatPercent(totalOportunidades > 0 ? (ganadas / totalOportunidades) * 100 : 0),
                            labelExito: 'Tasa de cierre'
                        }
                    ]}
                    type="vendedor"
                />
            </motion.div>

            <motion.div variants={bottomVariants} className="flex-1 flex flex-col xl:flex-row gap-4 min-h-0 overflow-y-auto xl:overflow-hidden pr-0.5 scrollbar-hide">
                <div className="flex-1 min-h-0 bg-transparent flex flex-col relative overflow-hidden">



                    <div className="flex-1 min-h-0 overflow-y-auto xl:pr-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                        <AnimatePresence mode="wait">
                            {healthTab === 'resumen' && (
                                <motion.div key="resumen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} className="h-full flex flex-col gap-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 pb-1">

                                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-full">
                                        <div className="flex items-center gap-3 mb-6 shrink-0">
                                            <Rocket className="w-6 h-6 text-(--theme-600)" />
                                            <div>
                                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">Atajos Rápidos</h3>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Acciones frecuentes</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 flex-1">
                                            <button onClick={() => navigate('/vendedor/prospectos')} className="group flex flex-col items-center justify-center gap-1.5 bg-white border border-gray-100 rounded-xl p-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-gray-200 hover:-translate-y-1">
                                                <div className="p-2 rounded-full transition-colors duration-300 group-hover:bg-(--theme-50)">
                                                    <UserPlus className="w-6 h-6 text-gray-400 group-hover:text-(--theme-600) group-hover:scale-110 transition-all duration-300" />
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-widest text-gray-600 group-hover:text-(--theme-700) transition-colors duration-300 mt-1">Prospectos</span>
                                            </button>
                                            <button onClick={() => navigate('/vendedor/calendario')} className="group flex flex-col items-center justify-center gap-1.5 bg-white border border-gray-100 rounded-xl p-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-gray-200 hover:-translate-y-1">
                                                <div className="p-2 rounded-full transition-colors duration-300 group-hover:bg-indigo-50">
                                                    <Calendar className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all duration-300" />
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-widest text-gray-600 group-hover:text-indigo-700 transition-colors duration-300 mt-1">Mi Agenda</span>
                                            </button>
                                            <button onClick={() => setHealthTab('tareas')} className="group flex flex-col items-center justify-center gap-1.5 bg-white border border-gray-100 rounded-xl p-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-gray-200 hover:-translate-y-1">
                                                <div className="p-2 rounded-full transition-colors duration-300 group-hover:bg-rose-50">
                                                    <Bell className="w-6 h-6 text-gray-400 group-hover:text-rose-600 group-hover:scale-110 transition-all duration-300" />
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-widest text-gray-600 group-hover:text-rose-700 transition-colors duration-300 mt-1">Tareas</span>
                                            </button>
                                            <button onClick={() => setHealthTab('kpis')} className="group flex flex-col items-center justify-center gap-1.5 bg-white border border-gray-100 rounded-xl p-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-gray-200 hover:-translate-y-1">
                                                <div className="p-2 rounded-full transition-colors duration-300 group-hover:bg-emerald-50">
                                                    <TrendingUp className="w-6 h-6 text-gray-400 group-hover:text-emerald-600 group-hover:scale-110 transition-all duration-300" />
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-widest text-gray-600 group-hover:text-emerald-700 transition-colors duration-300 mt-1">Métricas</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-full">
                                        <div className="flex items-center gap-3 mb-6 shrink-0">
                                            <Sliders className="w-6 h-6 text-(--theme-600)" />
                                            <div>
                                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">Centro de Control</h3>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Módulos principales del sistema</p>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col gap-3 min-h-0">
                                            <motion.button layoutId="panel-kpis" onClick={() => setHealthTab('kpis')} className="flex-1 justify-center bg-white border border-gray-100 rounded-xl p-4 pr-16 flex flex-col text-left transition-all duration-300 cursor-pointer w-full group relative overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-gray-200 hover:-translate-y-1">
                                                <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end pr-2 text-gray-200 transition-all duration-500 group-hover:translate-x-3 pointer-events-none -space-x-16">
                                                    <ChevronRight strokeWidth={0.5} className="w-20 h-[90%]" />
                                                    <ChevronRight strokeWidth={0.5} className="w-20 h-[90%]" />
                                                </div>
                                                <div className="flex items-start justify-between w-full mb-3 relative z-10">
                                                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest group-hover:text-(--theme-700) transition-colors">Métricas</h4>
                                                </div>
                                                <div className="flex items-center gap-4 relative z-10">
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Prospectos</p>
                                                        <p className="text-sm font-black text-gray-700">{allProspectos.length}</p>
                                                    </div>
                                                    <div className="w-px h-6 bg-gray-200/50" />
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Clientes</p>
                                                        <p className="text-sm font-black text-gray-700">{allClientes.length}</p>
                                                    </div>
                                                </div>
                                            </motion.button>

                                            <motion.button layoutId="panel-tareas" onClick={() => setHealthTab('tareas')} className="flex-1 justify-center bg-white border border-gray-100 rounded-xl p-4 pr-16 flex flex-col text-left transition-all duration-300 cursor-pointer w-full group relative overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-gray-200 hover:-translate-y-1">
                                                <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end pr-2 text-gray-200 transition-all duration-500 group-hover:translate-x-3 pointer-events-none -space-x-16">
                                                    <ChevronRight strokeWidth={0.5} className="w-20 h-[90%]" />
                                                    <ChevronRight strokeWidth={0.5} className="w-20 h-[90%]" />
                                                </div>
                                                <div className="flex items-start justify-between w-full mb-3 relative z-10">
                                                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest group-hover:text-rose-700 transition-colors">Tareas</h4>
                                                </div>
                                                <div className="flex items-center gap-4 relative z-10">
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Pendientes</p>
                                                        <p className="text-sm font-black text-gray-700">{teamTasks.filter(t => t.estado !== 'completada').length}</p>
                                                    </div>
                                                </div>
                                            </motion.button>

                                            <button onClick={() => navigate('/vendedor/prospectos')} className="flex-1 justify-center bg-white border border-gray-100 rounded-xl p-4 pr-16 flex flex-col text-left transition-all duration-300 cursor-pointer w-full group relative overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-gray-200 hover:-translate-y-1">
                                                <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end pr-2 text-gray-200 transition-all duration-500 group-hover:translate-x-3 pointer-events-none -space-x-16">
                                                    <ChevronRight strokeWidth={0.5} className="w-20 h-[90%]" />
                                                    <ChevronRight strokeWidth={0.5} className="w-20 h-[90%]" />
                                                </div>
                                                <div className="flex items-start justify-between w-full mb-3 relative z-10">
                                                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest group-hover:text-blue-700 transition-colors">Prospectos</h4>
                                                </div>
                                                <div className="flex items-center gap-4 relative z-10">
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Totales</p>
                                                        <p className="text-sm font-black text-gray-700">{prospectosActivos}</p>
                                                    </div>
                                                    <div className="w-px h-6 bg-gray-200/50" />
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Contactados</p>
                                                        <p className="text-sm font-black text-gray-700">{enContacto}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </motion.div>
                        )}

                        {healthTab === 'kpis' && (
                            <motion.div layoutId="panel-kpis" className="flex flex-col h-full bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative z-20 overflow-hidden">
                                {/* Back Header */}
                                <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200/50 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                            <BarChart3 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Métricas y Análisis</h2>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Desempeño del mes</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setHealthTab('resumen')} className="p-2 bg-gray-50 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                                        <ChevronLeft className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Volver al Resumen</span>
                                    </button>
                                </div>
                                <div className="flex flex-col gap-6 flex-1 min-h-0 overflow-y-auto scrollbar-hide pr-1">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 shrink-0">
                                        <MetricKPICard
                                            title="Cantidad de Prospectos"
                                            value={allProspectos.length}
                                            format="number"
                                            icon={<Users className="w-5 h-5" />}
                                            detail="Prospectos totales en sistema"
                                            color="emerald"
                                        />
                                        <MetricKPICard
                                            title="Cantidad de Clientes"
                                            value={allClientes.length}
                                            format="number"
                                            icon={<Award className="w-5 h-5" />}
                                            detail="Clientes ganados totales"
                                            color="emerald"
                                        />
                                        <MetricKPICard
                                            title="Cantidad de Oportunidades"
                                            value={allOportunidades.length}
                                            format="number"
                                            icon={<Target className="w-5 h-5" />}
                                            detail="Oportunidades abiertas y cerradas"
                                            color="blue"
                                        />
                                        <MetricKPICard
                                            title="Valor Estimado Prospectos"
                                            value={allProspectos.reduce((acc, p) => {
                                                const opps = allOportunidades.filter(o => String(o.cliente_id) === String(p.id || p._id));
                                                if (opps.length > 0) {
                                                    return acc + opps.filter(o => !isOportunidadGanada(o) && !isOportunidadPerdida(o)).reduce((sum, o) => sum + (Number(o.monto) || 0), 0);
                                                }
                                                const estado = calcularEstado(p, 0);
                                                if (estado === 'perdido') return acc;
                                                return acc + (Number(p.valorEstimado || p.presupuesto || p.customMetricValue) || 0);
                                            }, 0)}
                                            format="money"
                                            icon={<TrendingUp className="w-5 h-5" />}
                                            detail="Suma total estimada"
                                            color="emerald"
                                        />
                                        <MetricKPICard
                                            title="Facturado a Clientes"
                                            value={allClientes.reduce((acc, c) => acc + (Number(c.totalFacturado || c.facturado) || 0), 0)}
                                            format="money"
                                            icon={<DollarSign className="w-5 h-5" />}
                                            detail="Ingresos totales de clientes"
                                            color="emerald"
                                        />
                                        <MetricKPICard
                                            title="Valor en Oportunidades"
                                            value={allOportunidades.reduce((acc, o) => {
                                                if (isOportunidadPerdida(o)) return acc;
                                                return acc + (Number(o.monto || o.valor) || 0);
                                            }, 0)}
                                            format="money"
                                            icon={<BarChart3 className="w-5 h-5" />}
                                            detail="Suma total de oportunidades"
                                            color="blue"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
                                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-full min-h-0 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-linear-to-br from-indigo-50/30 to-transparent pointer-events-none" />
                                            <div className="flex items-center justify-between mb-5 shrink-0 relative z-10">
                                                <div>
                                                    <h3 className="text-sm font-black text-gray-800 tracking-wide">Origen de leads</h3>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mt-0.5">Por Fuente</p>
                                                </div>
                                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 shadow-sm group-hover:scale-110 transition-transform">
                                                    <Globe className="w-4 h-4" />
                                                </div>
                                            </div>

                                            {Object.keys(analisisFuentesCombinado).length === 0 ? (
                                                <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                                                    <Globe className="w-8 h-8 text-gray-300 mb-2" />
                                                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Sin datos</p>
                                                </div>
                                            ) : (() => {
                                                const entries = Object.entries(analisisFuentesCombinado).sort((a, b) => b[1].count - a[1].count);
                                                const maxCount = entries[0]?.[1]?.count || 1;
                                                return (
                                                    <div className="flex-1 overflow-y-auto space-y-3.5 scrollbar-hide relative z-10">
                                                        {entries.map(([fuente, data]) => {
                                                            const count = data.count;
                                                            const pct = Math.round((count / maxCount) * 100);
                                                            return (
                                                                <div key={fuente} className="group/item">
                                                                    <div className="flex items-center justify-between mb-1.5">
                                                                        <span className="text-xs font-bold text-gray-700 truncate pr-2 group-hover/item:text-indigo-700 transition-colors">{fuente}</span>
                                                                        <span className="text-xs font-black text-indigo-600 shrink-0 bg-indigo-50 px-2 py-0.5 rounded-full">{count}</span>
                                                                    </div>
                                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-full min-h-0 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-linear-to-br from-rose-50/30 to-transparent pointer-events-none" />
                                            <div className="flex items-center justify-between mb-5 shrink-0 relative z-10">
                                                <div>
                                                    <h3 className="text-sm font-black text-gray-800 tracking-wide">Por qué se pierden</h3>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mt-0.5">Motivos de Descarte</p>
                                                </div>
                                                <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center text-rose-500 shadow-sm group-hover:scale-110 transition-transform">
                                                    <XCircle className="w-4 h-4" />
                                                </div>
                                            </div>

                                            {Object.keys(closerData.analisisPerdidasPremium).length === 0 ? (
                                                <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                                                    <XCircle className="w-8 h-8 text-gray-300 mb-2" />
                                                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Sin datos</p>
                                                </div>
                                            ) : (() => {
                                                const entries = Object.entries(closerData.analisisPerdidasPremium).sort((a, b) => b[1] - a[1]);
                                                const maxCount = entries[0]?.[1] || 1;
                                                return (
                                                    <div className="flex-1 overflow-y-auto space-y-3.5 scrollbar-hide relative z-10">
                                                        {entries.map(([motivo, count]) => {
                                                            const pct = Math.round((count / maxCount) * 100);
                                                            return (
                                                                <div key={motivo} className="group/item">
                                                                    <div className="flex items-center justify-between mb-1.5">
                                                                        <span className="text-xs font-bold text-gray-700 truncate pr-2 group-hover/item:text-rose-700 transition-colors">{motivo}</span>
                                                                        <span className="text-xs font-black text-rose-600 shrink-0 bg-rose-50 px-2 py-0.5 rounded-full">{count}</span>
                                                                    </div>
                                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-rose-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {healthTab === 'tareas' && (
                            <motion.div layoutId="panel-tareas" className="flex flex-col h-full bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative z-20 overflow-hidden">
                                {/* Back Header */}
                                <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                                            <Bell className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Gestión de Tareas</h2>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Leads Estancados y Seguimiento</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setHealthTab('resumen')} className="p-2 bg-gray-50 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                                        <ChevronLeft className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Volver al Resumen</span>
                                    </button>
                                </div>
                                
                                <div className="flex items-center justify-between mb-4 shrink-0">
                                    <div className="flex items-center gap-2 opacity-0 hidden">
                                        <Bell className="w-4 h-4 text-gray-400" />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">Gestión de Tareas</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingTask(null);
                                            setNewTask({ titulo: '', descripcion: '', prioridad: 'media' });
                                            setShowTaskModal(true);
                                        }}
                                        className="px-3 py-1.5 bg-(--theme-600) hover:bg-(--theme-700) text-white rounded-lg shadow-sm shadow-(--theme-500)/20 transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        NUEVA TAREA
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    {teamTasks.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                            <Bell className="w-6 h-6 text-gray-300 mb-2" />
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tu equipo está al día</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                            <AnimatePresence>
                                                {teamTasks.map((t) => (
                                                    <motion.div
                                                        layout
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ layout: { type: "spring", bounce: 0.2, duration: 0.8 } }}
                                                        key={t.id || t._id}
                                                        className={`group relative p-3 rounded-xl border transition-all ${t.estado === 'completada' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 shadow-sm hover:border-(--theme-300)'}`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <button
                                                                onClick={() => toggleTaskStatus(t)}
                                                                className={`mt-0.5 w-4 h-4 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${t.estado === 'completada' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-(--theme-500)'}`}
                                                            >
                                                                {t.estado === 'completada' && <CheckCircle2 className="w-2.5 h-2.5" />}
                                                            </button>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                                    <h4 className={`text-sm font-bold leading-tight ${t.estado === 'completada' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.titulo}</h4>
                                                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase border shrink-0 ${t.prioridad === 'alta' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                        t.prioridad === 'media' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                            'bg-blue-50 text-blue-600 border-blue-100'
                                                                        }`}>
                                                                        {t.prioridad}
                                                                    </span>
                                                                </div>
                                                                {t.descripcion && <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{t.descripcion}</p>}

                                                                <div className="flex items-center gap-3 mt-2">
                                                                    <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                                                                        <Users className="w-3.5 h-3.5 text-gray-300" />
                                                                        {t.vendedorNombre?.split(' ')[0] || 'Usuario'}
                                                                    </span>
                                                                    {t.fechaLimite && (
                                                                        <span className={`text-[11px] font-bold flex items-center gap-1 ${new Date(t.fechaLimite) < new Date() && t.estado !== 'completada' ? 'text-rose-500' : 'text-gray-400'}`}>
                                                                            <Calendar className="w-3.5 h-3.5 opacity-70" />
                                                                            {new Date(t.fechaLimite).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingTask(t);
                                                                        setNewTask({ titulo: t.titulo, descripcion: t.descripcion, prioridad: t.prioridad, fechaLimite: t.fechaLimite });
                                                                        setShowTaskModal(true);
                                                                    }}
                                                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-(--theme-600) transition-colors"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteTask(t.id || t._id)}
                                                                    className="p-1.5 hover:bg-rose-50 rounded-lg text-gray-400 hover:text-rose-600 transition-colors"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}


                        {healthTab === 'acciones' && (
                            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-800">Acciones Realizadas</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Historial de actividad reciente</p>
                                    </div>
                                    <button
                                        onClick={fetchActividades}
                                        disabled={loadingActividades}
                                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${loadingActividades ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>

                                {loadingActividades ? (
                                    <div className="flex-1 flex items-center justify-center py-20">
                                        <RefreshCw className="w-8 h-8 text-(--theme-200) animate-spin" />
                                    </div>
                                ) : actividades.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                                        <History className="w-10 h-10 text-gray-200 mb-3" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sin actividad registrada</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scrollbar-hide">
                                        {actividades.map((act, idx) => {
                                            const IconMap = {
                                                login: LogIn,
                                                registro: UserPlus,
                                                equipo: Users,
                                                llamada: Phone,
                                                whatsapp: MessageSquare,
                                                cita: Calendar,
                                                mensaje: FileText,
                                                correo: Globe,
                                                prospecto: UserPlus
                                            };
                                            const ColorMap = {
                                                login: 'text-emerald-500 bg-emerald-50 border-emerald-100',
                                                registro: 'text-indigo-500 bg-indigo-50 border-indigo-100',
                                                equipo: 'text-amber-500 bg-amber-50 border-amber-100',
                                                llamada: 'text-blue-500 bg-blue-50 border-blue-100',
                                                whatsapp: 'text-green-500 bg-green-50 border-green-100',
                                                cita: 'text-purple-500 bg-purple-50 border-purple-100',
                                                mensaje: 'text-slate-500 bg-slate-50 border-slate-100',
                                                correo: 'text-rose-500 bg-rose-50 border-rose-100',
                                                prospecto: 'text-cyan-500 bg-cyan-50 border-cyan-100'
                                            };
                                            const ActionIcon = IconMap[act.tipo] || Activity;
                                            const colors = ColorMap[act.tipo] || 'text-gray-500 bg-gray-50 border-gray-100';

                                            return (
                                                <div key={act.id || idx} className="group relative flex gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-xs transition-all duration-300">
                                                    <div className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center ${colors.split(' ').slice(0, 3).join(' ')} shadow-xs`}>
                                                        <ActionIcon className="w-4 h-4" />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-[11px] font-black text-gray-800 uppercase tracking-tight truncate">
                                                                {act.vendedor?.nombre || 'Sistema'}
                                                            </p>
                                                            <span className="text-[9px] font-bold text-gray-400 whitespace-nowrap bg-gray-50 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                                                                {new Date(act.fecha || act.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-[10px] font-bold text-gray-500 mt-0.5 line-clamp-1 uppercase tracking-tight">
                                                            {act.descripcion}
                                                        </h4>
                                                        {act.cliente && (
                                                            <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 bg-gray-50/50 rounded-lg border border-gray-100/50 w-fit">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-(--theme-400)"></div>
                                                                <p className="text-[9px] font-black text-(--theme-600) uppercase tracking-widest truncate max-w-[150px]">
                                                                    {act.cliente.nombres} {act.cliente.apellidoPaterno}
                                                                    {act.cliente.empresa && <span className="ml-1 opacity-50 font-bold">({act.cliente.empresa})</span>}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Línea decorativa para el feed */}
                                                    {idx < actividades.length - 1 && (
                                                        <div className="absolute left-[29.5px] top-[48px] bottom-[-20px] w-px bg-linear-to-b from-gray-100 to-transparent z-0"></div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {healthTab === 'proximamente' && (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500">
                                <div className="w-16 h-16 bg-(--theme-50) rounded-2xl flex items-center justify-center mb-6 shadow-xs border border-(--theme-100)">
                                    <Zap className="w-8 h-8 text-(--theme-500)" />
                                </div>
                                <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-3">CRM en Desarrollo</h3>
                                <p className="text-xs text-gray-400 font-bold leading-relaxed max-w-xs uppercase tracking-tight">
                                    Este CRM está en desarrollo continuo. Si tienes ideas para nuevas funciones o necesitas ayuda, no dudes en contactarnos.
                                </p>
                                <div className="mt-8 flex gap-3">
                                    <div className="px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-xs text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                        Feedback v2.0
                                    </div>
                                </div>
                            </div>
                        )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>

                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col flex-1 min-h-0">
                        <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 mb-4 shrink-0 uppercase tracking-widest">
                            <Phone className="w-4 h-4 text-rose-500" /> Recordatorios Pendientes
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2" style={{ scrollbarWidth: 'none' }}>
                            {recordatorios.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-3">Sin recordatorios hoy.</p>
                            ) : (
                                recordatorios.map((p, idx) => {
                                    const esVencido = new Date(p.proximaLlamada) < new Date();
                                    return (
                                        <div
                                            key={p.id || p._id || `rec-${idx}`}
                                            className={`relative overflow-hidden group ${esVencido ? 'bg-linear-to-br from-rose-500 to-rose-600' : 'bg-linear-to-br from-(--theme-500) to-(--theme-600)'} rounded-lg p-2 shadow-sm hover:shadow-md transition-all cursor-pointer`}
                                            onClick={() => {
                                                if (p.esCliente) {
                                                    navigate('/vendedor/clientes', { state: { selectedId: p.id || p._id } });
                                                } else {
                                                    navigate('/vendedor/prospectos', { state: { selectedId: p.id || p._id } });
                                                }
                                            }}
                                        >
                                            {/* Fondo decorativo */}
                                            <div className="absolute right-0 top-0 h-full w-1/4 bg-white/10 skew-x-12 transform origin-top-right transition-transform duration-500"></div>

                                            <div className="relative z-10">
                                                <div className="flex items-center justify-between gap-1 overflow-hidden">
                                                    <div className="text-[11px] font-bold text-white truncate max-w-[70%]">
                                                        {p.nombre || `${p.nombres || ''} ${p.apellidoPaterno || ''}`.trim()}
                                                    </div>
                                                    {p.esCliente && (
                                                        <span className="text-[7px] font-black bg-white/20 text-white px-1 py-0.5 rounded backdrop-blur-sm uppercase tracking-tighter border border-white/10">Cliente</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between mt-1 gap-1">
                                                    <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 bg-white/20 text-white backdrop-blur-sm border border-white/10 shrink-0`}>
                                                        <Clock className="w-2 h-2" />
                                                        {new Date(p.proximaLlamada).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        {esVencido && <span className="ml-0.5 font-black opacity-80">⚠</span>}
                                                    </div>
                                                    {p.telefono && (
                                                        <div className="flex items-center gap-0.5 text-[9px] text-white/80 font-medium truncate">
                                                            <Phone className="w-2 h-2" />
                                                            {p.telefono}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col flex-1 min-h-0">
                        <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 mb-4 shrink-0 uppercase tracking-widest">
                            <Calendar className="w-4 h-4 text-(--theme-500)" /> Próximas Citas
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2" style={{ scrollbarWidth: 'none' }}>
                            {loadingReuniones ? (
                                <div className="flex justify-center p-4"><RefreshCw className="animate-spin text-gray-400 w-4 h-4" /></div>
                            ) : reuniones.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-3">Libre de reuniones.</p>
                            ) : (
                                reuniones.map(r => {
                                    const rFecha = new Date(r.fecha);
                                    const esHoy = rFecha.toDateString() === new Date().toDateString();

                                    return (
                                        <div
                                            key={r.id || r._id}
                                            className={`relative overflow-hidden group ${esHoy ? 'bg-linear-to-br from-emerald-500 to-emerald-600' : 'bg-linear-to-br from-indigo-600 to-indigo-700'} rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer`}
                                            onClick={() => {
                                                // Navegar al perfil del cliente/prospecto
                                                if (r.esCliente) {
                                                    navigate('/vendedor/clientes', { state: { selectedId: r.cliente?.id || r.clienteId } });
                                                } else {
                                                    navigate('/vendedor/prospectos', { state: { selectedId: r.cliente?.id || r.clienteId } });
                                                }
                                            }}
                                        >
                                            {/* Fondo decorativo */}
                                            <div className="absolute right-0 top-0 h-full w-1/4 bg-white/10 skew-x-12 transform origin-top-right transition-transform duration-500 group-hover:w-1/3"></div>

                                            <div className="relative z-10">
                                                <div className="flex items-center justify-between gap-1 overflow-hidden mb-1.5">
                                                    <div className="text-[11px] font-bold text-white truncate flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center shrink-0">
                                                            <Video className="w-3 h-3 text-white" />
                                                        </div>
                                                        {r.cliente?.nombres} {r.cliente?.apellidoPaterno}
                                                    </div>
                                                    {esHoy && (
                                                        <span className="text-[7px] font-black bg-white/30 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm uppercase tracking-tighter border border-white/10 whitespace-nowrap animate-pulse">Hoy</span>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <div className="flex justify-between items-center gap-1">
                                                        <div className="text-[9px] font-bold text-white bg-white/20 backdrop-blur-sm border border-white/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                            <Clock className="w-2 h-2" />
                                                            {rFecha.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        {r.cliente?.telefono && (
                                                            <div className="text-[9px] text-white/90 font-medium flex items-center gap-0.5 mt-0.5">
                                                                <Phone className="w-2 h-2" />
                                                                {r.cliente.telefono}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {r.googleMeetLink && (
                                                        <a
                                                            href={r.googleMeetLink.startsWith('http') ? r.googleMeetLink : `https://${r.googleMeetLink}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white text-indigo-700 rounded-lg text-[9px] font-black hover:bg-indigo-50 transition-colors shadow-sm active:scale-95"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Video className="w-2.5 h-2.5" />
                                                            UNIRSE A GOOGLE MEET
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                </div>
            </motion.div>
            {/* Modal de Tarea - Movido al final para evitar problemas de stacking context */}
            {showTaskModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col">
                        <div className="p-6">
                            <h3 className="text-lg font-black text-gray-800 mb-1 uppercase tracking-tight">
                                {editingTask ? 'Editar Tarea' : 'Nueva Tarea de Equipo'}
                            </h3>
                            <p className="text-xs text-gray-400 font-bold mb-6 uppercase tracking-widest">Colaboración en tiempo real</p>

                            <form onSubmit={handleSaveTask} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Título</label>
                                    <input
                                        required
                                        type="text"
                                        value={newTask.titulo}
                                        onChange={(e) => setNewTask({ ...newTask, titulo: e.target.value })}
                                        placeholder="¿Qué hay que hacer?"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500) transition-all outline-hidden"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Descripción (opcional)</label>
                                    <textarea
                                        rows="3"
                                        value={newTask.descripcion}
                                        onChange={(e) => setNewTask({ ...newTask, descripcion: e.target.value })}
                                        placeholder="Detalles adicionales..."
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500) transition-all outline-hidden resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Prioridad</label>
                                        <select
                                            value={newTask.prioridad}
                                            onChange={(e) => setNewTask({ ...newTask, prioridad: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500) transition-all outline-hidden appearance-none"
                                        >
                                            <option value="baja">Baja</option>
                                            <option value="media">Media</option>
                                            <option value="alta">Alta</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Fecha Límite</label>
                                        <input
                                            type="date"
                                            value={newTask.fechaLimite ? newTask.fechaLimite.split('T')[0] : ''}
                                            onChange={(e) => setNewTask({ ...newTask, fechaLimite: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500) transition-all outline-hidden"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setShowTaskModal(false)}
                                        className="flex-1 px-6 py-3 border border-gray-200 text-gray-500 font-black text-[11px] rounded-xl hover:bg-gray-50 transition-all uppercase tracking-widest"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loadingTasks}
                                        className="flex-3 px-6 py-3 bg-(--theme-600) text-white font-black text-[11px] rounded-xl hover:bg-(--theme-700) transition-all uppercase tracking-widest shadow-lg shadow-(--theme-500)/20 flex items-center justify-center gap-2"
                                    >
                                        {loadingTasks ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : editingTask ? 'Actualizar Tarea' : 'Crear Tarea'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default Dashboard;
