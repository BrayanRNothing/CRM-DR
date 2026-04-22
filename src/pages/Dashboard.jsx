import React, { useState, useEffect } from 'react';
import { Phone, UserPlus, Calendar, TrendingUp, RefreshCw, Clock, CheckCircle2, Target, MessageSquare, ExternalLink, Users, Award, DollarSign, AlertTriangle, TrendingDown, Zap, Bell, ArrowRightLeft, PercentCircle, BarChart3, Search, FileText, Video, Globe, XCircle, Plus, Pencil, Trash2, Activity, ChevronRight, LogIn, LogOut, History, MousePointer2 } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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
            transferidos: getNumero(rawData?.embudo?.transferidos)
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

const getAuthHeaders = () => ({ 'x-auth-token': getToken() || '' });

const Dashboard = () => {
    const { width } = useWindowSize();
    const [loading, setLoading] = useState(true);

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

    const cargarDatos = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            try {
                const resP = await axios.get(`${API_URL}/api/vendedor/dashboard`, { headers: getAuthHeaders() });
                setVendedorData(sanitizeVendedorData(resP.data));
            } catch (e) {
                console.error('Error prospector data:', e);
                setVendedorData(INITIAL_VENDEDOR_DATA);
            }

            try {
                const resC = await axios.get(`${API_URL}/api/vendedor/dashboard-closer`, { headers: getAuthHeaders() });
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
                // 1. Obtener prospectos con recordatorio, clientes ganados, y recordatorios de la base de tareas
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
                    // Marcamos que son clientes ganados para identificarlos
                    clientesConRec.forEach(c => {
                        const key = getItemKey(c, ['proximaLlamada', 'nombres', 'apellidoPaterno', 'telefono']);
                        if (!pendientesVistos.has(key)) {
                            pendientesVistos.add(key);
                            todosLosPendientes.push({ ...c, esCliente: true });
                        }
                    });
                }

                // Cargar también las "Tareas" que son "Recordatorio de llamada"
                if (resTareas.status === 'fulfilled') {
                    // Solo consideramos tareas huérfanas si aún tienen el nombre del cliente (clienteNombre válido). Si clienteNombre es null, el cliente fue borrado
                    const tareasRecordatorios = (resTareas.value.data || []).filter(t => t.titulo === 'Recordatorio de llamada' && t.estado === 'pendiente' && t.clienteNombre);

                    tareasRecordatorios.forEach(t => {
                        // Verificamos si ese cliente ya tiene un recordatorio cargado en la lista (para no duplicar)
                        const key = getItemKey(t, ['cliente', 'fechaLimite', 'titulo']);
                        if (!pendientesVistos.has(key) && !todosLosPendientes.find(existing => (existing.id || existing._id) === t.cliente)) {
                            pendientesVistos.add(key);
                            // Construir un objeto simulando ser un prospecto/cliente para unificar formato
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
            socket.emit('prospectos_actualizados'); // Notificar cambios al equipo
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
            await axios.put(`${API_URL}/api/tareas/${task.id || task._id}`, { estado: nuevoEstado }, { headers: getAuthHeaders() });
            cargarListas(true);
            socket.emit('prospectos_actualizados');
        } catch (error) {
            console.error('Error al cambiar estado de tarea:', error);
        }
    };

    useEffect(() => {
        cargarDatos();
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

        return () => {
            clearInterval(interval);
            socket.off('prospectos_actualizados', handleSocketUpdate);
        };
    }, []);

    if (loading || !vendedorData || !closerData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-(--theme-500) animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando dashboard unificado...</p>
                </div>
            </div>
        );
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

    const totalEntrada = vendedorData.embudo.total || 0;
    const enContacto = vendedorData.embudo.en_contacto || 0;
    const sinContactar = Math.max(0, totalEntrada - enContacto);
    const negociacion = (vendedorData.embudo.reunion_agendada || 0) + (closerData.embudo.reunion_realizada || 0) + (closerData.embudo.propuesta_enviada || 0);
    const ganadas = closerData.embudo.venta_ganada || 0;
    const tasaGlobal = totalEntrada > 0 ? clampPercent((ganadas / totalEntrada) * 100) : 0;
    const tasaContacto = clampPercent(vendedorData.tasasConversion.contacto || 0);
    const tasaAgendamiento = enContacto > 0 ? clampPercent((negociacion / enContacto) * 100) : 0;
    const tasaCierre = negociacion > 0 ? clampPercent((ganadas / negociacion) * 100) : 0;
    const etapasDebiles = [
        { etapa: 'Contacto Inicial → Llamadas', tasa: tasaContacto },
        { etapa: 'Llamadas → Citas', tasa: tasaAgendamiento },
        { etapa: 'Negociación → Venta', tasa: tasaCierre }
    ].filter(item => item.tasa < 30);

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

    const cardsResumen = [
        { title: 'Prospectos activos', value: formatNumber.format(totalEntrada), icon: '👥', color: 'blue', subtext: `${mP.prospectos || 0} recibidos ${periodoSuffix}` },
        { title: 'En contacto', value: formatNumber.format(enContacto), icon: '📞', color: 'green', subtext: `${sinContactar} todavía sin tocar` },
        { title: 'En negociación', value: formatNumber.format(negociacion), icon: '🤝', color: 'purple', subtext: `${closerData.metricas.reuniones.realizadasHoy || 0} citas realizadas hoy` },
        { title: 'Ventas ganadas', value: formatNumber.format(ganadas), icon: '🏆', color: 'yellow', subtext: `${formatPercent(tasaGlobal)} de conversión global` }
    ];

    const panelesActividad = [
        { label: 'Llamadas hoy', value: mP.llamadas || 0, detail: `+${mP.llamadas || 0} esfuerzos en ${periodoSuffix}` },
        { label: 'Mensajes hoy', value: mP.mensajes || 0, detail: 'Seguimientos, WhatsApp o correos enviados' },
        { label: 'Reuniones hoy', value: (mP.reuniones || 0) + (closerData.metricas.reuniones.realizadasHoy || 0), detail: `Pendientes: ${closerData.metricas.reuniones.pendientes || 0}` },
        { label: 'Ventas del mes', value: formatMoney.format(closerData.metricas.ventas.montoMes || 0), detail: `${closerData.metricas.ventas.mes || 0} cierres este mes` }
    ];

    return (
        <div className="h-full flex flex-col gap-3 p-3 xl:overflow-hidden bg-gray-50/50 scrollbar-hide">

            <div className="shrink-0 flex flex-col">
                <div className="flex items-center justify-between mb-1.5 px-1">
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
                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm w-full">
                    <FunnelVisual
                        stages={[
                            {
                                etapa: 'Entrada',
                                cantidad: totalEntrada,
                                color: 'bg-(--theme-500)',
                                contadorHoy: vendedorData.periodos?.[periodo]?.prospectos ?? 0,
                                labelContador: `recibidos ${periodoSuffix}`,
                                cantidadExito: enContacto,
                                cantidadPerdida: sinContactar,
                                porcentajeExito: formatPercent(tasaContacto),
                                porcentajePerdida: formatPercent(100 - tasaContacto),
                                labelExito: 'a contacto',
                                labelPerdida: 'sin tocar'
                            },
                            {
                                etapa: 'Contacto',
                                cantidad: enContacto,
                                color: 'bg-slate-500',
                                contadorHoy: vendedorData.periodos?.[periodo]?.llamadas ?? 0,
                                labelContador: `esfuerzos ${periodoSuffix}`,
                                cantidadExito: negociacion,
                                cantidadPerdida: Math.max(0, enContacto - negociacion),
                                porcentajeExito: formatPercent(tasaAgendamiento),
                                porcentajePerdida: formatPercent(100 - tasaAgendamiento),
                                labelExito: 'a cita',
                                labelPerdida: 'estancados'
                            },
                            {
                                etapa: 'Negociación',
                                cantidad: negociacion,
                                color: 'bg-slate-600',
                                contadorHoy: (vendedorData.periodos?.[periodo]?.reuniones ?? 0) + (closerData.metricas.reuniones.realizadasHoy || 0),
                                labelContador: `citas ${periodoSuffix}`,
                                cantidadExito: ganadas,
                                cantidadPerdida: Math.max(0, negociacion - ganadas),
                                porcentajeExito: formatPercent(tasaCierre),
                                labelExito: 'a venta',
                                labelPerdida: 'pausados'
                            },
                            {
                                etapa: 'Cierre',
                                cantidad: ganadas,
                                color: 'bg-green-500',
                                contadorHoy: closerData.metricas.ventas.ventasHoy || 0,
                                labelContador: `ganadas ${periodoSuffix}`,
                                cantidadExito: ganadas,
                                porcentajeExito: 100,
                                labelExito: 'éxito'
                            }
                        ]}
                        type="vendedor"
                    />
                </div>
            </div>

            <div className="flex-1 flex flex-col xl:flex-row gap-4 min-h-0 overflow-y-auto xl:overflow-hidden pr-0.5 scrollbar-hide">

                <div className="flex-1 flex flex-col min-w-0">
                    <div className="shrink-0 relative z-20">
                        <div className="flex items-end gap-2.5 overflow-x-auto pb-px -mb-px" style={{ scrollbarWidth: 'none' }}>
                            {[
                                { key: 'resumen', label: 'Resumen', Icon: TrendingUp },
                                { key: 'kpis', label: 'Métricas', Icon: BarChart3 },
                                { key: 'tareas', label: 'Tareas', Icon: Bell },
                                { key: 'acciones', label: 'Acciones', Icon: Activity },
                                { key: 'proximamente', label: 'Próximamente', Icon: Zap }
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setHealthTab(tab.key)}
                                    className={`px-3.5 py-2 text-xs font-extrabold transition-all border whitespace-nowrap flex items-center gap-1.5 ${healthTab === tab.key
                                        ? 'bg-white text-(--theme-700) border-gray-200 border-b-white rounded-t-xl rounded-b-none -mb-px relative z-20'
                                        : 'bg-white text-gray-500 border-gray-200 rounded-xl shadow-sm mb-1 hover:-translate-y-0.5 hover:bg-gray-50 hover:text-gray-700'
                                        }`}
                                >
                                    <tab.Icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={`flex-1 min-h-0 relative z-10 bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col ${healthTab === 'resumen' ? 'rounded-tl-none' : ''}`}>
                        <div className="flex-1 min-h-0 overflow-y-auto xl:pr-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                            {healthTab === 'resumen' && (
                                <div className="h-full flex flex-col gap-4 animate-in fade-in duration-500">
                                    {/* SECCIÓN 1: SALUD OPERATIVA (KPIs DE PROCESO) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                                        <MetricKPICard
                                            title="Velocidad de Respuesta"
                                            value={closerData?.eficiencia?.responseTimeHoras || 0}
                                            format="number"
                                            icon={<Zap />}
                                            detail="Horas prom. 1er contacto"
                                            thresholds={{ good: 2, okay: 6 }}
                                            reverse={true}
                                        />
                                        <MetricKPICard
                                            title="Tasa de Asistencia"
                                            value={closerData?.tasasConversion?.asistencia || 0}
                                            format="percent"
                                            icon={<Users />}
                                            detail="Show-up en citas agendadas"
                                            thresholds={{ good: 75, okay: 50 }}
                                        />
                                        <MetricKPICard
                                            title="Ciclo de Cierre"
                                            value={closerData?.eficiencia?.cicloVentaDias || 0}
                                            format="number"
                                            icon={<RefreshCw />}
                                            detail="Días prom. entrada a cierre"
                                            thresholds={{ good: 5, okay: 12 }}
                                            reverse={true}
                                        />
                                        <MetricKPICard
                                            title="Ticket Promedio"
                                            value={closerData.metricas.ventas.montoMes / (closerData.metricas.ventas.mes || 1)}
                                            format="money"
                                            icon={<DollarSign />}
                                            detail="Valor promedio de cierre"
                                            color="emerald"
                                        />
                                    </div>

                                    {/* SECCIÓN 2: CENTRO DE ACCIÓN (ENFOQUE INMEDIATO) */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 pb-1">
                                        {/* Agenda Prioritaria */}
                                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-full">
                                            <div className="flex items-center justify-between mb-6 shrink-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 shadow-xs">
                                                        <Calendar className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">Agenda Prioritaria</h3>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Próximos compromisos</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => navigate('/vendedor/calendario')} className="text-(--theme-600) text-[10px] font-black uppercase tracking-widest hover:underline px-2 py-1">Ver Calendario</button>
                                            </div>

                                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
                                                {reuniones.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-8">
                                                        <Calendar className="w-8 h-8 mb-2" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest leading-tight">Sin citas próximas</p>
                                                    </div>
                                                ) : (
                                                    reuniones.map((reunion, i) => (
                                                        <div key={i} className="group p-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-white transition-all">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-xs font-black text-indigo-600">
                                                                        {new Date(reunion.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black text-gray-800 leading-tight uppercase truncate max-w-[150px]">{reunion.cliente?.nombres} {reunion.cliente?.apellidoPaterno || ''}</p>
                                                                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{new Date(reunion.fecha).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric' })}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {reunion.googleMeetLink && <Video className="w-4 h-4 text-indigo-400" />}
                                                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Tareas Críticas del Equipo */}
                                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-full">
                                            <div className="flex items-center justify-between mb-6 shrink-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shadow-xs">
                                                        <Bell className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">Tareas Críticas</h3>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Acciones prioritarias</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setHealthTab('tareas')} className="text-rose-500 text-[10px] font-black uppercase tracking-widest hover:underline px-2 py-1">Ver Todas</button>
                                            </div>

                                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
                                                {teamTasks.filter(t => t.prioridad === 'alta' && t.estado !== 'completada').length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-8">
                                                        <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-500" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest leading-tight">Sin tareas críticas</p>
                                                    </div>
                                                ) : (
                                                    teamTasks
                                                        .filter(t => t.prioridad === 'alta' && t.estado !== 'completada')
                                                        .slice(0, 4)
                                                        .map((tarea, i) => (
                                                            <div key={i} className="group p-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-rose-200 hover:bg-white transition-all border-l-4 border-l-rose-500">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="min-w-0 flex-1">
                                                                        <h4 className="text-xs font-black text-gray-800 uppercase tracking-tight truncate">{tarea.titulo}</h4>
                                                                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 truncate">{tarea.descripcion || 'Sin descripción'}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 ml-3">
                                                                        <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 uppercase">Hoy</span>
                                                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {healthTab === 'kpis' && (
                                <div className="flex flex-col gap-4 h-full min-h-0">
                                    {/* Fila 1: KPIs de Alto Impacto */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                                        <MetricKPICard
                                            title="Tasa de Show-up"
                                            value={closerData.embudo.reunion_agendada > 0
                                                ? (closerData.embudo.reunion_realizada / closerData.embudo.reunion_agendada) * 100
                                                : 0}
                                            format="percent"
                                            icon={<Video className="w-5 h-5" />}
                                            detail={`${closerData.embudo.reunion_realizada} citas realizadas de ${closerData.embudo.reunion_agendada}`}
                                            thresholds={{ good: 70, okay: 45 }}
                                        />
                                        <MetricKPICard
                                            title="Ticket Promedio"
                                            value={closerData.metricas.ventas.totales > 0
                                                ? closerData.metricas.ventas.montoTotal / closerData.metricas.ventas.totales
                                                : 0}
                                            format="money"
                                            icon={<DollarSign className="w-5 h-5" />}
                                            detail={`Basado en ${closerData.metricas.ventas.totales} ventas totales`}
                                            color="emerald"
                                        />
                                        <MetricKPICard
                                            title="Conversión Global"
                                            value={tasaGlobal}
                                            format="percent"
                                            icon={<Target className="w-5 h-5" />}
                                            detail="De prospecto nuevo a venta ganada"
                                            thresholds={{ good: 15, okay: 8 }}
                                        />
                                    </div>

                                    {/* Fila 2: Métricas de Eficiencia (Velocidad) */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
                                        <MetricKPICard
                                            title="Tiempo de Respuesta"
                                            value={closerData?.eficiencia?.responseTimeHoras || 0}
                                            format="number"
                                            icon={<Clock className="w-5 h-5" />}
                                            detail="Horas promedio hasta el 1er contacto"
                                            thresholds={{ good: 2, okay: 6 }}
                                            reverse={true}
                                        />
                                        <MetricKPICard
                                            title="Ciclo de Cierre"
                                            value={closerData?.eficiencia?.cicloVentaDias || 0}
                                            format="number"
                                            icon={<ArrowRightLeft className="w-5 h-5" />}
                                            detail="Días promedio desde entrada a cierre"
                                            thresholds={{ good: 5, okay: 12 }}
                                            reverse={true}
                                        />
                                        <MetricKPICard
                                            title="Leads Estancados"
                                            value={closerData?.eficiencia?.leadsEstancados || 0}
                                            format="number"
                                            icon={<AlertTriangle className="w-5 h-5" />}
                                            detail="Prospectos con >7 días sin actividad"
                                            color="rose"
                                        />
                                    </div>



                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 min-h-0 mt-auto">
                                        {/* Distribución por Fuente */}
                                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-full min-h-0">
                                            <div className="flex items-center gap-2 mb-6 shrink-0">
                                                <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 shadow-xs">
                                                    <Globe className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-800">Distribución por Fuente</h3>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Análisis de Origen</p>
                                                </div>
                                            </div>

                                            {Object.keys(analisisFuentesCombinado).length === 0 ? (
                                                <div className="flex-1 flex flex-col items-center justify-center py-8 opacity-40">
                                                    <p className="text-[9px] uppercase font-black tracking-widest">Sin datos de origen</p>
                                                </div>
                                            ) : (
                                                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                                    {Object.entries(analisisFuentesCombinado)
                                                        .sort((a, b) => b[1].revenue - a[1].revenue)
                                                        .map(([fuente, data]) => {
                                                            const count = data.count;
                                                            const revenue = data.revenue;
                                                            return (
                                                                <div key={fuente} className="space-y-1.5">
                                                                    <div className="flex justify-between text-[11px] items-end">
                                                                        <div>
                                                                            <span className="font-black text-gray-700 block">{fuente}</span>
                                                                            <span className="text-[9px] text-gray-400 font-bold">{count} leads</span>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="text-indigo-600 font-black block">{formatMoney.format(revenue)}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-indigo-500 rounded-full"
                                                                            style={{ width: `${Math.min((count / (closerData.embudo.total || 1) * 100), 100).toFixed(0)}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    }
                                                </div>
                                            )}
                                        </div>

                                        {/* Análisis de Pérdidas (Motivos) */}
                                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-full min-h-0">
                                            <div className="flex items-center gap-2 mb-6 shrink-0">
                                                <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shadow-xs">
                                                    <XCircle className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-800">Motivos de Pérdida</h3>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Motivos de Descarte</p>
                                                </div>
                                            </div>

                                            {Object.keys(closerData.analisisPerdidasPremium).length === 0 ? (
                                                <div className="flex-1 flex flex-col items-center justify-center py-8 opacity-40">
                                                    <p className="text-[9px] uppercase font-black tracking-widest">Sin datos de descarte</p>
                                                </div>
                                            ) : (
                                                <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar">
                                                    {Object.entries(closerData.analisisPerdidasPremium)
                                                        .sort((a, b) => b[1] - a[1])
                                                        .map(([motivo, count]) => {
                                                            const percent = (count / (closerData.embudo.perdido || 1)) * 100;
                                                            return (
                                                                <div key={motivo} className="flex items-center gap-4">
                                                                    <span className="text-xs font-black text-rose-600 bg-rose-50 w-8 h-8 flex items-center justify-center rounded-xl border border-rose-100 shrink-0">{count}</span>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex justify-between items-center mb-1.5">
                                                                            <p className="text-[11px] font-black text-gray-700 truncate">{motivo}</p>
                                                                            <p className="text-[10px] font-black text-gray-400">{percent.toFixed(0)}%</p>
                                                                        </div>
                                                                        <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                                                                            <div className="h-full bg-rose-400" style={{ width: `${percent}%` }} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    }
                                                </div>
                                            )}
                                        </div>

                                        {/* Espacio para Métricas en Desarrollo (Simplificada y Centrada) */}
                                        {/* Espacio para Métricas en Desarrollo */}
                                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-full min-h-0 items-center justify-center text-center opacity-70 group transition-all">
                                            <div className="max-w-[220px]">
                                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] leading-tight mb-2">Métricas en Desarrollo</h3>
                                                <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                                                    Nuevos análisis y predicciones inteligentes próximamente.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {healthTab === 'tareas' && (
                                <div className="space-y-3 h-full flex flex-col">
                                    <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col min-h-0">
                                        <div className="flex items-center justify-between mb-4 px-1">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-(--theme-50) rounded-2xl flex items-center justify-center text-(--theme-600) shadow-xs">
                                                    <Bell className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">Tareas de Equipo</h3>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Gestión colaborativa</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setEditingTask(null);
                                                    setNewTask({ titulo: '', descripcion: '', prioridad: 'media' });
                                                    setShowTaskModal(true);
                                                }}
                                                className="px-4 py-2 bg-(--theme-600) hover:bg-(--theme-700) text-white rounded-xl shadow-lg shadow-(--theme-500)/20 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                            >
                                                <Plus className="w-4 h-4" />
                                                NUEVA TAREA
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 scrollbar-hide">
                                            {teamTasks.map((t) => (
                                                <div key={t.id || t._id} className={`group relative p-4 rounded-xl border transition-all ${t.estado === 'completada' ? 'bg-gray-50/50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-(--theme-200) hover:shadow-md'}`}>
                                                    <div className="flex items-start gap-4">
                                                        <button
                                                            onClick={() => toggleTaskStatus(t)}
                                                            className={`mt-1 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${t.estado === 'completada' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-(--theme-500)'}`}
                                                        >
                                                            {t.estado === 'completada' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <h4 className={`text-sm font-bold truncate ${t.estado === 'completada' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.titulo}</h4>
                                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${t.prioridad === 'alta' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                    t.prioridad === 'media' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                        'bg-blue-50 text-blue-600 border-blue-100'
                                                                    }`}>
                                                                    {t.prioridad}
                                                                </span>
                                                            </div>
                                                            {t.descripcion && <p className="text-xs text-gray-500 leading-relaxed max-w-2xl">{t.descripcion}</p>}
                                                            <div className="flex items-center gap-4 mt-2.5">
                                                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                                                                    <Users className="w-3 h-3 text-gray-400" />
                                                                    POR: <span className="text-gray-600">{t.vendedorNombre || 'Cargando...'}</span>
                                                                </span>
                                                                {t.fechaLimite && (
                                                                    <span className={`text-[10px] font-bold flex items-center gap-1.5 px-2 py-1 rounded-lg ${new Date(t.fechaLimite) < new Date() && t.estado !== 'completada' ? 'bg-rose-50 text-rose-600' : 'bg-gray-50 text-gray-400'}`}>
                                                                        <Calendar className="w-3 h-3" />
                                                                        LIMITE: {new Date(t.fechaLimite).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingTask(t);
                                                                    setNewTask({ titulo: t.titulo, descripcion: t.descripcion, prioridad: t.prioridad, fechaLimite: t.fechaLimite });
                                                                    setShowTaskModal(true);
                                                                }}
                                                                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-(--theme-600) transition-colors border border-transparent hover:border-gray-200"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteTask(t.id || t._id)}
                                                                className="p-2 hover:bg-rose-50 rounded-xl text-gray-400 hover:text-rose-600 transition-colors border border-transparent hover:border-rose-100"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {teamTasks.length === 0 && (
                                                <div className="flex-1 flex flex-col items-center justify-center py-20 bg-gray-50/30 rounded-2xl border-2 border-dashed border-gray-100">
                                                    <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-4 border border-gray-100">
                                                        <Bell className="w-8 h-8 text-gray-200" />
                                                    </div>
                                                    <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Sin tareas activas</p>
                                                    <p className="text-[10px] text-gray-300 font-bold uppercase mt-1">Tu equipo está al día</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
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
                        </div>
                    </div>
                </div>

                <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>

                    <div className="bg-(--theme-50)/40 border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col flex-1 min-h-0">
                        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4 shrink-0 uppercase tracking-widest">
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

                    <div className="bg-(--theme-50)/40 border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col flex-1 min-h-0">
                        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4 shrink-0 uppercase tracking-widest">
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
            </div>
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
        </div>
    );
};

export default Dashboard;
