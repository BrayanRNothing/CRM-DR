import React, { useState, useEffect } from 'react';
import { Phone, UserPlus, Calendar, TrendingUp, RefreshCw, Clock, CheckCircle2, Target, MessageSquare, ExternalLink, Users, Award, DollarSign, AlertTriangle, TrendingDown, Zap, Bell, ArrowRightLeft, PercentCircle, BarChart3, Search, FileText, Video } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FunnelVisual from '../components/FunnelVisual';

import API_URL from '../config/api';
import socket from '../config/socket';
import StatCard from '../components/ui/StatCard';
import WeakStageAlert from '../components/WeakStageAlert';

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
    analisisPerdidas: { no_asistio: 0, no_interesado: 0 }
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
        }
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
    const [metasEquipo, setMetasEquipo] = useState([]);
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
        <div className="h-full flex flex-col gap-4 p-4 overflow-hidden bg-gray-50/50">

            <div className="shrink-0 flex flex-col">
                <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-(--theme-600)" />
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-widest">Pipeline General</span>
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
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm w-full">
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

            <div className="flex-1 flex gap-4 min-h-0">

                <div className="flex-1 flex flex-col min-w-0">
                    <div className="shrink-0 relative z-20">
                        <div className="flex items-end gap-2.5 overflow-x-auto pb-px -mb-px" style={{ scrollbarWidth: 'thin' }}>
                            {[
                                { key: 'resumen', label: 'Resumen', Icon: TrendingUp },
                                { key: 'kpis', label: 'Métricas', Icon: BarChart3 },
                                { key: 'tareas', label: 'Tareas', Icon: Bell },
                                { key: 'alertas', label: 'Alertas', Icon: AlertTriangle }
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

                    <div className={`flex-1 min-h-0 relative z-10 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col ${healthTab === 'resumen' ? 'rounded-tl-none' : ''}`}>
                        <div className="flex-1 min-h-0 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                            {healthTab === 'resumen' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                                        {cardsResumen.map(card => (
                                            <StatCard
                                                key={card.title}
                                                title={card.title}
                                                value={card.value}
                                                icon={card.icon}
                                                color={card.color}
                                            />
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                                        <div className="xl:col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-700">Lectura rápida</h3>
                                                    <p className="text-xs text-gray-400 mt-1">Lo más importante del día y del mes en una sola vista.</p>
                                                </div>
                                                <span className="text-xs font-bold text-(--theme-600) bg-(--theme-50) px-3 py-1 rounded-full border border-(--theme-100)">
                                                    {formatPercent(tasaGlobal)} cierre global
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {panelesActividad.map(panel => (
                                                    <div key={panel.label} className="bg-white border border-gray-200 rounded-lg p-3">
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{panel.label}</p>
                                                        <div className="mt-2 text-2xl font-black text-gray-800">{panel.value}</div>
                                                        <p className="text-xs text-gray-400 mt-1">{panel.detail}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-(--theme-50)/50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                                            <div>
                                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-700">Estado actual</h3>
                                                <p className="text-xs text-gray-400 mt-1">Indicadores clave del pipeline.</p>
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-1">
                                                        <span>Contacto</span>
                                                        <span>{formatPercent(tasaContacto)}</span>
                                                    </div>
                                                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                                                        <div className="h-full bg-(--theme-500)" style={{ width: `${tasaContacto}%` }} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-1">
                                                        <span>Agendamiento</span>
                                                        <span>{formatPercent(tasaAgendamiento)}</span>
                                                    </div>
                                                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                                                        <div className="h-full bg-slate-500" style={{ width: `${tasaAgendamiento}%` }} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-1">
                                                        <span>Cierre</span>
                                                        <span>{formatPercent(tasaCierre)}</span>
                                                    </div>
                                                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                                                        <div className="h-full bg-green-500" style={{ width: `${tasaCierre}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-auto rounded-lg bg-white border border-gray-200 p-3">
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pendientes hoy</p>
                                                <p className="text-2xl font-black text-gray-800 mt-1">{recordatorios.length}</p>
                                                <p className="text-xs text-gray-400">Recordatorios activos y oportunidades de seguimiento.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {healthTab === 'kpis' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Contacto inicial</p>
                                            <p className="text-3xl font-black text-gray-800 mt-2">{formatPercent(tasaContacto)}</p>
                                            <p className="text-xs text-gray-400 mt-1">De prospectos activos a contacto real</p>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Agendamiento</p>
                                            <p className="text-3xl font-black text-gray-800 mt-2">{formatPercent(tasaAgendamiento)}</p>
                                            <p className="text-xs text-gray-400 mt-1">De contacto a cita o negociación</p>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Cierre</p>
                                            <p className="text-3xl font-black text-gray-800 mt-2">{formatPercent(tasaCierre)}</p>
                                            <p className="text-xs text-gray-400 mt-1">De negociación a venta ganada</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-700">Metas del equipo (mes actual)</h3>
                                            <span className="text-[11px] font-bold text-(--theme-700) bg-(--theme-50) border border-(--theme-100) rounded-full px-2.5 py-1">
                                                {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                                            </span>
                                        </div>

                                        {metasEquipo.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-6">Aún no hay metas guardadas en Equipos.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {metasEquipo.map((meta) => (
                                                    <div key={meta.tipo} className="bg-white border border-gray-200 rounded-lg p-3">
                                                        <div className="flex items-center justify-between gap-3 mb-2">
                                                            <p className="text-sm font-bold text-gray-800">{GOAL_LABELS[meta.tipo] || meta.tipo}</p>
                                                            <p className="text-xs font-bold text-gray-600">{formatPercent(meta.progreso)}</p>
                                                        </div>
                                                        <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-2">
                                                            <div className="h-full bg-(--theme-500)" style={{ width: `${meta.progreso}%` }} />
                                                        </div>
                                                        <p className="text-xs text-gray-500">
                                                            Actual: <span className="font-semibold text-gray-700">{meta.tipo === 'ventas_monto' ? formatMoney.format(meta.actual) : formatNumber.format(meta.actual)}</span>
                                                            {' '}de{' '}
                                                            <span className="font-semibold text-gray-700">{meta.tipo === 'ventas_monto' ? formatMoney.format(meta.objetivo) : formatNumber.format(meta.objetivo)}</span>
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-700 mb-4">Desglose del embudo</h3>
                                        <div className="space-y-3">
                                            {[
                                                { label: 'Entrada', value: totalEntrada, helper: `${mP.prospectos || 0} nuevos ${periodoSuffix}` },
                                                { label: 'Contacto', value: enContacto, helper: `${sinContactar} sin tocar` },
                                                { label: 'Negociación', value: negociacion, helper: `${closerData.metricas.reuniones.realizadasHoy || 0} realizadas hoy` },
                                                { label: 'Cierre', value: ganadas, helper: `${closerData.metricas.ventas.mes || 0} ventas en el mes` }
                                            ].map(item => (
                                                <div key={item.label} className="bg-white border border-gray-200 rounded-lg p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-800">{item.label}</p>
                                                            <p className="text-xs text-gray-400 mt-1">{item.helper}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-2xl font-black text-gray-800">{formatNumber.format(item.value)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <WeakStageAlert etapasDebiles={etapasDebiles} />
                                </div>
                            )}

                            {healthTab === 'tareas' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-700">Recordatorios prioritarios</h3>
                                                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">{recordatorios.length}</span>
                                            </div>
                                            <div className="space-y-2">
                                                {recordatorios.slice(0, 6).map((p, idx) => {
                                                    const esVencido = new Date(p.proximaLlamada) < new Date();
                                                    return (
                                                        <div
                                                            key={p.id || p._id || `task-${idx}`}
                                                            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${esVencido ? 'border-rose-200 bg-rose-50' : 'border-gray-200 bg-white'}`}
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-gray-800 truncate">{p.nombre || `${p.nombres || ''} ${p.apellidoPaterno || ''}`.trim()}</p>
                                                                <p className="text-xs text-gray-500 truncate">{p.esCliente ? 'Cliente ganado' : 'Prospecto'} · {p.telefono || 'Sin teléfono'}</p>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className={`text-xs font-bold ${esVencido ? 'text-rose-600' : 'text-gray-600'}`}>{new Date(p.proximaLlamada).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                                                <p className="text-[10px] uppercase tracking-widest text-gray-400">{esVencido ? 'vencido' : 'pendiente'}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {recordatorios.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Sin recordatorios pendientes.</p>}
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-700">Próximas citas</h3>
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">{reuniones.length}</span>
                                            </div>
                                            <div className="space-y-2">
                                                {reuniones.slice(0, 6).map((r, idx) => (
                                                    <div key={r.id || r._id || `meet-${idx}`} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-gray-800 truncate">{r.cliente?.nombres} {r.cliente?.apellidoPaterno}</p>
                                                                <p className="text-xs text-gray-500 truncate">{r.esCliente ? 'Cliente' : 'Prospecto'} · {r.cliente?.telefono || 'Sin teléfono'}</p>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="text-xs font-bold text-gray-700">{new Date(r.fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                                                <p className="text-[10px] uppercase tracking-widest text-gray-400">{new Date(r.fecha).toDateString() === new Date().toDateString() ? 'hoy' : 'próxima'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {reuniones.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No hay citas próximas.</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {healthTab === 'alertas' && (
                                <div className="space-y-4">
                                    <WeakStageAlert etapasDebiles={etapasDebiles} />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Prioridad 1</p>
                                            <p className="text-lg font-black text-gray-800 mt-2">Reactivar prospectos sin contacto</p>
                                            <p className="text-sm text-gray-500 mt-1">{sinContactar} oportunidades siguen sin seguimiento.</p>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Prioridad 2</p>
                                            <p className="text-lg font-black text-gray-800 mt-2">Cerrar citas abiertas</p>
                                            <p className="text-sm text-gray-500 mt-1">{closerData.metricas.reuniones.pendientes || 0} reuniones aún pendientes de atender.</p>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Prioridad 3</p>
                                            <p className="text-lg font-black text-gray-800 mt-2">Revisar cierres del mes</p>
                                            <p className="text-sm text-gray-500 mt-1">{closerData.metricas.ventas.mes || 0} ventas y {formatMoney.format(closerData.metricas.ventas.montoMes || 0)} acumulados.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

                    <div className="bg-(--theme-50)/40 border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col flex-1 min-h-0">
                        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4 shrink-0 uppercase tracking-widest">
                            <Phone className="w-4 h-4 text-rose-500" /> Recordatorios Pendientes
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2" style={{ scrollbarWidth: 'thin' }}>
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
                        <div className="flex-1 overflow-y-auto space-y-2" style={{ scrollbarWidth: 'thin' }}>
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
        </div>
    );
};

export default Dashboard;
