import React, { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RefreshCw, ChevronRight, ArrowLeft, User, Trash2, Download, Upload, Plus, X, Phone, Filter, Star, Mail, Edit2, Building2, ChevronDown, Briefcase, DollarSign, UserSearch } from 'lucide-react';
import KanbanOportunidades from '../components/KanbanOportunidades';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getToken } from '../utils/authUtils';
import { clearCacheByPrefix } from '../hooks/useApiCache';

import API_URL from '../config/api';

const normalizeOportunidadRecordatorio = (oportunidad) => ({
    ...oportunidad,
    proximaLlamada:
        oportunidad?.proximaLlamada ||
        oportunidad?.proximallamada ||
        oportunidad?.proximoRecordatorio ||
        oportunidad?.proximorecordatorio ||
        null
});

const buildReminderByOportunidadMap = (tareas = []) => {
    const map = new Map();
    for (const t of tareas) {
        if (t?.estado !== 'pendiente') continue;
        if (t?.titulo !== 'Recordatorio de llamada') continue;
        if (!t?.oportunidad || !t?.fechaLimite) continue;

        const oportunidadId = String(t.oportunidad);
        const actual = map.get(oportunidadId);
        if (!actual || new Date(t.fechaLimite) < new Date(actual)) {
            map.set(oportunidadId, t.fechaLimite);
        }
    }
    return map;
};

const ETAPAS_CLIENTE = {
    'oportunidad_nuevo': { label: 'Oportunidad nuevo', color: 'bg-emerald-100 text-emerald-700' },
    'en_seguimiento': { label: 'En seguimiento', color: 'bg-blue-100 text-blue-700' },
    'oportunidad_activa': { label: 'Oportunidad activa', color: 'bg-purple-100 text-purple-700' },
    'reunion_con_oportunidad': { label: 'Reunión con oportunidad', color: 'bg-amber-100 text-amber-700' },
    'inactivo': { label: 'Inactivo', color: 'bg-gray-100 text-gray-700' }
};

const getEtapaLabel = (etapa) => ETAPAS_CLIENTE[etapa]?.label || (etapa || 'Oportunidad nuevo');
const getEtapaColor = (etapa) => ETAPAS_CLIENTE[etapa]?.color || 'bg-emerald-100 text-emerald-700';

const ETAPAS_PROSPECTO_LIST = ['prospecto_nuevo', 'en_contacto', 'reunion_agendada', 'reunion_realizada', 'en_negociacion', 'venta_ganada', 'perdido'];
const esProspectoCheck = (oportunidad) => {
    if (oportunidad.cliente_tipo) {
        return oportunidad.cliente_tipo === 'prospecto';
    }
    const etapa = oportunidad.cliente_etapaEmbudo || oportunidad.cliente_etapaembudo;
    if (!etapa) return false;
    return ETAPAS_PROSPECTO_LIST.includes(String(etapa).toLowerCase().trim());
};

