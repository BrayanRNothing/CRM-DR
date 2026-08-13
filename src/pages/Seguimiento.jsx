import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ESTADOS_ENTIDAD, getEstadoLabel, getEstadoColor, calcularEstado, ORDEN_ESTADO } from '../utils/estadosEntidad';
import {
    Phone,
    MessageSquare,
    Mail,
    Calendar,
    Search,
    RefreshCw,
    Plus,
    UserPlus,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Star,
    ArrowLeft,
    Edit2,
    Filter,
    Bell,
    Send,
    Share2,
    Download,
    Upload,
    Video,
    X,
    Building2,
    MapPin,
    Globe,
    Trash2,
    AlertCircle,
    FileText,
    ChevronDown,
    ChevronUp,
    LayoutList,
    Kanban
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getToken } from '../utils/authUtils';
import HistorialInteracciones from '../components/HistorialInteracciones';
import ProspectoDetalle from '../components/ProspectoDetalle';
import KanbanProspectos from '../components/KanbanProspectos';
import TimeWheelPicker from '../components/TimeWheelPicker';
import useApiCache from '../hooks/useApiCache';

import API_URL from '../config/api';
import socket from '../config/socket';
import SourcePicker from '../components/ui/SourcePicker';
import { clearCacheKey } from '../hooks/useApiCache';

// --- CSV helpers ---
const CSV_HEADERS = ['nombres', 'apellidoPaterno', 'apellidoMaterno', 'telefono', 'correo', 'empresa', 'sitioWeb', 'ubicacion', 'notas', 'fuente'];
const CSV_LABELS = ['Nombres', 'Apellido Paterno', 'Apellido Materno', 'Telefono', 'Correo', 'Empresa', 'Sitio Web', 'Ubicacion', 'Notas', 'Fuente'];

function prospectosToCsv(prospectos) {
    const escape = (val) => {
        if (val == null) return '';
        const s = String(val).replace(/"/g, '""');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };
    const rows = [CSV_LABELS.join(',')];
    for (const p of prospectos) rows.push(CSV_HEADERS.map(h => escape(p[h])).join(','));
    return rows.join('\n');
}

function parseCsvRow(row) {
    const cells = [];
    let cur = ''; let inQuote = false;
    for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '"') { if (inQuote && row[i + 1] === '"') { cur += '"'; i++; } else inQuote = !inQuote; }
        else if (ch === ',' && !inQuote) { cells.push(cur.trim()); cur = ''; }
        else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
}

function csvToProspectos(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { data: [], errors: ['El CSV está vacío o solo tiene encabezados.'] };
    const header = parseCsvRow(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, ''));
    const colMap = {
        nombres: ['nombres', 'nombre'], apellidoPaterno: ['apellidopaterno', 'apellido'],
        apellidoMaterno: ['apellidomaterno'], telefono: ['telefono', 'tel', 'phone'],
        correo: ['correo', 'email', 'mail'], empresa: ['empresa', 'company'],
        notas: ['notas', 'nota', 'notes', 'comentarios'],
    };
    const colIndex = {};
    for (const [field, aliases] of Object.entries(colMap)) {
        for (const alias of aliases) { const idx = header.indexOf(alias); if (idx !== -1) { colIndex[field] = idx; break; } }
    }
    const errors = []; const data = [];
    for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvRow(lines[i]);
        const row = {};
        for (const [field, idx] of Object.entries(colIndex)) row[field] = cells[idx] || '';
        data.push(row);
    }
    return { data, errors };
}

const TIPOS_ACTIVIDAD = [
    { value: 'llamada', label: 'Llamada', icon: Phone, color: 'bg-(--theme-500)' },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-green-500' },
    { value: 'correo', label: 'Correo', icon: Mail, color: 'bg-purple-500' },
    { value: 'cita', label: 'Cita agendada', icon: Calendar, color: 'bg-(--theme-500)' }
];

const RESULTADOS = [
    { value: 'exitoso', label: 'Exitoso', icon: CheckCircle2 },
    { value: 'pendiente', label: 'Pendiente', icon: Clock },
    { value: 'fallido', label: 'No contestó', icon: XCircle }
];



const normalizeProspectoRecordatorio = (p) => ({
    ...p,
    proximaLlamada: p?.proximaLlamada || p?.proximallamada || p?.proximoRecordatorio || p?.proximorecordatorio || null
});

const buildReminderByClienteMap = (tareas = []) => {
    const map = new Map();
    for (const t of tareas) {
        if (t?.estado !== 'pendiente') continue;
        if (t?.titulo !== 'Recordatorio de llamada') continue;
        if (!t?.cliente || !t?.fechaLimite) continue;

        const clienteId = String(t.cliente);
        const actual = map.get(clienteId);
        if (!actual || new Date(t.fechaLimite) < new Date(actual)) {
            map.set(clienteId, t.fechaLimite);
        }
    }
    return map;
};

