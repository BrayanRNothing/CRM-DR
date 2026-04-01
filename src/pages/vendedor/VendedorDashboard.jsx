import React, { useState, useEffect } from 'react';
import { Phone, UserPlus, Calendar, TrendingUp, RefreshCw, Clock, CheckCircle2, Target, MessageSquare, ExternalLink, BarChart3, Users, Award, DollarSign, AlertTriangle, TrendingDown, Zap, Bell, ArrowRightLeft, PercentCircle } from 'lucide-react';
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

import { getToken } from '../../utils/authUtils';

const getAuthHeaders = () => ({ 'x-auth-token': getToken() || '' });

const VendedorDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [prospectorData, setProspectorData] = useState(null);
    const [closerData, setCloserData] = useState(null);
    const [recordatorios, setRecordatorios] = useState([]);
    const [reuniones, setReuniones] = useState([]);
    const [loadingReuniones, setLoadingReuniones] = useState(true);
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
            setLoadingReuniones(true);
        }
        try {
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

            try {
                // 1. Obtener prospectos con recordatorio (Ruta Closer y Prospector), clientes ganados, y recordatorios de la base de tareas
                const [resCloser, resProspector, resClientes, resTareas] = await Promise.allSettled([
                    axios.get(`${API_URL}/api/closer/prospectos`, { headers: getAuthHeaders() }),
                    axios.get(`${API_URL}/api/prospector/prospectos`, { headers: getAuthHeaders() }),
                    axios.get(`${API_URL}/api/closer/clientes-ganados`, { headers: getAuthHeaders() }),
                    axios.get(`${API_URL}/api/tareas`, { headers: getAuthHeaders() })
                ]);

                let todosLosPendientes = [];

                if (resCloser.status === 'fulfilled') {
                    // Filtrar los que tengan llamada próxima Y tengan nombre/nombres
                    const leadsCloser = (resCloser.value.data || []).filter(p => !!p.proximaLlamada && (p.nombres || p.nombre));
                    todosLosPendientes = [...todosLosPendientes, ...leadsCloser];
                }
                
                if (resProspector.status === 'fulfilled') {
                    // Filtrar duplicados por ID (Prospectos)
                    const leadsP = (resProspector.value.data || []).filter(p => !!p.proximaLlamada && (p.nombres || p.nombre));
                    leadsP.forEach(lp => {
                        if (!todosLosPendientes.find(existing => (existing.id || existing._id) === (lp.id || lp._id))) {
                            todosLosPendientes.push(lp);
                        }
                    });
                }
                
                if (resClientes.status === 'fulfilled') {
                    const clientesConRec = (resClientes.value.data || []).filter(c => !!c.proximaLlamada && (c.nombres || c.nombre));
                    // Marcamos que son clientes ganados para identificarlos
                    clientesConRec.forEach(c => {
                        if (!todosLosPendientes.find(existing => (existing.id || existing._id) === (c.id || c._id))) {
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
                        const yaExiste = todosLosPendientes.find(existing => (existing.id || existing._id) === t.cliente);
                        if (!yaExiste) {
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

                todosLosPendientes.sort((a, b) => new Date(a.proximaLlamada) - new Date(b.proximaLlamada));
                setRecordatorios(todosLosPendientes.slice(0, 15));

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

        const interval = setInterval(() => {
            cargarDatos(true);
            cargarListas(true);
        }, 5 * 60 * 1000);

        const handleSocketUpdate = () => {
            cargarDatos(true);
            cargarListas(true);
        };
        socket.on('prospectos_actualizados', handleSocketUpdate);

        return () => {
            clearInterval(interval);
            socket.off('prospectos_actualizados', handleSocketUpdate);
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
    const periodoSuffix = PERIODOS.find(p => p.key === periodo)?.suffix || 'hoy';

    const totalEntrada = prospectorData.embudo.total || 0;
    const enContacto = prospectorData.embudo.en_contacto || 0;
    const sinContactar = Math.max(0, totalEntrada - enContacto);
    const negociacion = (prospectorData.embudo.reunion_agendada || 0) + (closerData.embudo.reunion_realizada || 0) + (closerData.embudo.propuesta_enviada || 0);
    const ganadas = closerData.embudo.venta_ganada || 0;
    const tasaGlobal = totalEntrada > 0 ? Math.round((ganadas / totalEntrada) * 100) : 0;

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
                                contadorHoy: prospectorData.periodos?.[periodo]?.prospectos ?? 0,
                                labelContador: `recibidos ${periodoSuffix}`,
                                cantidadExito: enContacto,
                                cantidadPerdida: sinContactar,
                                porcentajeExito: prospectorData.tasasConversion.contacto,
                                porcentajePerdida: (100 - (prospectorData.tasasConversion.contacto || 0)).toFixed(1),
                                labelExito: 'a contacto',
                                labelPerdida: 'sin tocar'
                            },
                            {
                                etapa: 'Contacto',
                                cantidad: enContacto,
                                color: 'bg-blue-500',
                                contadorHoy: prospectorData.periodos?.[periodo]?.llamadas ?? 0,
                                labelContador: `esfuerzos ${periodoSuffix}`,
                                cantidadExito: negociacion,
                                cantidadPerdida: Math.max(0, enContacto - negociacion),
                                porcentajeExito: enContacto > 0 ? Math.round((negociacion / enContacto) * 100) : 0,
                                porcentajePerdida: enContacto > 0 ? (100 - Math.round((negociacion / enContacto) * 100)).toFixed(1) : 0,
                                labelExito: 'a cita',
                                labelPerdida: 'estancados'
                            },
                            {
                                etapa: 'Negociación',
                                cantidad: negociacion,
                                color: 'bg-amber-500',
                                contadorHoy: (prospectorData.periodos?.[periodo]?.reuniones ?? 0) + (closerData.metricas.reuniones.realizadasHoy || 0),
                                labelContador: `citas ${periodoSuffix}`,
                                cantidadExito: ganadas,
                                cantidadPerdida: Math.max(0, negociacion - ganadas),
                                porcentajeExito: negociacion > 0 ? Math.round((ganadas / negociacion) * 100) : 0,
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
                
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    <div className="flex items-center justify-between shrink-0">
                        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-(--theme-600)" />
                            Métricas de Salud
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3">
                        {[
                            { Icon: UserPlus, value: sinContactar, label: 'Nuevos sin contactar', color: 'text-rose-500' },
                            { Icon: Target, value: negociacion, label: 'En Negociación', color: 'text-amber-500' },
                            { Icon: TrendingUp, value: `${tasaGlobal}%`, label: 'Conversión Global', color: 'text-cyan-500' },
                            { Icon: DollarSign, value: `$${(closerData.metricas.ventas.montoMes || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, label: 'Vendido este mes', color: 'text-green-500' }
                        ].map(({ Icon, value, label, color }, i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm flex flex-col items-center justify-center text-center">
                                <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
                                <div className="font-black text-gray-900 text-2xl tracking-tight leading-none">{value}</div>
                                <div className="text-[11px] text-gray-500 uppercase font-bold tracking-widest mt-1.5">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col flex-1 min-h-0">
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
                                            className={`${esVencido ? 'bg-rose-50/60 border-rose-100' : 'bg-(--theme-50)/40 border-(--theme-100)'} border rounded-lg p-2.5 transition-all hover:translate-x-1 cursor-pointer`}
                                            onClick={() => {
                                                if (p.esCliente) {
                                                    navigate('/vendedor/clientes', { state: { selectedId: p.id || p._id } });
                                                } else {
                                                    navigate('/prospector/prospectos', { state: { selectedId: p.id || p._id } });
                                                }
                                            }}
                                        >
                                            <div className="flex items-center justify-between gap-2 overflow-hidden">
                                                <div className="text-xs font-extrabold text-gray-900 truncate">
                                                    {p.nombre || `${p.nombres || ''} ${p.apellidoPaterno || ''}`.trim()}
                                                </div>
                                                {p.esCliente && (
                                                    <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded shrink-0 uppercase tracking-tighter">Cliente</span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between mt-1.5">
                                                <div className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${esVencido ? 'bg-rose-100 text-rose-700' : 'bg-(--theme-100) text-(--theme-700)'}`}>
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {new Date(p.proximaLlamada).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    {esVencido && <span className="ml-1">⚠ VENCIDO</span>}
                                                </div>
                                                {p.telefono && <div className="text-[10px] text-gray-400 font-bold">{p.telefono}</div>}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col flex-1 min-h-0">
                        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4 shrink-0 uppercase tracking-widest">
                            <Clock className="w-4 h-4 text-amber-500" /> Próximas Citas
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2" style={{ scrollbarWidth: 'thin' }}>
                            {loadingReuniones ? (
                                <div className="flex justify-center p-4"><RefreshCw className="animate-spin text-gray-400 w-4 h-4" /></div>
                            ) : reuniones.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-3">Libre de reuniones.</p>
                            ) : (
                                reuniones.map(r => (
                                    <div key={r.id || r._id} className="bg-amber-50/50 border border-amber-100 rounded-lg p-2">
                                        <div className="text-xs font-bold text-gray-900 truncate">{r.cliente?.nombres} {r.cliente?.apellidoPaterno}</div>
                                        <div className="flex justify-between items-center mt-1">
                                            <div className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                                {new Date(r.fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {r.cliente?.telefono && <div className="text-[10px] text-gray-400">📞 {r.cliente.telefono}</div>}
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