const Oportunidades = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const esMenuSeguimiento = location.pathname.endsWith('/oportunidades/seguimiento');
    const [oportunidades, setOportunidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [oportunidadAEliminar, setOportunidadAEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);
    const [importando, setImportando] = useState(false);
    const [ordenFiltro, setOrdenFiltro] = useState('todos');
    const [filtroVisibilidad, setFiltroVisibilidad] = useState('mine');
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const vistaKanban = true;
    const fileInputRef = useRef(null);

    // Modal Crear (2 pasos: buscar contacto -> datos deal)
    const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
    const [stepCrear, setStepCrear] = useState(1);
    const [contactoBusqueda, setContactoBusqueda] = useState('');
    const [contactosResultados, setContactosResultados] = useState([]);
    const [buscandoContactos, setBuscandoContactos] = useState(false);
    const [contactoSeleccionado, setContactoSeleccionado] = useState(null);
    const [formDeal, setFormDeal] = useState({ titulo: '', monto: '', notas: '' });
    const [creandoOportunidad, setCreandoOportunidad] = useState(false);

    // Modal Editar
    const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
    const [oportunidadAEditar, setOportunidadAEditar] = useState({});
    const [loadingEditar, setLoadingEditar] = useState(false);

    // Modal confirmacion Ganada desde Kanban
    const [oportunidadGanadaPendiente, setOportunidadGanadaPendiente] = useState(null);
    const [procesandoCierre, setProcesandoCierre] = useState(false);

    const [lastViewedId, setLastViewedId] = useState(null);

    useEffect(() => {
        const algunModalAbierto = mostrarModalCrear || modalEditarAbierto || !!oportunidadGanadaPendiente || !!oportunidadAEliminar;
        const container = document.getElementById('main-scroll-container');
        if (container) {
            if (algunModalAbierto) container.style.setProperty('overflow', 'hidden', 'important');
            else container.style.removeProperty('overflow');
        }
        return () => { if (container) container.style.removeProperty('overflow'); };
    }, [mostrarModalCrear, modalEditarAbierto, oportunidadGanadaPendiente, oportunidadAEliminar]);

    const getAuthHeaders = () => ({ 'x-auth-token': getToken() || '' });

    const getCurrentUserId = () => {
        try {
            const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (!raw) return null;
            const user = JSON.parse(raw);
            return user?.id ?? user?._id ?? null;
        } catch { return null; }
    };
    const currentUserId = getCurrentUserId();

    const isOwnerRecord = (record) => {
        const ownerId = record?.propietarioId ?? record?.prospectorAsignado ?? record?.vendedorAsignado ?? null;
        if (ownerId == null || currentUserId == null) return false;
        return String(ownerId) === String(currentUserId);
    };

    const cargarOportunidades = async () => {
        setLoading(true);
        try {
            const [resOps, resTareas] = await Promise.all([
                axios.get(`${API_URL}/api/oportunidades/todas`, { headers: getAuthHeaders(), params: { scope: filtroVisibilidad } }),
                axios.get(`${API_URL}/api/tareas`, { headers: getAuthHeaders() })
            ]);
            const map = buildReminderByOportunidadMap(resTareas.data || []);
            const data = (resOps.data || []).map(raw => {
                const op = normalizeOportunidadRecordatorio(raw);
                if (op.proximaLlamada) return op;
                return { ...op, proximaLlamada: map.get(String(op.id || op._id)) || null };
            });
            setOportunidades(data);
            return data;
        } catch (err) {
            console.error('Error al cargar oportunidades:', err);
            setOportunidades([]);
            return [];
        } finally { setLoading(false); }
    };

    useEffect(() => {
        cargarOportunidades();
        const interval = setInterval(cargarOportunidades, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [filtroVisibilidad]);

    const handleToggleCompartido = async (oportunidad, nuevoEstado) => {
        const id = oportunidad.id || oportunidad._id;
        const prev = [...oportunidades];
        setOportunidades(curr => curr.map(c => String(c.id || c._id) === String(id) ? { ...c, compartido: nuevoEstado } : c));
        try {
            await axios.patch(`${API_URL}/api/vendedor/prospectos/${id}/compartir`, { compartido: nuevoEstado }, { headers: getAuthHeaders() });
            toast.success(nuevoEstado ? 'Oportunidad compartida' : 'Oportunidad marcada como privada');
        } catch (err) {
            setOportunidades(prev);
            toast.error(err.response?.data?.msg || 'No se pudo actualizar la visibilidad');
        }
    };

    const handleVerDetalles = (oportunidad) => {
        if (!oportunidad) return;
        const esProspecto = esProspectoCheck(oportunidad);
        if (esProspecto) {
            navigate('/vendedor/prospectos', { state: { openClienteId: oportunidad.cliente_id } });
        } else {
            navigate('/vendedor/clientes', { state: { openClienteId: oportunidad.cliente_id } });
        }
    };

    const abrirModalEditar = (p) => {
        setOportunidadAEditar({ id: p._id || p.id, titulo: p.titulo || '', monto: p.monto || '' });
        setModalEditarAbierto(true);
    };

    const handleEditarOportunidad = async () => {
        if (!oportunidadAEditar.titulo?.trim()) { toast.error('El nombre es obligatorio.'); return; }
        setLoadingEditar(true);
        try {
            await axios.put(`${API_URL}/api/oportunidades/${oportunidadAEditar.id}`,
                { titulo: oportunidadAEditar.titulo, monto: oportunidadAEditar.monto },
                { headers: getAuthHeaders() }
            );
            toast.success('Oportunidad actualizada');
            clearCacheByPrefix('dashboard');
            setModalEditarAbierto(false);
            await cargarOportunidades();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error al actualizar');
        } finally { setLoadingEditar(false); }
    };

    const buscarContactos = useCallback(async (q) => {
        if (!q.trim()) { setContactosResultados([]); return; }
        setBuscandoContactos(true);
        try {
            const [resP, resC] = await Promise.allSettled([
                axios.get(`${API_URL}/api/vendedor/prospectos`, { headers: getAuthHeaders(), params: { busqueda: q, limit: 10 } }),
                axios.get(`${API_URL}/api/vendedor/clientes-ganados`, { headers: getAuthHeaders(), params: { busqueda: q, limit: 10 } })
            ]);
            const prospectos = (resP.status === 'fulfilled' ? resP.value.data || [] : []).map(p => ({ ...p, _tipo: 'prospecto' }));
            const clientes = (resC.status === 'fulfilled' ? resC.value.data || [] : []).map(c => ({ ...c, _tipo: 'cliente' }));
            setContactosResultados([...prospectos, ...clientes].slice(0, 15));
        } catch { setContactosResultados([]); }
        finally { setBuscandoContactos(false); }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => buscarContactos(contactoBusqueda), 350);
        return () => clearTimeout(t);
    }, [contactoBusqueda, buscarContactos]);

    const resetModalCrear = () => {
        setMostrarModalCrear(false);
        setStepCrear(1);
        setContactoBusqueda('');
        setContactosResultados([]);
        setContactoSeleccionado(null);
        setFormDeal({ titulo: '', monto: '', notas: '' });
    };

    const handleCrearOportunidad = async () => {
        if (!contactoSeleccionado) { toast.error('Selecciona un cliente o prospecto.'); return; }
        if (!formDeal.titulo.trim()) { toast.error('El nombre de la oportunidad es obligatorio.'); return; }
        setCreandoOportunidad(true);
        try {
            const clienteId = contactoSeleccionado.id || contactoSeleccionado._id;
            const kanbanCols = (() => { try { const s = localStorage.getItem('kanban_oportunidades_cols_v4'); return s ? JSON.parse(s) : null; } catch { return null; } })();
            const primeraEtapa = kanbanCols?.[0]?.id || 'nueva';
            await axios.post(`${API_URL}/api/oportunidades`, {
                cliente_id: clienteId,
                titulo: formDeal.titulo,
                monto: formDeal.monto ? Number(formDeal.monto) : 0,
                notas: JSON.stringify({ texto: formDeal.notas || '', url: null }),
                etapa: primeraEtapa,
            }, { headers: getAuthHeaders() });
            toast.success('Oportunidad creada');
            resetModalCrear();
            await cargarOportunidades();
        } catch (err) {
            toast.error(err.response?.data?.mensaje || 'No se pudo crear la oportunidad.');
        } finally { setCreandoOportunidad(false); }
    };

    const handleEtapaChange = async (oportunidadId, nuevaEtapa) => {
        if (nuevaEtapa === 'ganada') {
            const opp = oportunidades.find(o => String(o.id || o._id) === String(oportunidadId));
            setOportunidadGanadaPendiente({ ...(opp || { id: oportunidadId }), _nuevaEtapa: nuevaEtapa });
            return;
        }
        const oldOps = [...oportunidades];
        setOportunidades(prev => prev.map(c => String(c.id || c._id) === String(oportunidadId) ? { ...c, etapa: nuevaEtapa } : c));
        try {
            await axios.put(`${API_URL}/api/oportunidades/${oportunidadId}`, { etapa: nuevaEtapa }, { headers: getAuthHeaders() });
            clearCacheByPrefix('dashboard');
        } catch {
            setOportunidades(oldOps);
            toast.error('Error al cambiar etapa');
        }
    };

    const confirmarGanada = async (convertirProspecto = false) => {
        if (!oportunidadGanadaPendiente) return;
        const opp = oportunidadGanadaPendiente;
        const oppId = opp.id || opp._id;
        setProcesandoCierre(true);
        try {
            await axios.put(`${API_URL}/api/oportunidades/${oppId}`, { etapa: 'ganada' }, { headers: getAuthHeaders() });
            setOportunidades(prev => prev.map(c => String(c.id || c._id) === String(oppId) ? { ...c, etapa: 'ganada' } : c));
            const esProsp = esProspectoCheck(opp);
            // Increment facturado unconditionally if it has monto, as both existing clients and converted prospects generate revenue.
            if (opp.monto && opp.cliente_id) {
                try { await axios.patch(`${API_URL}/api/vendedor/clientes-ganados/${opp.cliente_id}/facturado`, { incremento: Number(opp.monto) }, { headers: getAuthHeaders() }); } catch {}
            }
            if (esProsp && convertirProspecto && opp.cliente_id) {
                try {
                    await axios.post(`${API_URL}/api/vendedor/pasar-a-cliente/${opp.cliente_id}`, {}, { headers: getAuthHeaders() });
                    toast.success('Prospecto convertido a cliente!');
                } catch { toast.error('No se pudo convertir el prospecto.'); }
            }
            toast.success(`"${opp.titulo}" marcada como Ganada!`);
            clearCacheByPrefix('dashboard');
            setOportunidadGanadaPendiente(null);
        } catch { toast.error('Error al cerrar la oportunidad'); }
        finally { setProcesandoCierre(false); }
    };

    const handleEliminarOportunidad = async () => {
        if (!oportunidadAEliminar) return;
        setEliminando(true);
        try {
            await axios.delete(`${API_URL}/api/oportunidades/${oportunidadAEliminar.id || oportunidadAEliminar._id}`, { headers: getAuthHeaders() });
            setOportunidades(prev => prev.filter(c => (c.id || c._id) !== (oportunidadAEliminar.id || oportunidadAEliminar._id)));
            setOportunidadAEliminar(null);
        } catch (err) {
            toast.error(err.response?.data?.mensaje || 'No se pudo eliminar.');
        } finally { setEliminando(false); }
    };

    const escapeCsv = (value) => { const safe = String(value ?? '').replace(/"/g, '""'); return `"${safe}"`; };

    const exportarOportunidadesCsv = () => {
        if (!oportunidadesFiltrados.length) { alert('No hay oportunidades para exportar.'); return; }
        const headers = ['titulo', 'cliente', 'monto', 'etapa', 'fechaUltimaEtapa'];
        const rows = oportunidadesFiltrados.map(o => [o.titulo, o.cliente_nombres || o.cliente_empresa || '', o.monto || '', o.etapa || '', o.fechaUltimaEtapa || ''].map(escapeCsv).join(','));
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `oportunidades_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportarOportunidades = async (event) => {
        const file = event.target.files?.[0]; event.target.value = '';
        if (!file) return;
        setImportando(true);
        try { toast.success('Importacion completada.'); }
        catch { alert('Error al leer el archivo.'); }
        finally { setImportando(false); }
    };


    const oportunidadesFiltrados = useMemo(() => {
        let filtrados = oportunidades.filter((oportunidad) => {
            const matchBusqueda =
                busqueda === '' ||
                (oportunidad.titulo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (oportunidad.apellidoPaterno || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (oportunidad.empresa || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (oportunidad.correo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (oportunidad.telefono || '').includes(busqueda);

            return matchBusqueda;
        });

        if (ordenFiltro === 'en_proceso') {
            filtrados = filtrados.filter(p => {
                let sections = [];
                if (typeof p.customSections === 'string') {
                    try { sections = JSON.parse(p.customSections); } catch(e) {}
                } else if (Array.isArray(p.customSections)) {
                    sections = p.customSections;
                }
                // Check if they have the opportunities module created
                return sections.some(s => s.tipo === 'opportunities');
            });
        }

        return filtrados.sort((a, b) => {
            if (ordenFiltro === 'mayor_facturado') {
                const facturadoA = Number(a.monto) || Number(a.customMetricValue) || 0;
                const facturadoB = Number(b.monto) || Number(b.customMetricValue) || 0;
                if (facturadoA !== facturadoB) return facturadoB - facturadoA;
            } else if (ordenFiltro === 'mayor_valor') {
                const interesA = a.interes ?? 5;
                const interesB = b.interes ?? 5;
                if (interesA !== interesB) return interesB - interesA;
            }
            return 0; // fallback a creación (como vienen)
        });
    }, [oportunidades, busqueda, ordenFiltro]);

    return (
        <>
            <div className={`md:bg-slate-50 md:p-6 bg-white -m-4 md:m-0 p-4 flex flex-col w-full ${vistaKanban ? 'flex-1 h-full min-h-0 overflow-hidden pb-4 md:pb-4' : 'min-h-screen pb-8 md:pb-6'}`}>
                <div className={`max-w-[1600px] w-full mx-auto flex flex-col ${vistaKanban ? 'h-full flex-1' : ''}`}>
                    <div className="flex flex-col xl:flex-row xl:items-center gap-4 mb-3 shrink-0">
                        {/* Title - Left Aligned */}
                        <div className="shrink-0 xl:flex-1 min-w-0">
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                                {esMenuSeguimiento ? 'Seguimiento de Oportunidades' : 'Oportunidades'}
                            </h1>
                            <p className="text-xs md:text-sm text-gray-500 mt-0.5 leading-snug">
                                {esMenuSeguimiento
                                    ? 'Gestiona y da seguimiento a tu cartera de oportunidades ganados.'
                                    : 'Cartera de oportunidades ganados.'}
                            </p>
                        </div>

                        {/* Search and View Toggles - Centered */}
                        <div className="flex items-center justify-start xl:justify-center gap-2 w-full xl:w-auto xl:flex-none">
                                {/* Unified Search and Filters */}
                                <div className="flex items-center bg-white border border-slate-200 rounded-lg h-9 shadow-sm shrink-0 w-full sm:w-[350px] overflow-visible relative">
                                    <div className="flex items-center h-full bg-slate-50/50 border-r border-slate-200 shrink-0 relative">
                                        <button
                                            onClick={() => setMostrarFiltros(!mostrarFiltros)}
                                            className="flex items-center justify-center w-9 h-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
                                            title="Filtros"
                                        >
                                            <Filter className="w-4 h-4" />
                                            {(ordenFiltro !== 'todos' || filtroVisibilidad !== 'mine') && (
                                                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                            )}
                                        </button>

                                        <AnimatePresence>
                                            {mostrarFiltros && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden"
                                                >
                                                    <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-700">Filtros</span>
                                                        {(ordenFiltro !== 'todos' || filtroVisibilidad !== 'mine') && (
                                                            <button
                                                                onClick={() => { setOrdenFiltro('todos'); setFiltroVisibilidad('mine'); }}
                                                                className="text-[10px] font-semibold text-red-500 hover:text-red-700"
                                                            >
                                                                Limpiar
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="p-2 flex flex-col gap-2">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">Visibilidad</label>
                                                            <select
                                                                value={filtroVisibilidad}
                                                                onChange={(e) => setFiltroVisibilidad(e.target.value)}
                                                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 px-2 outline-none"
                                                            >
                                                                <option value="mine">Mis oportunidades</option>
                                                                <option value="shared">Compartidos</option>
                                                                <option value="all">Todos visibles</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">Ordenar por</label>
                                                            <select
                                                                value={ordenFiltro}
                                                                onChange={(e) => setOrdenFiltro(e.target.value)}
                                                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 px-2 outline-none"
                                                            >
                                                                <option value="todos">Defecto</option>
                                                                <option value="mayor_valor">Mayor valor</option>
                                                                <option value="mayor_facturado">Facturado</option>
                                                                <option value="en_proceso">Oportunidad</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {busqueda && (
                                            <button
                                                onClick={() => setBusqueda('')}
                                                className="absolute -right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 bg-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-300 rounded-full transition-colors z-10"
                                                title="Limpiar búsqueda"
                                            >
                                                <span className="text-[10px] font-bold leading-none">✕</span>
                                            </button>
                                        )}
                                    </div>

                                    <div className="relative flex-1 h-full min-w-[150px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar oportunidades..."
                                            value={busqueda}
                                            onChange={(e) => setBusqueda(e.target.value)}
                                            className="w-full h-full pl-9 pr-3 bg-transparent outline-none text-[11px] font-medium text-slate-700 placeholder:text-slate-400 focus:bg-slate-50 transition-colors border-0 focus:ring-0"
                                        />
                                    </div>

                                    <div 
                                        className={`flex items-center justify-center h-full border-l border-slate-200 bg-slate-50/50 transition-all ${vistaKanban ? 'w-10' : 'w-10 opacity-0 pointer-events-none'}`} 
                                        id="kanban-settings-portal-target"
                                    ></div>
                                </div>

                            {/* Toggle Vista Lista / Kanban REMOVED */}
                        </div>

                        {/* Actions - Right Aligned */}
                        <div className="flex items-center justify-start xl:justify-end gap-2 w-full xl:w-auto xl:flex-1 min-w-0 mt-2 xl:mt-0">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,text/csv"
                                className="hidden"
                                onChange={handleImportarOportunidades}
                            />
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={importando}
                                    className="flex items-center justify-center w-9 h-9 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm shrink-0"
                                    title="Importar"
                                >
                                    {importando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={exportarOportunidadesCsv}
                                    disabled={loading || !oportunidadesFiltrados.length}
                                    className="flex items-center justify-center w-9 h-9 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm shrink-0"
                                    title="Exportar"
                                >
                                    <Upload className="w-4 h-4" />
                                </button>
                            </div>
                            <button
                                onClick={() => setMostrarModalCrear(true)}
                                className="hidden sm:flex w-full sm:w-auto justify-center items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-(--theme-600) text-white rounded-lg hover:bg-(--theme-700) transition-colors text-xs md:text-sm font-medium"
                            >
                                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                                Crear Oportunidad
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="bg-white md:border md:border-slate-200 md:rounded-2xl md:shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50/80 text-slate-400 uppercase">
                                        <tr>
                                            <th className="px-4 py-4"><div className="h-2.5 bg-slate-200/80 rounded-full w-20 animate-pulse"></div></th>
                                            <th className="px-4 py-4"><div className="h-2.5 bg-slate-200/80 rounded-full w-24 animate-pulse"></div></th>
                                            <th className="px-4 py-4"><div className="h-2.5 bg-slate-200/80 rounded-full w-20 animate-pulse"></div></th>
                                            <th className="px-4 py-4 text-center"><div className="h-2.5 bg-slate-200/80 rounded-full w-16 mx-auto animate-pulse"></div></th>
                                            <th className="px-4 py-4"><div className="h-2.5 bg-slate-200/80 rounded-full w-28 animate-pulse"></div></th>
                                            <th className="px-4 py-4"><div className="h-2.5 bg-slate-200/80 rounded-full w-24 animate-pulse"></div></th>
                                            <th className="px-4 py-4 text-center"><div className="h-2.5 bg-slate-200/80 rounded-full w-14 mx-auto animate-pulse"></div></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {[1, 2, 3, 4, 5].map((idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-5 font-medium">
                                                    <div className="space-y-2">
                                                        <div className="h-4 bg-slate-200/80 rounded-md w-32 animate-pulse"></div>
                                                        <div className="h-3 bg-slate-100 rounded-md w-24 animate-pulse"></div>
                                                        <div className="flex items-center gap-1 pt-0.5">
                                                            {[1, 2, 3, 4, 5].map((s) => (
                                                                <div key={s} className="h-2.5 w-2.5 rounded-full bg-amber-100 animate-pulse"></div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5"><div className="h-4 bg-slate-100 rounded-md w-24 animate-pulse"></div></td>
                                                <td className="px-4 py-5">
                                                    <div className="space-y-1.5">
                                                        <div className="h-3.5 bg-slate-100 rounded-md w-28 animate-pulse"></div>
                                                        <div className="h-3.5 bg-slate-100 rounded-md w-20 animate-pulse"></div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5 text-center"><div className="h-5 bg-slate-200/80 rounded-full w-20 mx-auto animate-pulse"></div></td>
                                                <td className="px-4 py-5"><div className="h-4 bg-slate-100 rounded-md w-36 animate-pulse"></div></td>
                                                <td className="px-4 py-5"><div className="h-4 bg-slate-100 rounded-md w-24 animate-pulse"></div></td>
                                                <td className="px-4 py-5 text-center">
                                                    <div className="flex justify-center gap-1.5">
                                                        <div className="h-7 w-7 rounded-lg bg-slate-100 animate-pulse"></div>
                                                        <div className="h-7 w-7 rounded-lg bg-slate-100 animate-pulse"></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            {vistaKanban ? (
                                <motion.div
                                    key="kanban"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                    className="flex flex-col flex-1 h-full min-h-0 w-full"
                                >
                                    <KanbanOportunidades
                            oportunidades={oportunidadesFiltrados}
                            onVerDetalles={handleVerDetalles}
                            abrirModalEditar={abrirModalEditar}
                            setOportunidadAEliminar={setOportunidadAEliminar}
                            handleToggleCompartido={handleToggleCompartido}
                            isOwnerRecord={isOwnerRecord}
                            onEtapaChange={handleEtapaChange}
                        />
                                </motion.div>
                            ) : oportunidadesFiltrados.length === 0 ? (
                                <motion.div
                                    key="lista_vacia"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                    className="bg-white md:rounded-2xl p-12 min-h-60 flex flex-col items-center justify-center text-center"
                                >
                                    <User className="w-12 h-12 text-slate-300 mb-4" />
                                    <p className="text-gray-500 font-medium">No se encontraron oportunidades.</p>
                                    <p className="text-gray-400 text-sm mt-1">Intenta con otra busqueda o ajusta los filtros.</p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="lista"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                    className="space-y-6"
                                >
                                    {(() => {
                                const misPrivados = [];
                                const misCompartidos = [];
                                const deOtros = {};

                                oportunidadesFiltrados.forEach(oportunidad => {
                                    const isMine = oportunidad.esPropietario === true || isOwnerRecord(oportunidad);
                                    if (isMine) {
                                        if (oportunidad.compartido) {
                                            misCompartidos.push(oportunidad);
                                        } else {
                                            misPrivados.push(oportunidad);
                                        }
                                    } else {
                                        const ownerName = oportunidad.propietarioNombre || oportunidad.vendedor?.titulo || oportunidad.prospectorAsignadoNombre || 'Otro Usuario';
                                        if (!deOtros[ownerName]) deOtros[ownerName] = [];
                                        deOtros[ownerName].push(oportunidad);
                                    }
                                });

                                const renderRow = (oportunidad) => {
                                    const id = oportunidad._id || oportunidad.id;
                                    const isLastViewed = lastViewedId && id === lastViewedId;
                                    return (<tr key={id} className={`transition-all cursor-pointer ${isLastViewed ? 'row-highlight-shimmer' : 'hover:bg-slate-50/70'}`} onClick={() => handleVerDetalles(oportunidad)}>
                                        <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <p className="font-bold text-gray-900 leading-tight text-[11px] md:text-sm">
                                                    {oportunidad.titulo} {oportunidad.apellidoPaterno}
                                                </p>
                                                <p className="text-[9px] md:text-[10px] text-slate-500 mt-0.5 max-w-[100px] md:max-w-none truncate">
                                                    {oportunidad.empresa || 'Sin empresa'}
                                                </p>
                                                <div className="flex items-center gap-0.5 text-yellow-500 scale-[0.6] md:scale-75 origin-left mt-0.5">
                                                    {[1, 2, 3, 4, 5].map((val) => (
                                                        <Star key={val} className={`w-3.5 h-3.5 ${(oportunidad.interes || 5) >= val ? 'fill-yellow-400' : 'fill-slate-100 text-slate-300'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] md:text-sm font-semibold text-gray-800">
                                                    {(oportunidad.monto || oportunidad.customMetricValue) ? `${oportunidad.customMetricLabel || 'MXN'} $${Number(oportunidad.monto || oportunidad.customMetricValue).toLocaleString('es-MX')}` : '$0'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">
                                            <div className="space-y-0.5">
                                                {oportunidad.telefono ? (
                                                    <p className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                                                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                        {oportunidad.telefono}
                                                    </p>
                                                ) : null}
                                                {oportunidad.correo ? (
                                                    <p className="flex items-center gap-1.5 text-gray-500 text-sm">
                                                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                        <span>{oportunidad.correo}</span>
                                                    </p>
                                                ) : null}
                                                {!oportunidad.telefono && !oportunidad.correo && (
                                                    <span className="text-xs text-slate-400 italic">Sin contacto</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-4 py-2 md:py-3 text-center whitespace-nowrap">
                                            {(() => {
                                                const etapaKey = oportunidad.etapaOportunidad || 'oportunidad_nuevo';
                                                const colorCls = getEtapaColor(etapaKey);
                                                const label = getEtapaLabel(etapaKey);
                                                return (
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${colorCls}`}>
                                                        {label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-2 md:px-4 py-2 md:py-3 text-center whitespace-nowrap">
                                            {(() => {
                                                let tags = [];
                                                try {
                                                    if (typeof oportunidad.etiquetas === 'string') {
                                                        tags = JSON.parse(oportunidad.etiquetas);
                                                    } else if (Array.isArray(oportunidad.etiquetas)) {
                                                        tags = oportunidad.etiquetas;
                                                    }
                                                } catch (e) { tags = []; }
                                                
                                                if (!tags || tags.length === 0) {
                                                    return <span className="text-xs text-slate-300 italic">Sin etiquetas</span>;
                                                }
                                                
                                                const visibleTags = tags.slice(0, 2);
                                                const remainingCount = tags.length - 2;
                                                
                                                return (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {visibleTags.map((tag, i) => {
                                                            const color = '#94a3b8';
                                                            return (
                                                                <span 
                                                                    key={i} 
                                                                    className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider truncate max-w-[100px]"
                                                                    style={{ 
                                                                        backgroundColor: `${color}20`, 
                                                                        color: color 
                                                                    }}
                                                                    title={tag}
                                                                >
                                                                    <span className="truncate leading-none pt-px">{tag}</span>
                                                                </span>
                                                            );
                                                        })}
                                                        {remainingCount > 0 && (
                                                            <span 
                                                                className="inline-flex items-center justify-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-help bg-slate-100 text-slate-500"
                                                                title={`Y ${remainingCount} etiqueta(s) más`}
                                                            >
                                                                +{remainingCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">
                                            {oportunidad.proximaLlamada ? (() => {
                                                const esVencido = new Date(oportunidad.proximaLlamada) < new Date();
                                                return (
                                                    <div className={`flex items-center gap-1.5 ${esVencido ? 'text-red-600' : 'text-emerald-00'}`}>
                                                        <Phone className="w-3 h-3 shrink-0" />
                                                        <span className="text-[10px] font-bold leading-tight uppercase tracking-tighter">
                                                            {new Date(oportunidad.proximaLlamada).toLocaleString('es-MX', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                            {esVencido && ' ⚠'}
                                                        </span>
                                                    </div>
                                                );
                                            })() : (
                                                <span className="text-xs text-slate-400 italic">Sin pendiente</span>
                                            )}
                                        </td>
                                        <td className="px-2 md:px-4 py-2 md:py-3 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-1.5 md:gap-3">
                                                {(oportunidad.esPropietario === true || isOwnerRecord(oportunidad)) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleCompartido(oportunidad, !oportunidad.compartido);
                                                        }}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${oportunidad.compartido ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200 shadow-sm border-2 border-emerald-200' : 'text-gray-400 hover:text-(--theme-600) hover:bg-(--theme-50)'}`}
                                                        title={oportunidad.compartido ? "Dejar de compartir" : "Compartir con el equipo"}
                                                    >
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); abrirModalEditar(oportunidad); }}
                                                    className="text-gray-400 hover:text-(--theme-600) transition-colors p-2 rounded-full hover:bg-(--theme-50)"
                                                    title="Editar Oportunidad"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setOportunidadAEliminar(oportunidad); }}
                                                    className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                                                    title="Eliminar Oportunidad"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>);
                                };

                                const renderGroup = (groupItems, title, colorClass) => {
                                    if (groupItems.length === 0) return null;
                                    return (
                                        <div key={title} className="bg-white md:border md:border-slate-200 md:rounded-2xl md:shadow-sm overflow-hidden mb-6 last:mb-0">
                                            <div className={`px-4 py-3 border-b border-slate-100 ${colorClass}`}>
                                                <h3 className="font-black text-xs uppercase tracking-wider">{title} ({groupItems.length})</h3>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm">
                                                    <thead className="bg-slate-100/70 text-slate-500 uppercase">
                                                        <tr>
                                                            <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-[10px] md:text-xs">Oportunidad</th>
                                                            <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-[10px] md:text-xs">Facturado</th>
                                                            <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-[10px] md:text-xs">Contacto</th>
                                                            <th className="px-2 md:px-4 py-2 md:py-3 text-center font-semibold text-[9px] md:text-xs uppercase tracking-wider">Etapa</th>
                                                            <th className="px-2 md:px-4 py-2 md:py-3 text-center font-semibold text-[9px] md:text-xs uppercase tracking-wider whitespace-nowrap">Etiquetas</th>
                                                            <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-[10px] md:text-xs">Recordatorio</th>
                                                            <th className="px-2 md:px-4 py-2 md:py-3 text-center font-semibold text-[10px] md:text-xs">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {groupItems.map(renderRow)}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                };

                                return (
                                    <>
                                        {renderGroup(misPrivados, "Mi Lista (Privados)", "bg-slate-50 text-slate-700")}
                                        {renderGroup(misCompartidos, "Mis Oportunidades Compartidos", "bg-emerald-50 text-emerald-800")}
                                        {Object.entries(deOtros).map(([owner, list]) =>
                                            renderGroup(list, `Compartidos por ${owner}`, "bg-indigo-50 text-indigo-800")
                                        )}
                                    </>
                                );
                            })()}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* ── MODALES ── */}

            {/* Modal Crear Oportunidad (2 pasos) */}
            <AnimatePresence>
                {mostrarModalCrear && (
                    <motion.div
                        key="modal-crear"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) resetModalCrear(); }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Nueva Oportunidad</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {stepCrear === 1 ? 'Paso 1 de 2 — Selecciona el cliente o prospecto' : `Paso 2 de 2 — Datos del negocio con ${contactoSeleccionado?.titulo || contactoSeleccionado?.nombres || 'el contacto'}`}
                                    </p>
                                </div>
                                <button onClick={resetModalCrear} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {stepCrear === 1 ? (
                                    <>
                                        {/* Búsqueda de contacto */}
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                autoFocus
                                                type="text"
                                                value={contactoBusqueda}
                                                onChange={(e) => setContactoBusqueda(e.target.value)}
                                                placeholder="Buscar cliente o prospecto..."
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-(--theme-400) focus:bg-white transition-all"
                                            />
                                            {buscandoContactos && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
                                        </div>

                                        {/* Resultados */}
                                        {contactosResultados.length > 0 ? (
                                            <div className="space-y-1 max-h-60 overflow-y-auto">
                                                {contactosResultados.map(c => {
                                                    const cId = c.id || c._id;
                                                    const nombre = c.titulo || c.nombres || c.nombre || 'Sin nombre';
                                                    const empresa = c.empresa || '';
                                                    const esPros = c._tipo === 'prospecto';
                                                    return (
                                                        <button
                                                            key={cId}
                                                            onClick={() => { setContactoSeleccionado(c); setStepCrear(2); }}
                                                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-all text-left group"
                                                        >
                                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${esPros ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                {nombre.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-sm text-slate-800 truncate">{nombre}</p>
                                                                {empresa && <p className="text-xs text-slate-400 truncate">{empresa}</p>}
                                                            </div>
                                                            <span className={`text-[10px] font-black px-2 py-1 rounded-full shrink-0 ${esPros ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                {esPros ? 'Prospecto' : 'Cliente'}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : contactoBusqueda && !buscandoContactos ? (
                                            <div className="text-center py-8 text-slate-400">
                                                <User className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                                <p className="text-sm font-medium">Sin resultados para "{contactoBusqueda}"</p>
                                            </div>
                                        ) : !contactoBusqueda ? (
                                            <div className="text-center py-8 text-slate-300">
                                                <Search className="w-10 h-10 mx-auto mb-2" />
                                                <p className="text-sm">Escribe el nombre del cliente o prospecto</p>
                                            </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <>
                                        {/* Contacto seleccionado */}
                                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${contactoSeleccionado?._tipo === 'prospecto' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {(contactoSeleccionado?.titulo || contactoSeleccionado?.nombres || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-slate-800 truncate">{contactoSeleccionado?.titulo || contactoSeleccionado?.nombres}</p>
                                                <p className="text-xs text-slate-400">{contactoSeleccionado?._tipo === 'prospecto' ? 'Prospecto' : 'Cliente'}</p>
                                            </div>
                                            <button onClick={() => { setStepCrear(1); setContactoSeleccionado(null); }} className="text-xs text-slate-400 hover:text-slate-600 underline">
                                                cambiar
                                            </button>
                                        </div>

                                        {/* Nombre del deal */}
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-600 mb-1.5 uppercase tracking-wider">Nombre de la Oportunidad *</label>
                                            <input
                                                autoFocus
                                                type="text"
                                                value={formDeal.titulo}
                                                onChange={(e) => setFormDeal(f => ({ ...f, titulo: e.target.value }))}
                                                placeholder="Ej: Venta de 50 licencias"
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-(--theme-400) focus:bg-white transition-all"
                                            />
                                        </div>

                                        {/* Valor estimado */}
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-600 mb-1.5 uppercase tracking-wider">Valor Estimado</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={formDeal.monto}
                                                    onChange={(e) => setFormDeal(f => ({ ...f, monto: e.target.value }))}
                                                    placeholder="0"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-8 pr-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-(--theme-400) focus:bg-white transition-all"
                                                />
                                            </div>
                                        </div>

                                        {/* Notas */}
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-600 mb-1.5 uppercase tracking-wider">Notas (Opcional)</label>
                                            <textarea
                                                rows={2}
                                                value={formDeal.notas}
                                                onChange={(e) => setFormDeal(f => ({ ...f, notas: e.target.value }))}
                                                placeholder="Contexto inicial de la oportunidad..."
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-(--theme-400) focus:bg-white transition-all resize-none"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            {stepCrear === 2 && (
                                <div className="px-6 pb-6 flex gap-3">
                                    <button onClick={() => setStepCrear(1)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">
                                        ← Atrás
                                    </button>
                                    <button
                                        onClick={handleCrearOportunidad}
                                        disabled={creandoOportunidad || !formDeal.titulo.trim()}
                                        className="flex-2 px-6 py-2.5 bg-(--theme-600) text-white rounded-xl text-sm font-bold hover:bg-(--theme-700) disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-(--theme-500)/20 flex items-center gap-2 justify-center"
                                    >
                                        {creandoOportunidad ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creando...</> : 'Crear Oportunidad'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Editar Oportunidad (solo título y monto) */}
            <AnimatePresence>
                {modalEditarAbierto && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setModalEditarAbierto(false); }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 10 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
                        >
                            <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-(--theme-50) rounded-xl flex items-center justify-center">
                                        <Edit2 className="w-4 h-4 text-(--theme-600)" />
                                    </div>
                                    <h2 className="text-base font-black text-slate-900">Editar Oportunidad</h2>
                                </div>
                                <button onClick={() => setModalEditarAbierto(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-600 mb-1.5 uppercase tracking-wider">Nombre *</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={oportunidadAEditar.titulo || ''}
                                        onChange={(e) => setOportunidadAEditar(f => ({ ...f, titulo: e.target.value }))}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-(--theme-400) focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-600 mb-1.5 uppercase tracking-wider">Valor Estimado</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={oportunidadAEditar.monto || ''}
                                            onChange={(e) => setOportunidadAEditar(f => ({ ...f, monto: e.target.value }))}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-8 pr-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-(--theme-400) focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 pb-6 flex gap-3">
                                <button onClick={() => setModalEditarAbierto(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">Cancelar</button>
                                <button
                                    onClick={handleEditarOportunidad}
                                    disabled={loadingEditar}
                                    className="flex-2 px-6 py-2.5 bg-(--theme-600) text-white rounded-xl text-sm font-bold hover:bg-(--theme-700) disabled:opacity-50 transition-all"
                                >
                                    {loadingEditar ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal confirmación Ganada */}
            <AnimatePresence>
                {oportunidadGanadaPendiente && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <DollarSign className="w-7 h-7 text-emerald-600" />
                                </div>
                                <h2 className="text-lg font-black text-slate-900 text-center mb-1">Marcar como Ganada</h2>
                                <p className="text-sm text-slate-500 text-center mb-5">
                                    ¿Confirmas que la oportunidad <strong className="text-slate-700">"{oportunidadGanadaPendiente?.titulo}"</strong> fue ganada?
                                </p>

                                {/* Si es prospecto, ofrecer conversión */}
                                {esProspectoCheck(oportunidadGanadaPendiente) && (
                                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5">
                                        <p className="text-xs font-bold text-amber-700 mb-1">Este negocio pertenece a un Prospecto</p>
                                        <p className="text-xs text-amber-600">¿Quieres convertirlo a Cliente al confirmar?</p>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => confirmarGanada(false)}
                                                disabled={procesandoCierre}
                                                className="flex-1 py-2 text-xs font-bold bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-all disabled:opacity-50"
                                            >
                                                Mantener como Prospecto
                                            </button>
                                            <button
                                                onClick={() => confirmarGanada(true)}
                                                disabled={procesandoCierre}
                                                className="flex-1 py-2 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all disabled:opacity-50"
                                            >
                                                {procesandoCierre ? 'Procesando...' : 'Convertir a Cliente'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setOportunidadGanadaPendiente(null)}
                                        disabled={procesandoCierre}
                                        className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    {!esProspectoCheck(oportunidadGanadaPendiente) && (
                                        <button
                                            onClick={() => confirmarGanada(false)}
                                            disabled={procesandoCierre}
                                            className="flex-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 justify-center"
                                        >
                                            {procesandoCierre ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                                            {procesandoCierre ? 'Procesando...' : '🎉 Confirmar Ganada'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal confirmación eliminar */}
            <AnimatePresence>
                {oportunidadAEliminar && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full mx-4 border border-red-100"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-red-600" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Eliminar oportunidad</h2>
                            </div>
                            <p className="text-gray-600 mb-6">
                                ¿Eliminar <strong>{oportunidadAEliminar.titulo}</strong>? Esta acción no se puede deshacer.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setOportunidadAEliminar(null)} disabled={eliminando} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={handleEliminarOportunidad} disabled={eliminando} className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                                    {eliminando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Oportunidades;