const Seguimiento = () => {
    
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const rolePath = 'vendedor';
    const [prospectos, setProspectos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [backgroundLoading, setBackgroundLoading] = useState(false);
    // Filtros
    const [busquedaProspecto, setBusquedaProspecto] = useState('');
    const [filtroVisibilidad, setFiltroVisibilidad] = useState('mine'); // mine | shared | all
    const [ordenFiltro, setOrdenFiltro] = useState('todos'); // 'todos', 'en_proceso', 'mayor_valor'
    const [globalTags, setGlobalTags] = useState([]);
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const vistaKanban = false;

    const { data: oportunidadesList } = useApiCache(
        'dashboard-oportunidades',
        async () => {
            const res = await axios.get(`${API_URL}/api/oportunidades/todas`, { headers: getAuthHeaders() });
            return Array.isArray(res.data) ? res.data : [];
        },
        { ttl: 60, staleWhileRevalidate: true }
    );

    const getOportunidadesActivas = useCallback((entidadId) => {
        if (!oportunidadesList) return 0;
        return oportunidadesList.filter(o => 
            String(o.cliente_id) === String(entidadId) && 
            (o.etapa || '').toLowerCase() !== 'ganada' && 
            (o.etapa || '').toLowerCase() !== 'perdida'
        ).length;
    }, [oportunidadesList]);


    const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
    const [loadingCrear, setLoadingCrear] = useState(false);
    const [mostrarAvanzado, setMostrarAvanzado] = useState(false);
    const [formCrear, setFormCrear] = useState({
        nombres: '',
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

    // Estado para la edición de prospectos
    const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
    const [prospectoAEditar, setProspectoAEditar] = useState({});
    const [loadingEditar, setLoadingEditar] = useState(false);

    // Estados para modales de conversión y descarte
    const [modalPasarClienteAbierto, setModalPasarClienteAbierto] = useState(false);
    const [modalDescartarAbierto, setModalDescartarAbierto] = useState(false);
    const [notaConversion, setNotaConversion] = useState('');
    const [notaDescarte, setNotaDescarte] = useState('');
    const [motivoPerdida, setMotivoPerdida] = useState('');
    const [loadingConversion, setLoadingConversion] = useState(false);

    // Estados para CSV y eliminar
    const [prospectoAEliminar, setProspectoAEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);
    const [isImportModalAbierto, setIsImportModalAbierto] = useState(false);
    const [csvFile, setCsvFile] = useState(null);
    const [csvPreview, setCsvPreview] = useState(null);
    const [importando, setImportando] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = useRef(null);

    // Evitar scroll de fondo al abrir modales
    useEffect(() => {
        const algunModalAbierto = modalCrearAbierto || modalEditarAbierto || modalPasarClienteAbierto || modalDescartarAbierto || isImportModalAbierto || prospectoAEliminar;
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
    }, [modalCrearAbierto, modalEditarAbierto, modalPasarClienteAbierto, modalDescartarAbierto, isImportModalAbierto, prospectoAEliminar]);

    // Estado para el acordeón de acciones de cierre
        // Estado para editar etapa inline en la vista detallada
        

    const abrirModalEditar = (p) => {
        const tels = [p.telefono, p.telefono2].filter(Boolean);
        setProspectoAEditar({
            id: p._id || p.id,
            nombres: p.nombres || '',
            apellidoPaterno: p.apellidoPaterno || '',
            apellidoMaterno: p.apellidoMaterno || '',
            telefonos: tels.length > 0 ? tels : [''],
            correo: p.correo || '',
            empresa: p.empresa || '',
            sitioWeb: p.sitioWeb || '',
            ubicacion: p.ubicacion || '',
            notas: p.notas || '',
            fuente: p.fuente || p.origen || '',
            etapaEmbudo: p.etapaEmbudo || 'prospecto_nuevo',
            proximaLlamada: p.proximaLlamada ? p.proximaLlamada.slice(0, 16) : '',
            interes: p.interes || 0
        });
        setModalEditarAbierto(true);
    };

    const handleEditarProspecto = async () => {
        setLoadingEditar(true);
        try {
            const telefonosLimpios = (prospectoAEditar.telefonos || []).filter(t => t.trim());
            const payload = { ...prospectoAEditar, telefono: telefonosLimpios[0] || '', telefono2: telefonosLimpios.slice(1).join(', ') || '', interes: prospectoAEditar.interes || 0, fuente: prospectoAEditar.fuente || '' };
            delete payload.telefonos;
            await axios.put(`${API_URL}/api/${rolePath}/prospectos/${prospectoAEditar.id}/editar`, payload, {
                headers: getAuthHeaders()
            });
            toast.success('Prospecto actualizado');
            setModalEditarAbierto(false);
            // Recargar datos y actualizar el panel de detalle si está abierto
            invalidarCacheLocal();
            const normalizados = await cargarDatos(false);
            if (prospectoSeleccionado && normalizados) {
                const editadoId = String(prospectoAEditar.id);
                const updated = normalizados.find(p => String(p.id) === editadoId || String(p._id) === editadoId);
                if (updated) setProspectoSeleccionado(updated);
            }
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Error al actualizar');
        } finally {
            setLoadingEditar(false);
        }
    };

    // Estados para la nueva vista detallada
    const [prospectoSeleccionado, setProspectoSeleccionado] = useState(null);

    useEffect(() => {
        if (location.state?.openClienteId && prospectos.length > 0) {
            const cli = prospectos.find(c => (c.id === location.state.openClienteId || c._id === location.state.openClienteId));
            if (cli) {
                setProspectoSeleccionado(cli);
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, prospectos, navigate]);
    
    const [scrollPosition, setScrollPosition] = useState(0);
    const [lastViewedId, setLastViewedId] = useState(null);
        // Estado para el flujo de llamada inline
                    
    
    const getAuthHeaders = () => ({
        'x-auth-token': getToken() || ''
    });

    const getCurrentUserId = () => {
        try {
            const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (!raw) return null;
            const user = JSON.parse(raw);
            return user?.id ?? user?._id ?? null;
        } catch (_) {
            return null;
        }
    };

    const currentUserId = getCurrentUserId();

    const isOwnerRecord = (record) => {
        const ownerId = record?.propietarioId ?? record?.prospectorAsignado ?? record?.vendedorAsignado ?? null;
        if (ownerId == null || currentUserId == null) return false;
        return String(ownerId) === String(currentUserId);
    };

    const cargarDatos = async (isBackground = false) => {
        // En background: no blanquear la lista, solo actualizar silenciosamente
        if (isBackground) {
            setBackgroundLoading(true);
        } else {
            // Primera carga o refresh forzado: verificar caché local primero
            const cacheKey = `crm_cache:prospectos:${filtroVisibilidad}`;
            try {
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    const { data: cachedData, timestamp } = JSON.parse(cached);
                    const isFresh = (Date.now() - timestamp) < 30 * 1000; // 30s TTL
                    if (cachedData && cachedData.length > 0) {
                        // Mostrar datos cacheados inmediatamente
                        setProspectos(cachedData);
                        setLoading(false);
                        if (isFresh) return; // Datos frescos, no refrescar
                        // Datos vencidos: recargar en background
                        setBackgroundLoading(true);
                    } else {
                        setLoading(true);
                    }
                } else {
                    setLoading(true);
                }
            } catch {
                setLoading(true);
            }
        }

        try {
            const [resProspectos, resTareas] = await Promise.all([
                axios.get(`${API_URL}/api/${rolePath}/prospectos`, {
                    headers: getAuthHeaders(),
                    params: { scope: filtroVisibilidad }
                }),
                axios.get(`${API_URL}/api/tareas`, { headers: getAuthHeaders() })
            ]);

            const remindersByCliente = buildReminderByClienteMap(resTareas.data || []);
            const normalizados = (resProspectos.data || []).map((raw) => {
                const p = normalizeProspectoRecordatorio(raw);
                if (p.proximaLlamada) return p;

                const clienteId = String(p.id || p._id || '');
                const fechaTarea = remindersByCliente.get(clienteId) || null;
                return { ...p, proximaLlamada: fechaTarea };
            });

            setProspectos(normalizados);

            // Guardar en caché local
            try {
                const cacheKey = `crm_cache:prospectos:${filtroVisibilidad}`;
                sessionStorage.setItem(cacheKey, JSON.stringify({
                    data: normalizados,
                    timestamp: Date.now()
                }));
            } catch { /* ignorar si sessionStorage está lleno */ }

            return normalizados;
        } catch (error) {
            console.error('Error al cargar:', error);
            if (!isBackground) setProspectos([]);
            return null;
        } finally {
            setLoading(false);
            setBackgroundLoading(false);
        }
    };

    // Función para invalidar caché local de prospectos (llamar tras mutaciones)
    const invalidarCacheLocal = () => {
        clearCacheKey(`prospectos:${filtroVisibilidad}`);
        // También invalidar todas las variantes de scope
        ['mine', 'shared', 'all'].forEach(s => clearCacheKey(`prospectos:${s}`));
    };

    useEffect(() => {
        const init = async () => {
            const data = await cargarDatos(false);
            
            // Fetch global tags to colorize tags in the table
            try {
                const token = getToken();
                if (token) {
                    const res = await axios.get(`${API_URL}/api/vendedor/etiquetas`, {
                        headers: { 'x-auth-token': token }
                    });
                    setGlobalTags(res.data);
                }
            } catch (error) {
                console.error('Error fetching global tags:', error);
            }
            
            // 1. Prioridad: Parámetro 'p' en la URL (para recargas F5 o enlaces directos)
            const urlId = searchParams.get('p');
            // 2. Fallback: location.state.selectedId (para navegación interna desde otra página)
            const selectedId = urlId || location.state?.selectedId;

            if (selectedId && data) {
                const found = data.find(p => (p.id || p._id) == selectedId);
                if (found) {
                    handleSeleccionarProspecto(found);
                }
            }
        };
        init();
        const interval = setInterval(() => cargarDatos(true), 5 * 60 * 1000);

        const handleSocketUpdate = (obj) => {
            console.log('socket: prospectos actualizados detectado', obj);
            cargarDatos(true);
        };
        socket.on('prospectos_actualizados', handleSocketUpdate);

        return () => {
            clearInterval(interval);
            socket.off('prospectos_actualizados', handleSocketUpdate);
        };
    }, [searchParams, filtroVisibilidad]);

    const handleToggleCompartido = async (prospecto, nuevoEstado) => {
        const id = prospecto.id || prospecto._id;
        const prev = prospectos;
        setProspectos((curr) => curr.map((p) => {
            const pid = p.id || p._id;
            return String(pid) === String(id) ? { ...p, compartido: nuevoEstado } : p;
        }));

        try {
            await axios.patch(
                `${API_URL}/api/${rolePath}/prospectos/${id}/compartir`,
                { compartido: nuevoEstado },
                { headers: getAuthHeaders() }
            );
            toast.success(nuevoEstado ? 'Prospecto compartido con tu equipo' : 'Prospecto marcado como privado');
        } catch (error) {
            setProspectos(prev);
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

    // Escuchar cambios en location.state para navegación interna
    useEffect(() => {
        if (location.state?.selectedId && prospectos.length > 0) {
            const found = prospectos.find(p => (p.id || p._id) == location.state.selectedId);
            if (found) {
                handleSeleccionarProspecto(found);
            }
        }
    }, [location.state?.selectedId, prospectos]);

    useLayoutEffect(() => {
        if (!prospectoSeleccionado && scrollPosition > 0) {
            const container = document.getElementById('main-scroll-container');
            if (container) container.scrollTo({ top: scrollPosition, behavior: 'instant' });
        }
    }, [prospectoSeleccionado, scrollPosition]);


    // Filtro principal
    const prospectosFiltrados = useMemo(() => {
        let filtrados = prospectos;

        // Búsqueda...
        if (busquedaProspecto.trim()) {
            const termino = busquedaProspecto.toLowerCase();
            filtrados = filtrados.filter(p =>
                p.nombres?.toLowerCase().includes(termino) ||
                p.apellidoPaterno?.toLowerCase().includes(termino) ||
                p.empresa?.toLowerCase().includes(termino) ||
                p.correo?.toLowerCase().includes(termino) ||
                p.telefono?.includes(termino)
            );
        }

        return filtrados;
    }, [prospectos, busquedaProspecto, ordenFiltro]).sort((a, b) => {
        if (ordenFiltro === 'mayor_valor_estimado' || ordenFiltro === 'mayor_facturado') {
            const facturadoA = Number(a.customMetricValue) || Number(a.totalFacturado) || 0;
            const facturadoB = Number(b.customMetricValue) || Number(b.totalFacturado) || 0;
            if (facturadoA !== facturadoB) return facturadoB - facturadoA;
        } else if (ordenFiltro === 'reciente') {
            const dateA = new Date(a.createdAt || a.fechaCreacion || 0).getTime();
            const dateB = new Date(b.createdAt || b.fechaCreacion || 0).getTime();
            return dateB - dateA;
        } else if (ordenFiltro === 'mayor_valor') {
            const interesA = a.interes || 0;
            const interesB = b.interes || 0;
            if (interesA !== interesB) return interesB - interesA;
        }
        // Perdidos siempre al fondo
        const estadoA = calcularEstado(a, getOportunidadesActivas(a.id || a._id));
        const estadoB = calcularEstado(b, getOportunidadesActivas(b.id || b._id));
        const esPerdidoA = estadoA === 'perdido';
        const esPerdidoB = estadoB === 'perdido';
        if (esPerdidoA !== esPerdidoB) return esPerdidoA ? 1 : -1;

        // Con próxima llamada urgente primero (vencidas aún antes que futuras)
        const tieneRecordA = !!a.proximaLlamada;
        const tieneRecordB = !!b.proximaLlamada;
        if (tieneRecordA !== tieneRecordB) return tieneRecordA ? -1 : 1;
        if (tieneRecordA && tieneRecordB) {
            const ahora = Date.now();
            const vencidaA = new Date(a.proximaLlamada).getTime() < ahora;
            const vencidaB = new Date(b.proximaLlamada).getTime() < ahora;
            if (vencidaA !== vencidaB) return vencidaA ? -1 : 1; // vencidas primero
            return new Date(a.proximaLlamada) - new Date(b.proximaLlamada);
        }

        // Mayor interés primero
        const interesA = a.interes || 0;
        const interesB = b.interes || 0;
        if (interesB !== interesA) return interesB - interesA;

        // Etapa más avanzada primero
        const orA = ORDEN_ESTADO[estadoA] ?? 10;
        const orB = ORDEN_ESTADO[estadoB] ?? 10;
        return orA - orB;
    });

    const handleExportCsv = () => {
        if (prospectos.length === 0) { toast.error('No hay prospectos para exportar.'); return; }
        const csv = prospectosToCsv(prospectos);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `prospectos_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success(`${prospectos.length} prospectos exportados.`);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0]; if (!file) return;
        setCsvFile(file); setImportResult(null);
        const reader = new FileReader();
        reader.onload = (evt) => setCsvPreview(csvToProspectos(evt.target.result));
        reader.readAsText(file, 'UTF-8');
    };

    const handleImportCsv = async () => {
        if (!csvPreview || csvPreview.data.length === 0) { toast.error('No hay datos válidos para importar.'); return; }
        try {
            setImportando(true);
            const response = await axios.post(`${API_URL}/api/${rolePath}/importar-csv`, { prospectos: csvPreview.data }, { headers: getAuthHeaders() });
            setImportResult(response.data);
            cargarDatos();
            toast.success(`Importación completada: ${response.data.insertados} nuevos.`);
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Error al importar el CSV.');
        } finally { setImportando(false); }
    };

    const resetImportModal = () => {
        setCsvFile(null); setCsvPreview(null); setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsImportModalAbierto(false);
    };

    const handleEliminarProspecto = async () => {
        if (!prospectoAEliminar) return;
        try {
            setEliminando(true);
            await axios.delete(`${API_URL}/api/${rolePath}/prospectos/${prospectoAEliminar.id || prospectoAEliminar._id}`, { headers: getAuthHeaders() });
            toast.success('Prospecto eliminado correctamente');
            setProspectoAEliminar(null);
            invalidarCacheLocal();
            cargarDatos(false);
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Error al eliminar el prospecto');
        } finally { setEliminando(false); }
    };

    const handleCrearProspecto = async () => {
        const telefonosLimpios = formCrear.telefonos.filter(t => t.trim());
        const telPrincipal = telefonosLimpios[0] || '';

        if (!formCrear.nombres) {
            toast.error('El nombre es obligatorio.');
            return;
        }

        setLoadingCrear(true);
        try {
            const payload = { ...formCrear, telefono: telPrincipal, telefono2: telefonosLimpios.slice(1).join(', ') || '' };
            delete payload.telefonos;
            await axios.post(`${API_URL}/api/${rolePath}/crear-prospecto`, payload, {
                headers: getAuthHeaders()
            });
            toast.success('Prospecto creado');
            setModalCrearAbierto(false);
            setFormCrear({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefonos: [''], correo: '', empresa: '', sitioWeb: '', ubicacion: '', notas: '', fuente: '' });
            invalidarCacheLocal();
            cargarDatos(false);
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Error al crear');
        } finally {
            setLoadingCrear(false);
        }
    };

    const handleSeleccionarProspecto = (p) => {
        if (p) {
            const container = document.getElementById('main-scroll-container');
            if (container) setScrollPosition(container.scrollTop);
        } else if (prospectoSeleccionado) {
            const id = prospectoSeleccionado.id || prospectoSeleccionado._id;
            setLastViewedId(id);
            setTimeout(() => setLastViewedId(null), 1500);
        }

        setProspectoSeleccionado(p);
        if (p) {
            setSearchParams({ p: p.id || p._id });
            const container = document.getElementById('main-scroll-container');
            if (container) container.scrollTo({ top: 0, behavior: 'instant' });
        } else {
            setSearchParams({});
        }
    };

    
    
    const handlePasarACliente = async () => {
        if (!prospectoSeleccionado) return;
        const pid = prospectoSeleccionado.id || prospectoSeleccionado._id;
        setLoadingConversion(true);
        try {
            await axios.post(`${API_URL}/api/${rolePath}/pasar-a-cliente/${pid}`,
                { notas: notaConversion, fuente: prospectoSeleccionado.fuente || prospectoSeleccionado.origen || '' },
                { headers: getAuthHeaders() }
            );
            toast.success('¡Prospecto convertido a cliente exitosamente! 🎉');
            setModalPasarClienteAbierto(false);
            setNotaConversion('');
            setProspectoSeleccionado(null);
            invalidarCacheLocal();
            cargarDatos(false);
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error al convertir a cliente');
        } finally {
            setLoadingConversion(false);
        }
    };

    const handleDescartar = async () => {
        if (!prospectoSeleccionado) return;
        const pid = prospectoSeleccionado.id || prospectoSeleccionado._id;
        setLoadingConversion(true);
        try {
            await axios.post(`${API_URL}/api/${rolePath}/descartar-prospecto/${pid}`,
                { 
                    notas: notaDescarte || 'Prospecto descartado',
                    motivoPerdida: motivoPerdida || 'Otro'
                },
                { headers: getAuthHeaders() }
            );
            toast('Prospecto descartado', { icon: '🗑️' });
            setModalDescartarAbierto(false);
            setNotaDescarte('');
            setProspectoSeleccionado(null);
            invalidarCacheLocal();
            cargarDatos(false);
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error al descartar');
        } finally {
            setLoadingConversion(false);
        }
    };


    const handleKanbanColChange = async (prospectoId, nuevaCol) => {
        // Optimistic Update para evitar recarga de vista
        const oldProspectos = [...prospectos];
        setProspectos(prev => prev.map(p =>
            String(p.id || p._id) === String(prospectoId)
                ? { ...p, kanbanColProspecto: nuevaCol }
                : p
        ));

        try {
            await axios.put(`${API_URL}/api/${rolePath}/prospectos/${prospectoId}/editar`, { kanbanColProspecto: nuevaCol }, { headers: getAuthHeaders() });
            invalidarCacheLocal();
        } catch (error) {
            setProspectos(oldProspectos); // Rollback
            toast.error(error.response?.data?.msg || 'Error al actualizar la columna');
        }
    };

    // Shared Modals Render Function
    const renderModales = () => (
        <>
            {/* Modal Crear Prospecto - Diseño Compacto y Elegante */}
            {modalCrearAbierto && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-300">
                        
                        {/* Header Compacto */}
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Nuevo Prospecto</h2>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Registra la información básica</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setModalCrearAbierto(false);
                                    setMostrarAvanzado(false);
                                    setFormCrear({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefonos: [''], correo: '', empresa: '', sitioWeb: '', ubicacion: '', notas: '', fuente: '' });
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
                                        <label className="block text-[11px] font-black text-slate-700 mb-1.5 uppercase tracking-wider">Nombre del Prospecto *</label>
                                        <div className="relative group">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-(--theme-500) transition-colors" />
                                            <input
                                                type="text"
                                                value={formCrear.nombres}
                                                onChange={(e) => setFormCrear((f) => ({ ...f, nombres: e.target.value }))}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-4 focus:ring-(--theme-500)/10 focus:border-(--theme-500) focus:bg-white transition-all outline-none font-semibold text-gray-900"
                                                placeholder="Ej: Ana Martínez"
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
                                                    value={formCrear.telefonos[0] || ''}
                                                    onChange={(e) => setFormCrear((f) => { const t = [...f.telefonos]; t[0] = e.target.value; return { ...f, telefonos: t }; })}
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
                                                    value={formCrear.correo}
                                                    onChange={(e) => setFormCrear((f) => ({ ...f, correo: e.target.value }))}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-4 focus:ring-(--theme-500)/10 focus:border-(--theme-500) focus:bg-white transition-all outline-none font-medium text-gray-900"
                                                    placeholder="ana@ejemplo.com"
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
                                                            value={formCrear.apellidoPaterno}
                                                            onChange={(e) => setFormCrear((f) => ({ ...f, apellidoPaterno: e.target.value }))}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500) transition-all outline-none"
                                                            placeholder="Opcional"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Apellido Materno</label>
                                                        <input
                                                            type="text"
                                                            value={formCrear.apellidoMaterno}
                                                            onChange={(e) => setFormCrear((f) => ({ ...f, apellidoMaterno: e.target.value }))}
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
                                                                value={formCrear.empresa}
                                                                onChange={(e) => setFormCrear((f) => ({ ...f, empresa: e.target.value }))}
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
                                                        value={formCrear.notas}
                                                        onChange={(e) => setFormCrear((f) => ({ ...f, notas: e.target.value }))}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500) transition-all outline-none resize-none"
                                                        placeholder="Agrega algún detalle rápido..."
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Origen</label>
                                                    <SourcePicker 
                                                        selectedSource={formCrear.fuente} 
                                                        onChange={(val) => setFormCrear(f => ({ ...f, fuente: val }))} 
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
                                    setModalCrearAbierto(false);
                                    setMostrarAvanzado(false);
                                    setFormCrear({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefonos: [''], correo: '', empresa: '', sitioWeb: '', ubicacion: '', notas: '', fuente: '' });
                                }}
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-100 hover:text-slate-800 transition-all shadow-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCrearProspecto}
                                disabled={loadingCrear}
                                className="flex-2 px-4 py-2.5 bg-linear-to-r from-(--theme-600) to-(--theme-500) text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-(--theme-500)/30 flex items-center justify-center gap-2"
                            >
                                {loadingCrear ? 'Creando...' : 'Crear Prospecto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Editar Prospecto - Rediseño Moderno */}
            {modalEditarAbierto && (
                <div className="fixed inset-0 bg-slate-900/20 flex items-center justify-center z-50 p-4 transition-all duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[82vh] overflow-hidden animate-fadeIn">
                        {/* Header */}
                        <div className="px-6 py-4 bg-linear-to-r from-(--theme-50) to-white border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-(--theme-100) rounded-xl flex items-center justify-center">
                                    <Edit2 className="w-5 h-5 text-(--theme-600)" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Editar Prospecto</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Actualiza la información de contacto</p>
                                </div>
                            </div>
                            <button onClick={() => setModalEditarAbierto(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 overflow-y-auto scrollbar-hide">
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
                                            value={prospectoAEditar.nombres}
                                            onChange={(e) => setProspectoAEditar((f) => ({ ...f, nombres: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Apellido Paterno</label>
                                            <input
                                                type="text"
                                                value={prospectoAEditar.apellidoPaterno}
                                                onChange={(e) => setProspectoAEditar((f) => ({ ...f, apellidoPaterno: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Apellido Materno</label>
                                            <input
                                                type="text"
                                                value={prospectoAEditar.apellidoMaterno}
                                                onChange={(e) => setProspectoAEditar((f) => ({ ...f, apellidoMaterno: e.target.value }))}
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
                                                onClick={() => setProspectoAEditar((f) => ({ ...f, telefonos: [...(f.telefonos || ['']), ''] }))}
                                                className="flex items-center gap-1.5 text-xs text-(--theme-600) hover:text-(--theme-700) font-bold hover:bg-(--theme-50) px-2.5 py-1.5 rounded-lg transition-all"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Agregar
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {(prospectoAEditar.telefonos || ['']).map((tel, idx) => (
                                                <div key={idx} className="flex gap-3 items-center bg-linear-to-r from-slate-50 to-white p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-all group">
                                                    <Phone className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
                                                    <input
                                                        type="tel"
                                                        value={tel}
                                                        onChange={(e) => setProspectoAEditar((f) => { const t = [...(f.telefonos || [''])]; t[idx] = e.target.value; return { ...f, telefonos: t }; })}
                                                        className="flex-1 bg-transparent border-0 focus:ring-0 text-sm py-1 outline-none"
                                                        placeholder="Ej: +56 9 1234 5678"
                                                    />
                                                    {(prospectoAEditar.telefonos || ['']).length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setProspectoAEditar((f) => ({ ...f, telefonos: (f.telefonos || ['']).filter((_, i) => i !== idx) }))}
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
                                            value={prospectoAEditar.correo}
                                            onChange={(e) => setProspectoAEditar((f) => ({ ...f, correo: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300"
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
                                            value={prospectoAEditar.empresa}
                                            onChange={(e) => setProspectoAEditar((f) => ({ ...f, empresa: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300"
                                            placeholder="Nombre de la empresa"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Sitio Web</label>
                                        <input
                                            type="url"
                                            value={prospectoAEditar.sitioWeb || ''}
                                            onChange={(e) => setProspectoAEditar((f) => ({ ...f, sitioWeb: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300"
                                            placeholder="https://ejemplo.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Ubicación</label>
                                    <input
                                        type="text"
                                        value={prospectoAEditar.ubicacion || ''}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, ubicacion: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300"
                                        placeholder="Ciudad, Estado"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Origen del Prospecto</label>
                                    <SourcePicker
                                        selectedSource={prospectoAEditar.fuente || ''}
                                        onChange={(val) => setProspectoAEditar((f) => ({ ...f, fuente: val }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 p-6 border-t border-slate-100 bg-slate-50 justify-end">
                            <button
                                onClick={() => setModalEditarAbierto(false)}
                                className="px-6 py-3 border border-slate-300 text-gray-700 rounded-lg text-sm hover:bg-white font-bold transition-all hover:shadow-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEditarProspecto}
                                disabled={loadingEditar}
                                className="px-8 py-3 bg-(--theme-600) text-white rounded-lg text-sm hover:bg-(--theme-700) font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
                            >
                                {loadingEditar ? '⏳ Guardando...' : '✓ Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Pasar a Cliente */}
            {modalPasarClienteAbierto && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-sm w-full">
                        <div className="p-4 border-b border-slate-100 bg-(--theme-50)">
                            <h2 className="text-lg font-bold text-(--theme-900)">🏆 Pasar a cliente</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-gray-600 text-sm">
                                ¿Confirmas que <span className="font-semibold">{prospectoSeleccionado?.nombres} {prospectoSeleccionado?.apellidoPaterno}</span> se convierte en cliente?
                            </p>
                            <textarea
                                rows={2}
                                value={notaConversion}
                                onChange={e => setNotaConversion(e.target.value)}
                                placeholder="Notas (opcional)..."
                                className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-(--theme-400)"
                            />
                        </div>
                        <div className="flex gap-2 p-4 border-t border-slate-100">
                            <button
                                onClick={() => { setModalPasarClienteAbierto(false); setNotaConversion(''); }}
                                className="flex-1 px-3 py-2 border border-slate-200 text-gray-700 rounded text-sm hover:bg-slate-50 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handlePasarACliente}
                                disabled={loadingConversion}
                                className="flex-1 px-3 py-2 bg-(--theme-600) text-white rounded text-sm hover:bg-(--theme-700) font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingConversion ? 'Procesando...' : '✓ Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Descartar Prospecto - Rediseño Premium */}
            {modalDescartarAbierto && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                            <Trash2 className="w-8 h-8 text-rose-600" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 text-center mb-2">Descartar Prospecto</h2>
                        <p className="text-sm text-gray-500 text-center mb-8 font-medium italic">¿Por qué este prospecto no avanzó? Esta información mejorará nuestras métricas.</p>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center">Motivo de pérdida</label>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {[
                                        'Precio muy alto', 
                                        'Eligió a la competencia', 
                                        'No contestó', 
                                        'Sin interés real', 
                                        'Fuera de presupuesto', 
                                        'Proyecto pausado', 
                                        'Otro'
                                    ].map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setMotivoPerdida(m)}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                                                motivoPerdida === m
                                                    ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                                                    : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Notas adicionales</label>
                                <textarea
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-rose-500 outline-none transition-all resize-none"
                                    rows="3"
                                    placeholder="Comentarios opcionales..."
                                    value={notaDescarte}
                                    onChange={(e) => setNotaDescarte(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setModalDescartarAbierto(false);
                                        setMotivoPerdida('');
                                        setNotaDescarte('');
                                    }}
                                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={loadingConversion || !motivoPerdida}
                                    onClick={handleDescartar}
                                    className="flex-1 px-6 py-3 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 disabled:shadow-none"
                                >
                                    {loadingConversion ? 'Procesando...' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Eliminar Prospecto */}
            {prospectoAEliminar && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-sm w-full">
                        <div className="p-4 border-b border-red-100 bg-red-50 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <h2 className="text-lg font-bold text-red-800">Eliminar prospecto</h2>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-600 text-sm">
                                ¿Estás seguro de eliminar a <strong>{prospectoAEliminar.nombres} {prospectoAEliminar.apellidoPaterno}</strong>?
                                Esta acción no se puede deshacer.
                            </p>
                        </div>
                        <div className="flex gap-2 p-4 border-t border-slate-100">
                            <button
                                onClick={() => setProspectoAEliminar(null)}
                                className="flex-1 px-3 py-2 border border-slate-200 text-gray-700 rounded text-sm hover:bg-slate-50 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEliminarProspecto}
                                disabled={eliminando}
                                className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Importar CSV */}
            {isImportModalAbierto && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900">Importar Prospectos desde CSV</h2>
                            <button onClick={resetImportModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                                <p className="font-semibold mb-1">Formato esperado:</p>
                                <p className="font-mono bg-amber-100 rounded p-1 overflow-x-auto whitespace-nowrap">Nombres,Apellido Paterno,Apellido Materno,Telefono,Correo,Empresa,Notas</p>
                                <p className="mt-1">Todos los campos son opcionales.</p>
                            </div>
                            {!importResult ? (
                                <>
                                    <div
                                        className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-(--theme-400) hover:bg-(--theme-50)/30 transition-all"
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileChange({ target: { files: [f] } }); }}
                                    >
                                        <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
                                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        {csvFile ? (
                                            <p className="font-semibold text-slate-700 text-sm">{csvFile.name}</p>
                                        ) : (
                                            <p className="text-slate-500 text-sm">Arrastra un CSV aquí o haz clic para seleccionar</p>
                                        )}
                                    </div>
                                    {csvPreview && (
                                        <div className="text-sm">
                                            <p className="font-semibold text-slate-700">{csvPreview.data.length} prospectos listos para importar</p>
                                            {csvPreview.errors.length > 0 && (
                                                <ul className="mt-1 text-amber-700 text-xs list-disc pl-4">
                                                    {csvPreview.errors.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <button onClick={resetImportModal} className="flex-1 px-3 py-2 border border-slate-200 text-gray-700 rounded text-sm hover:bg-slate-50 font-medium">Cancelar</button>
                                        <button
                                            onClick={handleImportCsv}
                                            disabled={importando || !csvPreview || csvPreview.data.length === 0}
                                            className="flex-1 px-3 py-2 bg-(--theme-600) text-white rounded text-sm hover:bg-(--theme-700) font-medium disabled:opacity-50"
                                        >
                                            {importando ? 'Importando...' : `Importar ${csvPreview?.data.length || 0} prospectos`}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <div className="bg-(--theme-50) border border-(--theme-200) rounded-lg p-3 text-sm text-(--theme-800)">
                                        <p className="font-semibold">✓ Importación completada</p>
                                        <p>Insertados: {importResult.insertados} · Duplicados: {importResult.duplicados} · Errores: {importResult.errores}</p>
                                    </div>
                                    <button onClick={resetImportModal} className="w-full px-3 py-2 bg-(--theme-600) text-white rounded text-sm hover:bg-(--theme-700) font-medium">Cerrar</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    // VISTA DETALLADA DEL PROSPECTO
    if (prospectoSeleccionado) {
        return (
            <>
                <ProspectoDetalle
                    prospecto={prospectoSeleccionado}
                    rolePath={rolePath}
                    onVolver={() => handleSeleccionarProspecto(null)}
                    onActualizado={async () => { invalidarCacheLocal(); const normalizados = await cargarDatos(false); if (prospectoSeleccionado) { const updated = normalizados?.find(p => p.id === prospectoSeleccionado.id || p._id === prospectoSeleccionado._id); if (updated) setProspectoSeleccionado(updated); } }}
                    abrirModalEditar={abrirModalEditar}
                    setModalPasarClienteAbierto={setModalPasarClienteAbierto}
                    setModalDescartarAbierto={setModalDescartarAbierto}
                />
                {renderModales()}
            </>
        );
    }
// VISTA PRINCIPAL (LISTA DE PROSPECTOS)
    return (
        <div className={`md:bg-slate-50 md:p-6 bg-white -m-4 md:m-0 p-4 flex flex-col w-full ${vistaKanban ? 'flex-1 h-full min-h-0 overflow-hidden pb-4 md:pb-4' : 'min-h-screen pb-8 md:pb-6'}`}>
            <div className={`max-w-[1600px] w-full mx-auto flex flex-col ${vistaKanban ? 'h-full flex-1' : 'space-y-6'}`}>
                {/* Header and Controls */}
                <div className="flex flex-col xl:flex-row xl:items-center gap-4 mb-3 shrink-0">
                    {/* Title - Left Aligned */}
                    <div className="shrink-0 xl:flex-1 min-w-0">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">Prospectos</h1>
                        <p className="text-xs md:text-sm text-gray-500 mt-0.5 leading-snug">
                            Cartera de prospectos
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
                                                        <option value="mine">Mis prospectos</option>
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
                                                        <option value="mayor_valor_estimado">Valor estimado</option>
                                                        <option value="reciente">Reciente</option>
                                                        <option value="mayor_valor">Interés</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {busquedaProspecto && (
                                    <button
                                        onClick={() => setBusquedaProspecto('')}
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
                                    placeholder="Buscar prospecto..."
                                    value={busquedaProspecto}
                                    onChange={(e) => setBusquedaProspecto(e.target.value)}
                                    className="w-full h-full pl-9 pr-3 bg-transparent outline-none text-[11px] font-medium text-slate-700 placeholder:text-slate-400 focus:bg-slate-50 transition-colors border-0 focus:ring-0"
                                />
                            </div>

                            <div 
                                className={`flex items-center justify-center h-full border-l border-slate-200 bg-slate-50/50 transition-all ${vistaKanban ? 'w-10' : 'w-10 opacity-0 pointer-events-none'}`} 
                                id="kanban-settings-portal-target"
                            ></div>
                        </div>


                    </div>

                    {/* Actions - Right Aligned */}
                    <div className="flex items-center justify-start xl:justify-end gap-2 w-full xl:w-auto xl:flex-1 min-w-0 mt-2 xl:mt-0">
                        {/* Botones de acción principal */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                            <button
                                onClick={() => setIsImportModalAbierto(true)}
                                disabled={importando}
                                className="flex items-center justify-center w-9 h-9 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm shrink-0"
                                title="Importar"
                            >
                                {importando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={handleExportCsv}
                                disabled={loading || !prospectosFiltrados.length}
                                className="flex items-center justify-center w-9 h-9 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm shrink-0"
                                title="Exportar"
                            >
                                <Upload className="w-4 h-4" />
                            </button>
                        </div>
                        <button
                            onClick={() => setModalCrearAbierto(true)}
                            className="hidden sm:flex w-full sm:w-auto justify-center items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-(--theme-600) text-white rounded-lg hover:bg-(--theme-700) transition-colors text-xs md:text-sm font-medium"
                        >
                            <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
                            Crear prospecto
                        </button>
                    </div>
                </div>

                {/* Lista de Prospectos (Tarjetas o Tabla simplificada) */}
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
                                <KanbanProspectos
                                    prospectos={prospectosFiltrados}
                                    onVerDetalles={handleSeleccionarProspecto}
                                    abrirModalEditar={abrirModalEditar}
                                    setProspectoAEliminar={setProspectoAEliminar}
                                    handleToggleCompartido={handleToggleCompartido}
                                    isOwnerRecord={isOwnerRecord}
                                    onEtapaChange={handleKanbanColChange}
                                />
                            </motion.div>
                        ) : prospectosFiltrados.length === 0 ? (
                            <motion.div
                                key="lista_vacia"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                className="bg-white md:rounded-2xl p-12 min-h-60 flex flex-col items-center justify-center text-center"
                            >
                                <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                    <Search className="w-8 h-8 text-slate-300" />
                                </div>
                                <p className="text-lg font-medium text-slate-700">No se encontraron prospectos</p>
                                <p className="text-sm text-slate-400 mt-1">Prueba ajustando los filtros o creando uno nuevo.</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="lista"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                className="space-y-6 w-full"
                            >
                        {(() => {
                            const misPrivados = [];
                            const misCompartidos = [];
                            const deOtros = {};

                            prospectosFiltrados.forEach(p => {
                                const isMine = p.esPropietario === true || isOwnerRecord(p);
                                if (isMine) {
                                    if (p.compartido) {
                                        misCompartidos.push(p);
                                    } else {
                                        misPrivados.push(p);
                                    }
                                } else {
                                    const ownerName = p.propietarioNombre || p.vendedor?.nombres || p.prospectorAsignadoNombre || 'Otro Usuario';
                                    if (!deOtros[ownerName]) deOtros[ownerName] = [];
                                    deOtros[ownerName].push(p);
                                }
                            });

                            const renderRow = (p) => {
                                const id = p._id || p.id;
                                const isLastViewed = lastViewedId && id === lastViewedId;
                                return (<tr key={id} className={`transition-all cursor-pointer ${isLastViewed ? 'row-highlight-shimmer' : 'hover:bg-slate-50/70'}`} onClick={() => handleSeleccionarProspecto(p)}>
                                            <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <p className="font-bold text-gray-900 leading-tight text-[11px] md:text-sm">
                                                        {p.nombres} {p.apellidoPaterno}
                                                    </p>
                                                    <p className="text-[9px] md:text-[10px] text-slate-500 mt-0.5 max-w-[100px] md:max-w-none truncate">
                                                        {p.empresa || 'Sin empresa'}
                                                    </p>
                                                    <div className="flex items-center gap-0.5 text-yellow-500 scale-[0.6] md:scale-75 origin-left mt-0.5">
                                                        {[1, 2, 3, 4, 5].map((value) => (
                                                            <Star key={value} className={`w-3.5 h-3.5 ${p.interes >= value ? 'fill-yellow-400' : 'fill-slate-100 text-slate-300'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] md:text-sm font-semibold text-gray-800">
                                                        {p.customMetricValue ? `${p.customMetricLabel || 'MXN'} $${Number(p.customMetricValue).toLocaleString('es-MX')}` : 'No definido'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">
                                                <div className="space-y-0.5">
                                                    {p.telefono ? (
                                                        <p className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                                                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                            {p.telefono}
                                                        </p>
                                                    ) : null}
                                                    {p.correo ? (
                                                        <p className="flex items-center gap-1.5 text-gray-500 text-sm">
                                                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                            <span>{p.correo}</span>
                                                        </p>
                                                    ) : null}
                                                    {!p.telefono && !p.correo && (
                                                        <span className="text-xs text-slate-400 italic">Sin contacto</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-4 py-2 md:py-3 text-center whitespace-nowrap">
                                                {(() => {
                                                    const estadoCalculado = calcularEstado(p, getOportunidadesActivas(p.id || p._id));
                                                    return (
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getEstadoColor(estadoCalculado)}`}>
                                                            {getEstadoLabel(estadoCalculado)}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-2 md:px-4 py-2 md:py-3 text-center whitespace-nowrap">
                                                {(() => {
                                                    let tags = [];
                                                    try {
                                                        if (typeof p.etiquetas === 'string') {
                                                            tags = JSON.parse(p.etiquetas);
                                                        } else if (Array.isArray(p.etiquetas)) {
                                                            tags = p.etiquetas;
                                                        }
                                                    } catch (_) { tags = []; }
                                                    
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
                                                 <div className="flex flex-col gap-1.5">
                                                     {/* Próxima Cita (Meeting) */}
                                                     {p.proximaCita && (() => {
                                                         const esVencido = new Date(p.proximaCita) < new Date();
                                                         return (
                                                             <div className={`flex items-center gap-1.5 ${esVencido ? 'text-red-600' : 'text-indigo-600'}`}>
                                                                 <Video className="w-3 h-3 shrink-0" />
                                                                 <span className="text-[10px] font-bold leading-tight uppercase tracking-tighter">
                                                                     Cita: {new Date(p.proximaCita).toLocaleString('es-MX', {
                                                                         day: 'numeric',
                                                                         month: 'short',
                                                                         hour: '2-digit',
                                                                         minute: '2-digit'
                                                                     })}
                                                                     {esVencido && ' ⚠'}
                                                                 </span>
                                                             </div>
                                                         );
                                                     })()}

                                                     {/* Recordatorio de Llamada */}
                                                     {p.proximaLlamada && (() => {
                                                         // Si ya mostramos la cita y la fecha es la misma, no duplicamos como llamada
                                                         const citaMismaFecha = p.proximaCita && (new Date(p.proximaLlamada).getTime() === new Date(p.proximaCita).getTime());
                                                         if (citaMismaFecha) return null;

                                                         const esVencido = new Date(p.proximaLlamada) < new Date();
                                                         return (
                                                             <div className={`flex items-center gap-1.5 ${esVencido ? 'text-red-600' : 'text-emerald-00'}`}>
                                                                 <Phone className="w-3 h-3 shrink-0" />
                                                                 <span className="text-[10px] font-bold leading-tight uppercase tracking-tighter">
                                                                     {new Date(p.proximaLlamada).toLocaleString('es-MX', {
                                                                         day: 'numeric',
                                                                         month: 'short',
                                                                         hour: '2-digit',
                                                                         minute: '2-digit'
                                                                     })}
                                                                     {esVencido && ' ⚠'}
                                                                 </span>
                                                             </div>
                                                         );
                                                     })()}

                                                     {!p.proximaLlamada && !p.proximaCita && (
                                                         <span className="text-xs text-slate-400 italic">Sin pendiente</span>
                                                     )}
                                                 </div>
                                             </td>
                                            <td className="px-2 md:px-4 py-2 md:py-3 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1.5 md:gap-3">
                                                    {(p.esPropietario === true || isOwnerRecord(p)) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleCompartido(p, !p.compartido);
                                                            }}
                                                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${p.compartido ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200 shadow-sm border-2 border-emerald-200' : 'text-gray-400 hover:text-(--theme-600) hover:bg-(--theme-50)'}`}
                                                            title={p.compartido ? "Dejar de compartir" : "Compartir con el equipo"}
                                                        >
                                                            <Share2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); abrirModalEditar(p); }}
                                                        className="text-gray-400 hover:text-(--theme-600) transition-colors p-2 rounded-full hover:bg-(--theme-50)"
                                                        title="Editar Prospecto"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setProspectoAEliminar(p); }}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                                                        title="Eliminar Prospecto"
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
                                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-[10px] md:text-xs">Cliente</th>
                                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-[10px] md:text-xs">Valor estimado</th>
                                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-[10px] md:text-xs">Contacto</th>
                                                        <th className="px-2 md:px-4 py-2 md:py-3 text-center font-semibold text-[9px] md:text-xs uppercase tracking-wider">Estado</th>
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
                                    {renderGroup(misCompartidos, "Mis Prospectos Compartidos", "bg-emerald-50 text-emerald-800")}
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
            {renderModales()}
        </div>
    );
};

export default Seguimiento;
