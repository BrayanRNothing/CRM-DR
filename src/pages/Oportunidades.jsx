import React, { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RefreshCw, ChevronRight, ArrowLeft, User, History, Trash2, Download, Upload, Plus, X, Phone, MessageCircle, Calendar, Filter, Star, Mail, MessageSquare, Clock, Share2, Edit2, Bell, LayoutList, Kanban, UserPlus, Building2, Globe, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import KanbanOportunidades from '../components/KanbanOportunidades';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getToken } from '../utils/authUtils';
import { HistorialInteracciones } from '../components/HistorialInteracciones';
import TimeWheelPicker from '../components/TimeWheelPicker';
import OportunidadDetalle from '../components/OportunidadDetalle';
import SourcePicker from '../components/ui/SourcePicker';

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
    const [filtroVisibilidad, setFiltroVisibilidad] = useState('mine'); // mine | shared | all
    const [globalTags, setGlobalTags] = useState([]);
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const vistaKanban = true;
    const fileInputRef = useRef(null);
    const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
    const [creandoOportunidad, setCreandoOportunidad] = useState(false);
    const [mostrarAvanzado, setMostrarAvanzado] = useState(false);
    const [formOportunidad, setFormOportunidad] = useState({
        titulo: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        telefonos: [''],
        correo: '',
        empresa: '',
        sitioWeb: '',
        ubicacion: '',
        notas: '',
        fuente: ''
    });

    // Estados para la vista detallada
    const [prospectoSeleccionado, setProspectoSeleccionado] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const [guardandoSeguimiento, setGuardandoSeguimiento] = useState(false);
    const [llamadaFlow, setLlamadaFlow] = useState(null);

    // Estados para la edición de oportunidades
    const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
    const [oportunidadAEditar, setOportunidadAEditar] = useState({});
    const [loadingEditar, setLoadingEditar] = useState(false);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [lastViewedId, setLastViewedId] = useState(null);

    // Evitar scroll de fondo al abrir modales
    useEffect(() => {
        const algunModalAbierto = mostrarModalCrear || modalEditarAbierto || !!prospectoSeleccionado;
        const container = document.getElementById('main-scroll-container');
        if (container) {
            if (algunModalAbierto) {
                container.style.setProperty('overflow', 'hidden', 'important');
            } else {
                container.style.removeProperty('overflow');
            }
        }
        return () => {
            if (container) container.style.removeProperty('overflow');
        };
    }, [mostrarModalCrear, modalEditarAbierto, prospectoSeleccionado]);

    const getAuthHeaders = () => ({
        'x-auth-token': getToken() || ''
    });

    const getCurrentUserId = () => {
        try {
            const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (!raw) return null;
            const user = JSON.parse(raw);
            return user?.id ?? user?._id ?? null;
        } catch (error) {
            return null;
        }
    };

    const currentUserId = getCurrentUserId();

    const isOwnerRecord = (record) => {
        const ownerId = record?.propietarioId ?? record?.prospectorAsignado ?? record?.vendedorAsignado ?? null;
        if (ownerId == null || currentUserId == null) return false;
        return String(ownerId) === String(currentUserId);
    };

    const getRole = () => {
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                return user.rol?.toLowerCase() || 'prospector';
            } catch (e) {
                return 'prospector';
            }
        }
        return 'prospector';
    };

    const getRolePath = () => {
        const rol = getRole();
        // No existe /api/vendedor/*, reutilizamos rutas closer para vista de oportunidades e historial.
        if (rol === 'vendedor') return 'closer';
        return rol;
    };

    const cargarOportunidades = async () => {
        setLoading(true);
        try {
            const rol = 'vendedor';
            const [resOportunidades, resTareas] = await Promise.all([
                axios.get(`${API_URL}/api/oportunidades/todas`, {
                    headers: getAuthHeaders(),
                    params: { scope: filtroVisibilidad }
                }),
                axios.get(`${API_URL}/api/tareas`, { headers: getAuthHeaders() })
            ]);

            const remindersByOportunidad = buildReminderByOportunidadMap(resTareas.data || []);
            const data = (resOportunidades.data || []).map((raw) => {
                const oportunidad = normalizeOportunidadRecordatorio(raw);
                if (oportunidad.proximaLlamada) return oportunidad;

                const oportunidadId = String(oportunidad.id || oportunidad._id || '');
                const fechaTarea = remindersByOportunidad.get(oportunidadId) || null;
                return { ...oportunidad, proximaLlamada: fechaTarea };
            });

            setOportunidades(data);
            return data;
        } catch (error) {
            console.error('Error al cargar oportunidades:', error);
            setOportunidades([]);
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarOportunidades();
        
        const fetchGlobalTags = async () => {
            try {
                const token = getToken();
                if (!token) return;
                const res = await axios.get(`${API_URL}/api/vendedor/etiquetas`, {
                    headers: { 'x-auth-token': token }
                });
                setGlobalTags(res.data);
            } catch (error) {
                console.error('Error fetching global tags:', error);
            }
        };
        fetchGlobalTags();
        
        const interval = setInterval(cargarOportunidades, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [filtroVisibilidad]);

    const handleToggleCompartido = async (oportunidad, nuevoEstado) => {
        const id = oportunidad.id || oportunidad._id;
        const prev = oportunidades;
        setOportunidades((curr) => curr.map((c) => {
            const cid = c.id || c._id;
            return String(cid) === String(id) ? { ...c, compartido: nuevoEstado } : c;
        }));

        try {
            await axios.patch(
                `${API_URL}/api/vendedor/prospectos/${id}/compartir`,
                { compartido: nuevoEstado },
                { headers: getAuthHeaders() }
            );
            toast.success(nuevoEstado ? 'Oportunidad compartido con tu equipo' : 'Oportunidad marcado como privado');
        } catch (error) {
            setOportunidades(prev);
            const status = error?.response?.status;
            const backendMsg = String(error?.response?.data?.msg || error?.response?.data?.mensaje || '');

            if (status === 404) {
                toast.error('Tu backend en Railway aun no tiene esta ruta de compartir. Falta desplegar backend.');
                return;
            }

            if (status >= 500 && /compartido|propietarioid|column|does not exist/i.test(backendMsg)) {
                toast.error('Falta ejecutar la migracion en Railway (columnas compartido/propietarioId).');
                return;
            }

            toast.error(error.response?.data?.msg || 'No se pudo actualizar la visibilidad');
        }
    };

    const cargarTimelineOportunidad = async (oportunidad) => {
        setLoadingTimeline(true);
        try {
            const rol = 'vendedor';
            const res = await axios.get(
                `${API_URL}/api/${rol}/prospecto/${oportunidad.id || oportunidad._id}/historial-completo`,
                { headers: getAuthHeaders() }
            );
            setTimeline(res.data.timeline || []);
        } catch (error) {
            console.error('Error al cargar historial:', error);
            setTimeline([]);
        } finally {
            setLoadingTimeline(false);
        }
    };

    useLayoutEffect(() => {
        if (!prospectoSeleccionado && scrollPosition > 0) {
            const container = document.getElementById('main-scroll-container');
            if (container) container.scrollTo({ top: scrollPosition, behavior: 'instant' });
        }
    }, [prospectoSeleccionado, scrollPosition]);

    const handleVerDetalles = async (oportunidad) => {
        if (oportunidad) {
            const container = document.getElementById('main-scroll-container');
            if (container) setScrollPosition(container.scrollTop);
        } else if (prospectoSeleccionado) {
            const id = prospectoSeleccionado.id || prospectoSeleccionado._id;
            setLastViewedId(id);
            setTimeout(() => setLastViewedId(null), 1500);
        }
        setProspectoSeleccionado(oportunidad);
        setLlamadaFlow(null);
        if (!oportunidad) {
            setTimeline([]);
            setLoadingTimeline(false);
            return;
        }
        await cargarTimelineOportunidad(oportunidad);
    };

    const abrirModalEditar = (p) => {
        const tels = [p.telefono, p.telefono2].filter(Boolean);
        setOportunidadAEditar({
            id: p._id || p.id,
            titulo: p.titulo || '',
            apellidoPaterno: p.apellidoPaterno || '',
            apellidoMaterno: p.apellidoMaterno || '',
            telefonos: tels.length > 0 ? tels : [''],
            correo: p.correo || '',
            empresa: p.empresa || '',
            sitioWeb: p.sitioWeb || '',
            ubicacion: p.ubicacion || '',
            notas: p.notas || '',
            etapaEmbudo: p.etapaEmbudo || 'venta_ganada',
            interes: p.interes || 5
        });
        setModalEditarAbierto(true);
    };

    const handleEditarOportunidad = async () => {
        setLoadingEditar(true);
        try {
            const rolePath = 'vendedor'; // O corregir según rol real
            const id = oportunidadAEditar.id;
            const telefonosLimpios = (oportunidadAEditar.telefonos || []).filter(t => t.trim());
            const payload = {
                ...oportunidadAEditar,
                telefono: telefonosLimpios[0] || '',
                telefono2: telefonosLimpios.slice(1).join(', ') || ''
            };
            delete payload.telefonos;

            await axios.put(`${API_URL}/api/oportunidades/${id}`, payload, {
                headers: getAuthHeaders()
            });

            toast.success('Oportunidad actualizado');
            setModalEditarAbierto(false);

            // Recargar datos
            const lista = await cargarOportunidades();
            if (prospectoSeleccionado && (prospectoSeleccionado.id === id || prospectoSeleccionado._id === id)) {
                const updated = lista.find(c => (c.id || c._id) === id);
                if (updated) setProspectoSeleccionado(updated);
            }
        } catch (error) {
            console.error('Error al editar:', error);
            toast.error(error.response?.data?.msg || 'Error al actualizar oportunidad');
        } finally {
            setLoadingEditar(false);
        }
    };

    const renderModales = () => (
        <>
            {/* Modal Editar Oportunidad - Rediseño Moderno */}
            {modalEditarAbierto && (
                <div className="fixed inset-0 bg-slate-900/20 flex items-center justify-center z-50 p-4 transition-all duration-300 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[82vh] overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* Header */}
                        <div className="px-6 py-4 bg-linear-to-r from-(--theme-50) to-white border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-(--theme-100) rounded-xl flex items-center justify-center">
                                    <Edit2 className="w-5 h-5 text-(--theme-600)" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Editar Oportunidad</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Actualiza la información de contacto</p>
                                </div>
                            </div>
                            <button onClick={() => setModalEditarAbierto(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 overflow-y-auto hide-scrollbar">
                            {/* Sección: Datos Personales */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1 h-4 bg-(--theme-500) rounded-full"></div>
                                    Información Personal
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Nombres *</label>
                                        <input
                                            type="text"
                                            value={oportunidadAEditar.titulo}
                                            onChange={(e) => setOportunidadAEditar((f) => ({ ...f, titulo: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Apellido Paterno</label>
                                            <input
                                                type="text"
                                                value={oportunidadAEditar.apellidoPaterno}
                                                onChange={(e) => setOportunidadAEditar((f) => ({ ...f, apellidoPaterno: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Apellido Materno</label>
                                            <input
                                                type="text"
                                                value={oportunidadAEditar.apellidoMaterno}
                                                onChange={(e) => setOportunidadAEditar((f) => ({ ...f, apellidoMaterno: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sección: Contacto */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1 h-4 bg-(--theme-500) rounded-full"></div>
                                    Contacto
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Teléfonos *</label>
                                            <button
                                                type="button"
                                                onClick={() => setOportunidadAEditar((f) => ({ ...f, telefonos: [...(f.telefonos || ['']), ''] }))}
                                                className="flex items-center gap-1.5 text-xs text-(--theme-600) hover:text-(--theme-700) font-bold hover:bg-(--theme-50) px-2.5 py-1.5 rounded-lg transition-all"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Agregar
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {(oportunidadAEditar.telefonos || ['']).map((tel, idx) => (
                                                <div key={idx} className="flex gap-3 items-center bg-linear-to-r from-slate-50 to-white p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-all group">
                                                    <Phone className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
                                                    <input
                                                        type="tel"
                                                        value={tel}
                                                        onChange={(e) => setOportunidadAEditar((f) => { const t = [...(f.telefonos || [''])]; t[idx] = e.target.value; return { ...f, telefonos: t }; })}
                                                        className="flex-1 bg-transparent border-0 focus:ring-0 text-sm py-1 outline-none font-medium"
                                                        placeholder="Ej: +56 9 1234 5678"
                                                    />
                                                    {(oportunidadAEditar.telefonos || ['']).length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setOportunidadAEditar((f) => ({ ...f, telefonos: (f.telefonos || ['']).filter((_, i) => i !== idx) }))}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Correo Electrónico</label>
                                        <input
                                            type="email"
                                            value={oportunidadAEditar.correo}
                                            onChange={(e) => setOportunidadAEditar((f) => ({ ...f, correo: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300 font-medium"
                                            placeholder="ejemplo@empresa.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sección: Empresa */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1 h-4 bg-(--theme-500) rounded-full"></div>
                                    Detalles de Empresa
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Empresa</label>
                                        <input
                                            type="text"
                                            value={oportunidadAEditar.empresa}
                                            onChange={(e) => setOportunidadAEditar((f) => ({ ...f, empresa: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300 font-medium"
                                            placeholder="Nombre de la empresa"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Sitio Web</label>
                                        <input
                                            type="url"
                                            value={oportunidadAEditar.sitioWeb || ''}
                                            onChange={(e) => setOportunidadAEditar((f) => ({ ...f, sitioWeb: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300 font-medium"
                                            placeholder="https://ejemplo.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Ubicación</label>
                                    <input
                                        type="text"
                                        value={oportunidadAEditar.ubicacion || ''}
                                        onChange={(e) => setOportunidadAEditar((f) => ({ ...f, ubicacion: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300 font-medium"
                                        placeholder="Ciudad, Estado"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 p-6 border-t border-slate-100 bg-slate-50 justify-end">
                            <button
                                onClick={() => setModalEditarAbierto(false)}
                                className="px-6 py-3 border border-slate-300 text-gray-700 rounded-xl text-sm hover:bg-white font-bold transition-all hover:shadow-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEditarOportunidad}
                                disabled={loadingEditar}
                                className="px-8 py-3 bg-linear-to-r from-(--theme-600) to-(--theme-700) text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:brightness-110 transition-all"
                            >
                                {loadingEditar ? '⏳ Guardando...' : '✓ Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear Oportunidad - Diseño Compacto y Elegante */}
            {mostrarModalCrear && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-300">
                        
                        {/* Header Compacto */}
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Nuevo Oportunidad</h2>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Registra la información básica</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setMostrarModalCrear(false);
                                    setMostrarAvanzado(false);
                                    setFormOportunidad({ titulo: '', apellidoPaterno: '', apellidoMaterno: '', telefonos: [''], correo: '', empresa: '', sitioWeb: '', ubicacion: '', notas: '', fuente: '' });
                                }} 
                                className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Contenido del Formulario */}
                        <div className="p-6 overflow-y-auto scrollbar-hide">
                            <div className="space-y-5">
                                {/* Información Básica */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-700 mb-1.5 uppercase tracking-wider">Nombre del Oportunidad *</label>
                                        <div className="relative group">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-(--theme-500) transition-colors" />
                                            <input
                                                type="text"
                                                value={formOportunidad.titulo}
                                                onChange={(e) => setFormOportunidad((f) => ({ ...f, titulo: e.target.value }))}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-4 focus:ring-(--theme-500)/10 focus:border-(--theme-500) focus:bg-white transition-all outline-none font-semibold text-gray-900"
                                                placeholder="Ej: Juan Pérez"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-700 mb-1.5 uppercase tracking-wider">Teléfono</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-(--theme-500) transition-colors" />
                                                <input
                                                    type="tel"
                                                    value={formOportunidad.telefonos[0] || ''}
                                                    onChange={(e) => setFormOportunidad((f) => { const t = [...f.telefonos]; t[0] = e.target.value; return { ...f, telefonos: t }; })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-4 focus:ring-(--theme-500)/10 focus:border-(--theme-500) focus:bg-white transition-all outline-none font-medium text-gray-900"
                                                    placeholder="55 1234 5678"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-700 mb-1.5 uppercase tracking-wider">Correo</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-(--theme-500) transition-colors" />
                                                <input
                                                    type="email"
                                                    value={formOportunidad.correo}
                                                    onChange={(e) => setFormOportunidad((f) => ({ ...f, correo: e.target.value }))}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-4 focus:ring-(--theme-500)/10 focus:border-(--theme-500) focus:bg-white transition-all outline-none font-medium text-gray-900"
                                                    placeholder="juan@ejemplo.com"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Separador y Botón Toggle Avanzado */}
                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                        <div className="w-full border-t border-slate-200"></div>
                                    </div>
                                    <div className="relative flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => setMostrarAvanzado(!mostrarAvanzado)}
                                            className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-(--theme-600) transition-colors bg-white px-3"
                                        >
                                            {mostrarAvanzado ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            {mostrarAvanzado ? 'Ocultar extras' : 'Mostrar extras'}
                                        </button>
                                    </div>
                                </div>

                                {/* Opciones Avanzadas */}
                                <AnimatePresence>
                                    {mostrarAvanzado && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="space-y-4 pb-2">
                                                
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Apellido Paterno</label>
                                                        <input
                                                            type="text"
                                                            value={formOportunidad.apellidoPaterno}
                                                            onChange={(e) => setFormOportunidad((f) => ({ ...f, apellidoPaterno: e.target.value }))}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500) transition-all outline-none"
                                                            placeholder="Opcional"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Apellido Materno</label>
                                                        <input
                                                            type="text"
                                                            value={formOportunidad.apellidoMaterno}
                                                            onChange={(e) => setFormOportunidad((f) => ({ ...f, apellidoMaterno: e.target.value }))}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500) transition-all outline-none"
                                                            placeholder="Opcional"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Empresa</label>
                                                        <div className="relative group">
                                                            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-(--theme-500) transition-colors" />
                                                            <input
                                                                type="text"
                                                                value={formOportunidad.empresa}
                                                                onChange={(e) => setFormOportunidad((f) => ({ ...f, empresa: e.target.value }))}
                                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500) transition-all outline-none"
                                                                placeholder="Empresa S.A."
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Notas iniciales</label>
                                                    <textarea
                                                        rows={2}
                                                        value={formOportunidad.notas}
                                                        onChange={(e) => setFormOportunidad((f) => ({ ...f, notas: e.target.value }))}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500) transition-all outline-none resize-none"
                                                        placeholder="Agrega algún detalle rápido..."
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Origen</label>
                                                    <SourcePicker 
                                                        selectedSource={formOportunidad.fuente} 
                                                        onChange={(val) => setFormOportunidad(f => ({ ...f, fuente: val }))} 
                                                    />
                                                </div>

                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Footer Compacto */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => {
                                    setMostrarModalCrear(false);
                                    setMostrarAvanzado(false);
                                    setFormOportunidad({ titulo: '', apellidoPaterno: '', apellidoMaterno: '', telefonos: [''], correo: '', empresa: '', sitioWeb: '', ubicacion: '', notas: '', fuente: '' });
                                }}
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-100 hover:text-slate-800 transition-all shadow-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCrearOportunidad}
                                disabled={creandoOportunidad}
                                className="flex-2 px-4 py-2.5 bg-linear-to-r from-(--theme-600) to-(--theme-500) text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-(--theme-500)/30 flex items-center justify-center gap-2"
                            >
                                {creandoOportunidad ? 'Creando...' : 'Crear Oportunidad'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal confirmación eliminar */}
            {oportunidadAEliminar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full mx-4 border border-red-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Eliminar oportunidad</h2>
                        </div>
                        <p className="text-gray-600 mb-6">
                            ¿Estás seguro de eliminar a <strong>{oportunidadAEliminar.titulo} {oportunidadAEliminar.apellidoPaterno}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setOportunidadAEliminar(null)}
                                disabled={eliminando}
                                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEliminarOportunidad}
                                disabled={eliminando}
                                className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {eliminando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    const registrarActividadOportunidad = async (payload) => {
        if (!prospectoSeleccionado) return;

        const rol = 'vendedor';
        const oportunidadId = prospectoSeleccionado.id || prospectoSeleccionado._id;

        if (payload.tipo === 'llamada' && prospectoSeleccionado.proximaLlamada) {
            await axios.put(
                `${API_URL}/api/${rol}/prospectos/${oportunidadId}`,
                { proximaLlamada: null },
                { headers: getAuthHeaders() }
            );
        }

        await axios.post(
            `${API_URL}/api/${rol}/registrar-actividad`,
            { oportunidadId, ...payload },
            { headers: getAuthHeaders() }
        );

        await cargarTimelineOportunidad(prospectoSeleccionado);
        const lista = await cargarOportunidades();
        const actualizado = lista.find((c) => String(c.id || c._id) === String(oportunidadId));
        if (actualizado) setProspectoSeleccionado(actualizado);
    };

    const handleDeleteActividad = async (actividadId) => {
        try {
            await axios.delete(
                `${API_URL}/api/actividades/${actividadId}`,
                { headers: getAuthHeaders() }
            );
            setTimeline(prev => prev.filter(item => item.id !== actividadId));
        } catch (error) {
            console.error('Error al eliminar actividad:', error);
            alert('No se pudo eliminar la actividad.');
        }
    };

    const handleEliminarOportunidad = async () => {
        if (!oportunidadAEliminar) return;
        setEliminando(true);
        try {
            await axios.delete(
                `${API_URL}/api/oportunidades/${oportunidadAEliminar.id || oportunidadAEliminar._id}`,
                { headers: getAuthHeaders() }
            );
            setOportunidades(prev => prev.filter(c => (c.id || c._id) !== (oportunidadAEliminar.id || oportunidadAEliminar._id)));
            setOportunidadAEliminar(null);
        } catch (error) {
            console.error('Error al eliminar oportunidad:', error);
            alert(error.response?.data?.mensaje || 'No se pudo eliminar el oportunidad.');
        } finally {
            setEliminando(false);
        }
    };

    const escapeCsv = (value) => {
        const safe = String(value ?? '').replace(/"/g, '""');
        return `"${safe}"`;
    };

    const parseCsvLine = (line) => {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i += 1) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i += 1;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);

        return values.map((item) => item.trim());
    };

    const exportarOportunidadesCsv = () => {
        if (!oportunidadesFiltrados.length) {
            alert('No hay oportunidades para exportar.');
            return;
        }

        const headers = [
            'titulo',
            'apellidoPaterno',
            'apellidoMaterno',
            'telefono',
            'correo',
            'empresa',
            'estado',
            'etapaEmbudo',
            'fechaUltimaEtapa'
        ];

        const rows = oportunidadesFiltrados.map((oportunidad) => ([
            oportunidad.titulo,
            oportunidad.apellidoPaterno,
            oportunidad.apellidoMaterno,
            oportunidad.telefono,
            oportunidad.correo,
            oportunidad.empresa,
            oportunidad.estado,
            oportunidad.etapaEmbudo,
            oportunidad.fechaUltimaEtapa
        ].map(escapeCsv).join(',')));

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStamp = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.setAttribute('download', `oportunidades_${dateStamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportarOportunidades = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;

        setImportando(true);
        try {
            const text = await file.text();
            const lines = text
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean);

            if (lines.length < 2) {
                alert('El archivo CSV no tiene filas de datos.');
                return;
            }

            const headers = parseCsvLine(lines[0]);
            const requiredHeaders = ['titulo', 'apellidoPaterno', 'telefono', 'correo'];
            const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
            if (missingHeaders.length) {
                alert(`Faltan columnas requeridas: ${missingHeaders.join(', ')}`);
                return;
            }

            const toPayload = (rowLine) => {
                const values = parseCsvLine(rowLine);
                const row = headers.reduce((acc, key, index) => {
                    acc[key] = values[index] ?? '';
                    return acc;
                }, {});

                return {
                    titulo: row.titulo,
                    apellidoPaterno: row.apellidoPaterno,
                    apellidoMaterno: row.apellidoMaterno || '',
                    telefono: row.telefono,
                    correo: row.correo,
                    empresa: row.empresa || '',
                    estado: row.estado || 'proceso',
                    etapaEmbudo: row.etapaEmbudo || 'prospecto_nuevo'
                };
            };

            const payloads = lines.slice(1).map(toPayload).filter((row) => (
                row.titulo && row.apellidoPaterno && row.telefono && row.correo
            ));

            if (!payloads.length) {
                alert('No se encontraron filas validas para importar.');
                return;
            }

            const results = await Promise.allSettled(
                payloads.map((payload) => axios.post(`${API_URL}/api/oportunidades`, payload, { headers: getAuthHeaders() }))
            );

            const creados = results.filter((r) => r.status === 'fulfilled').length;
            const fallidos = results.length - creados;

            await cargarOportunidades();
            alert(`Importacion finalizada. Creados: ${creados}. Fallidos: ${fallidos}.`);
        } catch (error) {
            console.error('Error al importar oportunidades:', error);
            alert(error.response?.data?.mensaje || 'No se pudo importar el archivo CSV.');
        } finally {
            setImportando(false);
        }
    };

    const handleCrearOportunidad = async () => {
        const telefonosLimpios = formOportunidad.telefonos.filter(t => t.trim());
        const telPrincipal = telefonosLimpios[0] || '';

        if (!formOportunidad.titulo) {
            toast.error('El nombre es obligatorio.');
            return;
        }

        setCreandoOportunidad(true);
        try {
            const payload = {
                titulo: formOportunidad.titulo,
                apellidoPaterno: formOportunidad.apellidoPaterno,
                apellidoMaterno: formOportunidad.apellidoMaterno,
                telefono: telPrincipal,
                telefono2: telefonosLimpios.slice(1).join(', ') || '',
                correo: formOportunidad.correo,
                empresa: formOportunidad.empresa,
                sitioWeb: formOportunidad.sitioWeb,
                ubicacion: formOportunidad.ubicacion,
                notas: formOportunidad.notas,
                estado: 'ganado',
                etapaEmbudo: 'venta_ganada',
                fuente: formOportunidad.fuente,
                origen: formOportunidad.fuente
            };

            await axios.post(
                `${API_URL}/api/oportunidades`,
                payload,
                { headers: getAuthHeaders() }
            );
            await cargarOportunidades();
            setMostrarModalCrear(false);
            setFormOportunidad({
                titulo: '',
                apellidoPaterno: '',
                apellidoMaterno: '',
                telefonos: [''],
                correo: '',
                empresa: '',
                sitioWeb: '',
                ubicacion: '',
                notas: '',
                fuente: ''
            });
            toast.success('Oportunidad creado exitosamente.');
        } catch (error) {
            console.error('Error al crear oportunidad:', error);
            toast.error(error.response?.data?.mensaje || 'No se pudo crear el oportunidad.');
        } finally {
            setCreandoOportunidad(false);
        }
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

    // VISTA DETALLADA PREMIUM (Post-Venta)
    if (prospectoSeleccionado) {
        return (
            <>
                <OportunidadDetalle
                    Oportunidad={prospectoSeleccionado}
                    rolePath={'vendedor'}
                    onVolver={() => handleVerDetalles(null)}
                    onActualizado={async () => {
                        const lista = await cargarOportunidades();
                        const actualizado = lista.find(c => String(c.id || c._id) === String(prospectoSeleccionado.id || prospectoSeleccionado._id));
                        if (actualizado) setProspectoSeleccionado(actualizado);
                    }}
                    abrirModalEditar={abrirModalEditar}
                />
                {renderModales()}
            </>
        );
    }

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
                                onClick={() => (() => {
        setFormOportunidad(prev => ({...prev, titulo: prev.titulo || ('OP-' + Math.floor(1000 + Math.random() * 9000)), nombres: prev.nombres || ('OP-' + Math.floor(1000 + Math.random() * 9000))}));
        setMostrarModalCrear(true);
    })()}
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
                            onEtapaChange={async (oportunidadId, nuevaEtapa) => {
                                // Optimistic Update para eliminar el delay visual
                                const oldOportunidades = [...oportunidades];
                                setOportunidades(prev => prev.map(c =>
                                    String(c.id || c._id) === String(oportunidadId)
                                        ? { ...c, etapa: nuevaEtapa }
                                        : c
                                ));
                                try {
                                    await axios.put(`${API_URL}/api/oportunidades/${oportunidadId}`,
                                        { etapa: nuevaEtapa },
                                        { headers: getAuthHeaders() }
                                    );
                                } catch (err) {
                                    setOportunidades(oldOportunidades); // Rollback
                                    toast.error('Error al cambiar etapa');
                                }
                            }}
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
                                                            const gTag = globalTags.find(t => t.nombre === tag);
                                                            const color = gTag ? gTag.color : '#94a3b8';
                                                            return (
                                                                <span 
                                                                    key={i} 
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm truncate max-w-[100px]"
                                                                    style={{ 
                                                                        backgroundColor: `${color}15`, 
                                                                        color: color, 
                                                                        border: `1px solid ${color}40` 
                                                                    }}
                                                                    title={tag}
                                                                >
                                                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                                                                    <span className="truncate leading-none pt-px">{tag}</span>
                                                                </span>
                                                            );
                                                        })}
                                                        {remainingCount > 0 && (
                                                            <span 
                                                                className="inline-flex items-center justify-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm cursor-help bg-slate-50 text-slate-500 border border-slate-200"
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
                                                        <Share2 className="w-4 h-4" />
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
            {renderModales()}
        </>
    );
};

export default Oportunidades;
