import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
    Download,
    Upload,
    Trash2,
    AlertCircle,
    FileText,
    X
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getToken } from '../../utils/authUtils';
import HistorialInteracciones from '../../components/HistorialInteracciones';
import TimeWheelPicker from '../../components/TimeWheelPicker';

import API_URL from '../../config/api';
import socket from '../../config/socket';

// --- CSV helpers ---
const CSV_HEADERS = ['nombres', 'apellidoPaterno', 'apellidoMaterno', 'telefono', 'correo', 'empresa', 'sitioWeb', 'ubicacion', 'notas'];
const CSV_LABELS = ['Nombres', 'Apellido Paterno', 'Apellido Materno', 'Telefono', 'Correo', 'Empresa', 'Sitio Web', 'Ubicacion', 'Notas'];

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

const getTipoLabel = (tipo) => TIPOS_ACTIVIDAD.find(t => t.value === tipo)?.label || tipo;
const getTipoColor = (tipo) => TIPOS_ACTIVIDAD.find(t => t.value === tipo)?.color || 'bg-gray-500';
const getResultadoLabel = (r) => RESULTADOS.find(x => x.value === r)?.label || r;

const ETAPAS_EMBUDO = {
    'prospecto_nuevo': { label: 'Sin contacto', color: 'bg-red-100 text-red-600' },
    'en_contacto': { label: 'En contacto', color: 'bg-(--theme-100) text-(--theme-600)' },
    'reunion_agendada': { label: 'Cita agendada', color: 'bg-(--theme-100) text-(--theme-600)' },
    'reunion_realizada': { label: 'Cita realizada', color: 'bg-(--theme-100) text-(--theme-600)' },
    'en_negociacion': { label: 'Negociación', color: 'bg-amber-100 text-amber-600' },
    'venta_ganada': { label: 'Venta ganada', color: 'bg-(--theme-100) text-(--theme-600)' },
    'perdido': { label: 'Perdido', color: 'bg-rose-100 text-rose-600' }
};

const getEtapaLabel = (etapa) => ETAPAS_EMBUDO[etapa]?.label || etapa;
const getEtapaColor = (etapa) => ETAPAS_EMBUDO[etapa]?.color || 'bg-gray-100 text-gray-600';

const ProspectorSeguimiento = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const rolePath = location.pathname.startsWith('/closer') ? 'closer' : 'prospector';
    const [prospectos, setProspectos] = useState([]);
    const [loading, setLoading] = useState(true);
    // Filtros
    const [busquedaProspecto, setBusquedaProspecto] = useState('');
    const [filtroEtapa, setFiltroEtapa] = useState('todos'); // 'todos', 'prospecto_nuevo', 'reunion_agendada', etc.
    const [filtroFecha, setFiltroFecha] = useState('todos'); // 'todos', 'hoy', 'ayer', 'semana', 'mes', 'personalizado'
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [filtroRecordatorio, setFiltroRecordatorio] = useState(false);
    const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
    const [loadingCrear, setLoadingCrear] = useState(false);
    const [formCrear, setFormCrear] = useState({
        nombres: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        telefonos: [''],
        correo: '',
        empresa: '',
        sitioWeb: '',
        ubicacion: '',
        notas: ''
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

    // Estado para el acordeón de acciones de cierre
    const [acordeonCierreAbierto, setAcordeonCierreAbierto] = useState(false);

    // Estado para edición rápida de fecha de seguimiento
    const [editandoFechaSeguimiento, setEditandoFechaSeguimiento] = useState(false);
    const [nuevaFechaSeguimiento, setNuevaFechaSeguimiento] = useState('');

    const guardarFechaSeguimiento = async (pid) => {
        try {
            await axios.put(
                `${API_URL}/api/${rolePath}/prospectos/${pid}`,
                { proximaLlamada: nuevaFechaSeguimiento || null },
                { headers: getAuthHeaders() }
            );
            toast.success('Fecha de seguimiento actualizada');
            setEditandoFechaSeguimiento(false);
            const res = await axios.get(`${API_URL}/api/${rolePath}/prospectos`, { headers: getAuthHeaders() });
            const updated = res.data.find(p => p.id === pid || p._id === pid);
            if (updated) { setProspectoSeleccionado(updated); setProspectos(res.data); }
        } catch { toast.error('Error al actualizar la fecha'); }
    };

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
            etapaEmbudo: p.etapaEmbudo || 'prospecto_nuevo',
            proximaLlamada: p.proximaLlamada ? p.proximaLlamada.slice(0, 16) : ''
        });
        setModalEditarAbierto(true);
    };

    const handleEditarProspecto = async () => {
        setLoadingEditar(true);
        try {
            const telefonosLimpios = (prospectoAEditar.telefonos || []).filter(t => t.trim());
            const payload = { ...prospectoAEditar, telefono: telefonosLimpios[0] || '', telefono2: telefonosLimpios.slice(1).join(', ') || '' };
            delete payload.telefonos;
            await axios.put(`${API_URL}/api/${rolePath}/prospectos/${prospectoAEditar.id}/editar`, payload, {
                headers: getAuthHeaders()
            });
            toast.success('Prospecto actualizado');
            setModalEditarAbierto(false);
            // Recargar datos y actualizar el panel de detalle si está abierto
            const res = await axios.get(`${API_URL}/api/${rolePath}/prospectos`, { headers: getAuthHeaders() });
            setProspectos(res.data);
            if (prospectoSeleccionado && (prospectoSeleccionado.id === prospectoAEditar.id || prospectoSeleccionado._id === prospectoAEditar.id)) {
                const updated = res.data.find(p => p.id === prospectoAEditar.id || p._id === prospectoAEditar.id);
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
    const [actividadesContext, setActividadesContext] = useState([]);
    const [loadingContext, setLoadingContext] = useState(false);
    // Estado para el flujo de llamada inline
    const [llamadaFlow, setLlamadaFlow] = useState(null);
    // { paso: 'contesto'|'agendo'|'llamarDespues'|'fecha'|'done', contesto: bool, agendo: bool, llamarDespues: bool, fechaProxima: '', notas: '' }

    const [notasRapidas, setNotasRapidas] = useState('');
    const [loadingNotas, setLoadingNotas] = useState(false);
    const [muralTexto, setMuralTexto] = useState('');
    const [guardandoMural, setGuardandoMural] = useState(false);

    const handleGuardarNotasRapidas = async () => {
        if (!prospectoSeleccionado) return;
        setLoadingNotas(true);
        try {
            const pid = prospectoSeleccionado.id || prospectoSeleccionado._id;
            await axios.put(`${API_URL}/api/${rolePath}/prospectos/${pid}/editar`, {
                // Solo enviamos los campos editables mínimos para no sobreescribir datos enriquecidos
                nombres: prospectoSeleccionado.nombres || '',
                apellidoPaterno: prospectoSeleccionado.apellidoPaterno || '',
                apellidoMaterno: prospectoSeleccionado.apellidoMaterno || '',
                telefono: prospectoSeleccionado.telefono || '',
                telefono2: prospectoSeleccionado.telefono2 || '',
                correo: prospectoSeleccionado.correo || '',
                empresa: prospectoSeleccionado.empresa || '',
                sitioWeb: prospectoSeleccionado.sitioWeb || '',
                ubicacion: prospectoSeleccionado.ubicacion || '',
                notas: notasRapidas
            }, { headers: getAuthHeaders() });

            toast.success('Notas guardadas');
            setProspectoSeleccionado(prev => ({ ...prev, notas: notasRapidas }));
            cargarDatos(); // Actualizar lista principal
        } catch (error) {
            toast.error('Error al guardar notas');
        } finally {
            setLoadingNotas(false);
        }
    };

    const getAuthHeaders = () => ({
        'x-auth-token': getToken() || ''
    });

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const resProspectos = await axios.get(`${API_URL}/api/${rolePath}/prospectos`, { headers: getAuthHeaders() });
            setProspectos(resProspectos.data);
        } catch (error) {
            console.error('Error al cargar:', error);
            setProspectos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            await cargarDatos();
            // Si venimos de otra página con un ID seleccionado
            if (location.state?.selectedId) {
                const res = await axios.get(`${API_URL}/api/${rolePath}/prospectos`, { headers: getAuthHeaders() });
                 
                const found = res.data.find(p => p.id == location.state.selectedId || p._id == location.state.selectedId);
                if (found) {
                    handleSeleccionarProspecto(found);
                }
            }
        };
        init();
        const interval = setInterval(cargarDatos, 5 * 60 * 1000);

        socket.on('prospectos_actualizados', (obj) => {
            console.log('socket: prospectos actualizados detectado', obj);
            cargarDatos();
        });

        return () => {
            clearInterval(interval);
            socket.off('prospectos_actualizados');
        };
    }, []);

    // Orden de prioridad de etapas (más avanzadas primero, perdido al fondo)
    const ORDEN_ETAPA = {
        'reunion_agendada': 1,
        'reunion_realizada': 2,
        'en_negociacion': 3,
        'en_contacto': 4,
        'prospecto_nuevo': 5,
        'venta_ganada': 6,
        'perdido': 99
    };
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

        // Etapa (filtros agrupados)...
        if (filtroEtapa === 'en_contacto') {
            // Respondió: etapa avanzó más allá de prospecto_nuevo
            filtrados = filtrados.filter(p => p.etapaEmbudo !== 'prospecto_nuevo');
        } else if (filtroEtapa === 'sin_respuesta') {
            // Intentaron contactar (hay actividades) pero sigue en prospecto_nuevo → no contestó
            filtrados = filtrados.filter(p => p.etapaEmbudo === 'prospecto_nuevo' && !!p.ultimaActTipo);
        } else if (filtroEtapa === 'no_contactado') {
            // Sin ninguna actividad registrada = nuevo prospecto sin interacción
            filtrados = filtrados.filter(p => p.etapaEmbudo === 'prospecto_nuevo' && !p.ultimaActTipo);
        } else if (filtroEtapa === 'con_cita') {
            // Tiene cita agendada o realizada
            filtrados = filtrados.filter(p => ['reunion_agendada', 'reunion_realizada'].includes(p.etapaEmbudo));
        }

        // Fecha...
        if (filtroFecha !== 'todos') {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            filtrados = filtrados.filter(p => {
                const fechaCreacion = new Date(p.createdAt || new Date());
                fechaCreacion.setHours(0, 0, 0, 0);

                if (filtroFecha === 'hoy') {
                    return fechaCreacion.getTime() === hoy.getTime();
                }
                if (filtroFecha === 'ayer') {
                    const ayer = new Date(hoy);
                    ayer.setDate(hoy.getDate() - 1);
                    return fechaCreacion.getTime() === ayer.getTime();
                }
                if (filtroFecha === 'semana') {
                    const semanaPasada = new Date(hoy);
                    semanaPasada.setDate(hoy.getDate() - 7);
                    return fechaCreacion >= semanaPasada && fechaCreacion <= hoy;
                }
                if (filtroFecha === 'mes') {
                    const mesPasado = new Date(hoy);
                    mesPasado.setDate(hoy.getDate() - 30);
                    return fechaCreacion >= mesPasado && fechaCreacion <= hoy;
                }
                if (filtroFecha === 'personalizado' && fechaDesde && fechaHasta) {
                    const dDesde = new Date(fechaDesde);
                    dDesde.setHours(0, 0, 0, 0);
                    // Aumentamos 1 día a la fechaHasta local para que sea inclusivo el día entero
                    const dHasta = new Date(fechaHasta);
                    dHasta.setHours(23, 59, 59, 999);
                    return fechaCreacion >= dDesde && fechaCreacion <= dHasta;
                }
                return true;
            });
        }

        // Recordatorio...
        if (filtroRecordatorio) {
            const ahora = new Date();
            filtrados = filtrados.filter(p => {
                if (!p.proximaLlamada) return false;
                // 'vencido': ya pasó la fecha. 'futuro': aún no. Ambos se muestran, vencidos primero.
                return true;
            });
        }

        return filtrados;
    }, [prospectos, busquedaProspecto, filtroEtapa, filtroFecha, fechaDesde, fechaHasta, filtroRecordatorio]).sort((a, b) => {
        // Perdidos siempre al fondo
        const esPerdidoA = a.etapaEmbudo === 'perdido';
        const esPerdidoB = b.etapaEmbudo === 'perdido';
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
        const orA = ORDEN_ETAPA[a.etapaEmbudo] ?? 10;
        const orB = ORDEN_ETAPA[b.etapaEmbudo] ?? 10;
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
            cargarDatos();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Error al eliminar el prospecto');
        } finally { setEliminando(false); }
    };

    const handleCrearProspecto = async () => {
        setLoadingCrear(true);
        try {
            const telefonosLimpios = formCrear.telefonos.filter(t => t.trim());
            const payload = { ...formCrear, telefono: telefonosLimpios[0] || '', telefono2: telefonosLimpios.slice(1).join(', ') || '' };
            delete payload.telefonos;
            await axios.post(`${API_URL}/api/${rolePath}/crear-prospecto`, payload, {
                headers: getAuthHeaders()
            });
            toast.success('Prospecto creado');
            setModalCrearAbierto(false);
            setFormCrear({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefonos: [''], correo: '', empresa: '', sitioWeb: '', ubicacion: '', notas: '' });
            cargarDatos();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Error al crear');
        } finally {
            setLoadingCrear(false);
        }
    };

    const handleSeleccionarProspecto = async (p) => {
        setProspectoSeleccionado(p);
        setNotasRapidas(p.notas || ''); // Inicializar notas rápidas
        setEditandoFechaSeguimiento(false); // Resetear edición inline de fecha
        setAcordeonCierreAbierto(false);    // Colapsar acordeón de cierre
        setLoadingContext(true);
        try {
            // MEJORADO: Usar endpoint de historial completo para ver actividades de AMBOS (prospector y closer)
            const endpoint = `${API_URL}/api/${rolePath}/prospecto/${p.id || p._id}/historial-completo`;
            const res = await axios.get(endpoint, { headers: getAuthHeaders() });

            // Si la respuesta incluye timeline completo, extractar actividades
            if (res.data.timeline) {
                // Filtrar solo actividades (no cambios de etapa)
                const actividades = res.data.timeline
                    .filter(item => item.tipo === 'actividad')
                    .map(act => ({
                        id: act.id,
                        tipo: act.tipoActividad,
                        fecha: act.fecha,
                        vendedor: act.vendedorId,
                        vendedorNombre: act.vendedorNombre,
                        vendedorRol: act.vendedorRol,
                        descripcion: act.descripcion,
                        resultado: act.resultado,
                        notas: act.notas
                    }));
                setActividadesContext(actividades);
            } else {
                // Fallback a endpoint antiguo si la respuesta no tiene timeline
                const fallbackRes = await axios.get(`${API_URL}/api/${rolePath}/prospectos/${p.id || p._id}/actividades`, { headers: getAuthHeaders() });
                setActividadesContext(fallbackRes.data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar historial del prospecto');
            setActividadesContext([]);
        } finally {
            setLoadingContext(false);
        }
    };

    const handleDeleteActividadContext = async (actividadId) => {
        if (!window.confirm('¿Eliminar esta actividad? Esta acción no se puede deshacer.')) return;
        try {
            await axios.delete(`${API_URL}/api/actividades/${actividadId}`, { headers: getAuthHeaders() });
            setActividadesContext(prev => prev.filter(a => a.id !== actividadId));
            toast.success('Actividad eliminada');
        } catch (error) {
            toast.error('No se pudo eliminar la actividad');
        }
    };

    const actualizarInteres = async (id, nuevoInteres) => {
        try {
            await axios.put(`${API_URL}/api/${rolePath}/prospectos/${id}`, { interes: nuevoInteres }, { headers: getAuthHeaders() });
            toast.success('Interés actualizado');
            setProspectos(prev => prev.map(p => (p.id === id || p._id === id) ? { ...p, interes: nuevoInteres } : p));
            if (prospectoSeleccionado && (prospectoSeleccionado.id === id || prospectoSeleccionado._id === id)) {
                setProspectoSeleccionado({ ...prospectoSeleccionado, interes: nuevoInteres });
            }
        } catch (error) {
            toast.error('Error al actualizar interés');
        }
    };

    const formatHora = (date) => {
        const d = new Date(date);
        return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    };

    // Helpers para vista detallada
    const llamadasExitosas = actividadesContext.filter(a => a.tipo === 'llamada' && a.resultado === 'exitoso').length;
    const llamadasFallidas = actividadesContext.filter(a => a.tipo === 'llamada' && a.resultado !== 'exitoso').length;
    const proximaCita = actividadesContext.find(a => a.tipo === 'cita' && new Date(a.fecha) >= new Date());

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-(--theme-500) animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando seguimiento...</p>
                </div>
            </div>
        );
    }

    // Shared Modals Render Function
    const renderModales = () => (
        <>
            {/* Modal Crear Prospecto */}
            {modalCrearAbierto && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-sm w-full">
                        <div className="p-4 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-gray-900">+ Nuevo prospecto</h2>
                        </div>
                        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Nombres</label>
                                    <input
                                        type="text"
                                        value={formCrear.nombres}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, nombres: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm"
                                        placeholder="Juan"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Apellido</label>
                                    <input
                                        type="text"
                                        value={formCrear.apellidoPaterno}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, apellidoPaterno: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm"
                                        placeholder="García"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-medium text-gray-700">Teléfonos</label>
                                        <button
                                            type="button"
                                            onClick={() => setFormCrear((f) => ({ ...f, telefonos: [...f.telefonos, ''] }))}
                                            className="flex items-center gap-1 text-xs text-(--theme-600) hover:text-(--theme-700) font-medium"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Agregar
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {formCrear.telefonos.map((tel, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input
                                                    type="tel"
                                                    value={tel}
                                                    onChange={(e) => setFormCrear((f) => { const t = [...f.telefonos]; t[idx] = e.target.value; return { ...f, telefonos: t }; })}
                                                    className="flex-1 border border-slate-200 rounded px-3 py-1.5 text-sm"
                                                    placeholder="+55 1234 5678"
                                                />
                                                {formCrear.telefonos.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormCrear((f) => ({ ...f, telefonos: f.telefonos.filter((_, i) => i !== idx) }))}
                                                        className="text-red-400 hover:text-red-600"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Correo</label>
                                    <input
                                        type="email"
                                        value={formCrear.correo}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, correo: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm"
                                        placeholder="correo@ejemplo.com"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Empresa</label>
                                    <input
                                        type="text"
                                        value={formCrear.empresa}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, empresa: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm"
                                        placeholder="Mi Empresa"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Sitio Web</label>
                                    <input
                                        type="url"
                                        value={formCrear.sitioWeb}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, sitioWeb: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm"
                                        placeholder="https://ejemplo.com"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Ubicación</label>
                                    <input
                                        type="text"
                                        value={formCrear.ubicacion}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, ubicacion: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm"
                                        placeholder="Ciudad, Estado, País"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                                    <textarea
                                        rows={3}
                                        value={formCrear.notas}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, notas: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm resize-none"
                                        placeholder="Información relevante sobre el primer contacto..."
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 p-4 border-t border-slate-100">
                            <button
                                onClick={() => {
                                    setModalCrearAbierto(false);
                                    setFormCrear({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefonos: [''], correo: '', empresa: '', sitioWeb: '', ubicacion: '', notas: '' });
                                }}
                                className="flex-1 px-3 py-2 border border-slate-200 text-gray-700 rounded text-sm hover:bg-slate-50 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCrearProspecto}
                                disabled={loadingCrear}
                                className="flex-1 px-3 py-2 bg-(--theme-600) text-white rounded text-sm hover:bg-(--theme-700) font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingCrear ? 'Creando...' : '+ Crear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Editar Prospecto */}
            {modalEditarAbierto && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-sm w-full">
                        <div className="p-4 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-gray-900">✏️ Editar prospecto</h2>
                        </div>
                        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Nombres</label>
                                    <input
                                        type="text"
                                        value={prospectoAEditar.nombres}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, nombres: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Apellido</label>
                                    <input
                                        type="text"
                                        value={prospectoAEditar.apellidoPaterno}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, apellidoPaterno: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-medium text-gray-700">Teléfonos</label>
                                        <button
                                            type="button"
                                            onClick={() => setProspectoAEditar((f) => ({ ...f, telefonos: [...(f.telefonos || ['']), ''] }))}
                                            className="flex items-center gap-1 text-xs text-(--theme-600) hover:text-(--theme-700) font-medium"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Agregar
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {(prospectoAEditar.telefonos || ['']).map((tel, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input
                                                    type="tel"
                                                    value={tel}
                                                    onChange={(e) => setProspectoAEditar((f) => { const t = [...(f.telefonos || [''])]; t[idx] = e.target.value; return { ...f, telefonos: t }; })}
                                                    className="flex-1 border border-slate-200 rounded px-3 py-1.5 text-sm"
                                                    placeholder="+55 1234 5678"
                                                />
                                                {(prospectoAEditar.telefonos || ['']).length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setProspectoAEditar((f) => ({ ...f, telefonos: (f.telefonos || ['']).filter((_, i) => i !== idx) }))}
                                                        className="text-red-400 hover:text-red-600"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Correo</label>
                                    <input
                                        type="email"
                                        value={prospectoAEditar.correo}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, correo: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Empresa</label>
                                    <input
                                        type="text"
                                        value={prospectoAEditar.empresa}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, empresa: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Sitio Web</label>
                                    <input
                                        type="url"
                                        value={prospectoAEditar.sitioWeb || ''}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, sitioWeb: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm"
                                        placeholder="https://ejemplo.com"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Ubicación</label>
                                    <input
                                        type="text"
                                        value={prospectoAEditar.ubicacion || ''}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, ubicacion: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm"
                                        placeholder="Ciudad, Estado, País"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                                    <textarea
                                        rows={3}
                                        value={prospectoAEditar.notas || ''}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, notas: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm resize-none"
                                        placeholder="Notas sobre el prospecto..."
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Etapa del Embudo</label>
                                    <select
                                        value={prospectoAEditar.etapaEmbudo}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, etapaEmbudo: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm bg-white"
                                    >
                                        {Object.entries(ETAPAS_EMBUDO).map(([key, value]) => (
                                            <option key={key} value={key}>{value.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Recordatorio (Próxima Llamada)</label>
                                    <TimeWheelPicker
                                        value={prospectoAEditar.proximaLlamada || ''}
                                        onChange={(val) => setProspectoAEditar((f) => ({ ...f, proximaLlamada: val }))}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 p-4 border-t border-slate-100">
                            <button
                                onClick={() => setModalEditarAbierto(false)}
                                className="flex-1 px-3 py-2 border border-slate-200 text-gray-700 rounded text-sm hover:bg-slate-50 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEditarProspecto}
                                disabled={loadingEditar}
                                className="flex-1 px-3 py-2 bg-(--theme-600) text-white rounded text-sm hover:bg-(--theme-700) font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingEditar ? 'Guardando...' : 'Guardar'}
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

            {/* Modal Descartar Prospecto */}
            {modalDescartarAbierto && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-sm w-full">
                        <div className="p-4 border-b border-slate-100 bg-red-50">
                            <h2 className="text-lg font-bold text-red-900">🗑️ Descartar prospecto</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-gray-600 text-sm">
                                ¿Descartar a <span className="font-semibold">{prospectoSeleccionado?.nombres} {prospectoSeleccionado?.apellidoPaterno}</span>? Se registrará en el historial.
                            </p>
                            <textarea
                                rows={2}
                                value={notaDescarte}
                                onChange={e => setNotaDescarte(e.target.value)}
                                placeholder="Motivo (opcional)..."
                                className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-400"
                            />
                        </div>
                        <div className="flex gap-2 p-4 border-t border-slate-100">
                            <button
                                onClick={() => { setModalDescartarAbierto(false); setNotaDescarte(''); }}
                                className="flex-1 px-3 py-2 border border-slate-200 text-gray-700 rounded text-sm hover:bg-slate-50 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDescartar}
                                disabled={loadingConversion}
                                className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingConversion ? 'Procesando...' : '✓ Descartar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Eliminar Prospecto */}
            {prospectoAEliminar && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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

    const handlePasarACliente = async () => {
        if (!prospectoSeleccionado) return;
        const pid = prospectoSeleccionado.id || prospectoSeleccionado._id;
        setLoadingConversion(true);
        try {
            await axios.post(`${API_URL}/api/${rolePath}/pasar-a-cliente/${pid}`,
                { notas: notaConversion || 'Prospecto convertido a cliente' },
                { headers: getAuthHeaders() }
            );
            toast.success('¡Prospecto convertido a cliente!');
            setModalPasarClienteAbierto(false);
            setNotaConversion('');
            setProspectoSeleccionado(null);
            // Redirigir a la página de clientes
            setTimeout(() => {
                navigate(`/${rolePath}/clientes`);
            }, 800);
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error al convertir');
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
                { notas: notaDescarte || 'Prospecto descartado' },
                { headers: getAuthHeaders() }
            );
            toast('Prospecto descartado', { icon: '🗑️' });
            setModalDescartarAbierto(false);
            setNotaDescarte('');
            setProspectoSeleccionado(null);
            cargarDatos();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error al descartar');
        } finally {
            setLoadingConversion(false);
        }
    };


    // VISTA DETALLADA DEL PROSPECTO
    if (prospectoSeleccionado) {
        const pid = prospectoSeleccionado.id || prospectoSeleccionado._id;

        // Helpers para el historial enriquecido
        const getActIcon = (act) => {
            // Evaluamos primero notas para las opciones personalizables de llamadas
            if (act.tipo === 'llamada') {
                if (act.notas?.includes('WhatsApp')) return { icon: '💬', color: 'bg-green-500', label: 'WhatsApp / Correo' };
                if (act.notas?.includes('llamar después')) return { icon: '📅', color: 'bg-(--theme-500)', label: 'Llamar después' };
                if (act.notas?.toLowerCase().includes('sin interés')) return { icon: '👎', color: 'bg-gray-500', label: 'Sin interés' };
                if (act.notas?.includes('Agendó reunión')) return { icon: '🤝', color: 'bg-(--theme-500)', label: 'Cita Agendada' };

                if (act.resultado === 'exitoso') return { icon: '📞', color: 'bg-(--theme-500)', label: 'Llamada exitosa' };
                if (act.resultado === 'fallido') return { icon: '📵', color: 'bg-rose-500', label: 'Sin respuesta' };
            }

            if (act.tipo === 'cita') {
                const desc = act.descripcion || '';
                if (act.resultado === 'pendiente') return { icon: '📅', color: 'bg-(--theme-500)', label: 'Cita Agendada' };
                if (desc.includes('no asistió') || desc.includes('No asistió')) return { icon: '❌', color: 'bg-red-500', label: desc };
                if (desc.includes('Venta cerrada') || desc.includes('¡Venta')) return { icon: '🎉', color: 'bg-green-500', label: desc };
                if (desc.includes('cotización') || desc.includes('Cotización')) return { icon: '💰', color: 'bg-(--theme-600)', label: desc };
                if (desc.includes('otra reunión') || desc.includes('Otra reunión')) return { icon: '📅', color: 'bg-yellow-500', label: desc };
                if (desc.includes('No le interesó') || desc.includes('no le interesó')) return { icon: '😐', color: 'bg-gray-500', label: desc };
                return { icon: '📅', color: 'bg-(--theme-500)', label: desc || 'Reunión' };
            }
            if (act.tipo === 'whatsapp') return { icon: '💬', color: 'bg-green-500', label: 'WhatsApp' };
            if (act.tipo === 'cliente') return { icon: '🏆', color: 'bg-yellow-500', label: 'Convertido a cliente' };
            if (act.tipo === 'descartado') return { icon: '🗑️', color: 'bg-gray-400', label: 'Descartado' };
            return { icon: '📝', color: 'bg-slate-400', label: act.tipo || 'Interacción' };
        };
        const getResultadoTexto = (act) => {
            if (act.tipo === 'llamada' && act.resultado === 'exitoso') return 'Contestó ✔';
            if (act.tipo === 'llamada' && act.resultado === 'fallido') return 'No contestó ✗';
            if (act.tipo === 'cita') {
                if (act.resultado === 'pendiente') return 'Cita programada';
                if (act.descripcion) return act.descripcion;
                const mapa = { exitoso: 'Reunión realizada', fallido: 'No asistió / Cancelada', convertido: 'Venta cerrada' };
                return mapa[act.resultado] || act.resultado;
            }
            if (act.tipo === 'whatsapp') return 'Mensaje enviado';
            if (act.resultado) return act.resultado;
            return '';
        };

        // Tarea pendiente: mostrar si hay una próxima llamada agendada o cita
        const tareaLlamar = prospectoSeleccionado.proximaLlamada ? { fecha: prospectoSeleccionado.proximaLlamada, tipo: 'llamada' } : null;
        const proximaCita = actividadesContext.find(a => a.tipo === 'cita' && a.resultado === 'pendiente' && new Date(a.fechaCita || a.fecha) >= new Date());

        const registrarActividad = async (payload) => {
            try {
                // Promover etapa automáticamente si corresponde
                const payloadFinal = { ...payload };
                if (
                    payload.tipo === 'llamada' &&
                    payload.resultado === 'exitoso' &&
                    prospectoSeleccionado.etapaEmbudo === 'prospecto_nuevo'
                ) {
                    payloadFinal.etapaEmbudo = 'en_contacto';
                }

                // Al registrar cualquier llamada, limpiar el seguimiento pendiente
                // (si se agenda nueva fecha, el flujo "Llamar después" la sobreescribe)
                if (payload.tipo === 'llamada' && prospectoSeleccionado.proximaLlamada) {
                    await axios.put(`${API_URL}/api/${rolePath}/prospectos/${pid}`, {
                        proximaLlamada: null
                    }, { headers: getAuthHeaders() });
                }

                await axios.post(`${API_URL}/api/${rolePath}/registrar-actividad`, { clienteId: pid, ...payloadFinal }, { headers: getAuthHeaders() });
                toast.success('Interacción registrada');

                // Recargar prospecto fresco desde el servidor (evitar estado obsoleto)
                const res = await axios.get(`${API_URL}/api/${rolePath}/prospectos`, { headers: getAuthHeaders() });
                const updated = res.data.find(p => p.id === pid || p._id === pid);
                if (updated) {
                    setProspectoSeleccionado(updated);
                    setProspectos(res.data);
                }
                // Recargar historial
                handleSeleccionarProspecto(updated || prospectoSeleccionado);
            } catch { toast.error('Error al registrar'); }
        };

        const registrarEnMural = async () => {
            const texto = muralTexto.trim();
            if (!texto) {
                toast.error('Escribe algo para registrar en el mural');
                return;
            }

            setGuardandoMural(true);
            try {
                await registrarActividad({
                    tipo: 'mensaje',
                    resultado: 'pendiente',
                    descripcion: 'Nota rápida en mural',
                    notas: texto
                });
                setMuralTexto('');
            } finally {
                setGuardandoMural(false);
            }
        };

        return (
            <div className="min-h-screen p-6 bg-slate-50">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Botón regresar */}
                    <button
                        onClick={() => setProspectoSeleccionado(null)}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium mb-2"
                    >
                        <ArrowLeft className="w-5 h-5" /> Regresar a la lista
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* ===================== COLUMNA IZQUIERDA ===================== */}
                        <div className="lg:col-span-2 space-y-4">

                            {/* Cabecera + Estrellas + Datos de contacto */}
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h1 className="text-2xl font-bold text-gray-900">
                                                {prospectoSeleccionado.nombres} {prospectoSeleccionado.apellidoPaterno}
                                            </h1>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getEtapaColor(prospectoSeleccionado.etapaEmbudo)}`}>
                                                {getEtapaLabel(prospectoSeleccionado.etapaEmbudo)}
                                            </span>
                                        </div>
                                        {prospectoSeleccionado.empresa && (
                                            <p className="text-gray-500 mt-0.5">{prospectoSeleccionado.empresa}</p>
                                        )}
                                        <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
                                            {[prospectoSeleccionado.telefono, prospectoSeleccionado.telefono2].filter(Boolean).flatMap(t => t.split(',').map(s => s.trim())).filter(Boolean).map((tel, idx) => (
                                                <span key={idx} className="flex items-center gap-1"><Phone className="w-4 h-4" /> {tel}</span>
                                            ))}
                                            {prospectoSeleccionado.correo && (
                                                <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {prospectoSeleccionado.correo}</span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Interés (estrellas) */}
                                    <div className="flex items-center gap-1 text-yellow-500 shrink-0">
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => actualizarInteres(pid, prospectoSeleccionado.interes === value ? 0 : value)}
                                                className="hover:scale-110 transition-transform"
                                            >
                                                <Star className={`w-6 h-6 ${prospectoSeleccionado.interes >= value ? 'fill-yellow-400' : 'fill-slate-100 text-slate-300'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Recordatorio de próxima acción */}
                                {tareaLlamar && !editandoFechaSeguimiento && (
                                    <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-(--theme-50) border border-(--theme-200) rounded-lg text-sm text-(--theme-700) font-medium">
                                        <Clock className="w-4 h-4 shrink-0" />
                                        <span className="flex-1">Próximo seguimiento: {new Date(tareaLlamar.fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                        <button
                                            title="Editar fecha de seguimiento"
                                            onClick={() => { setNuevaFechaSeguimiento(prospectoSeleccionado.proximaLlamada ? prospectoSeleccionado.proximaLlamada.slice(0, 16) : ''); setEditandoFechaSeguimiento(true); }}
                                            className="ml-1 p-1 rounded hover:bg-(--theme-100) transition-colors text-(--theme-500)"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        </button>
                                    </div>
                                )}
                                {editandoFechaSeguimiento && (
                                    <div className="mt-4 px-3 py-3 bg-(--theme-50) border border-(--theme-200) rounded-lg">
                                        <div className="flex items-center gap-2 mb-3 text-sm text-(--theme-700) font-medium">
                                            <Clock className="w-4 h-4 shrink-0" />
                                            <span>Editar fecha de seguimiento</span>
                                        </div>
                                        <TimeWheelPicker
                                            value={nuevaFechaSeguimiento}
                                            onChange={setNuevaFechaSeguimiento}
                                        />
                                        <div className="flex gap-2 mt-1">
                                        <button
                                            onClick={() => guardarFechaSeguimiento(pid)}
                                            className="flex-1 px-3 py-2 bg-(--theme-600) text-white rounded-lg text-sm font-semibold hover:bg-(--theme-700)"
                                        >Guardar</button>
                                        <button
                                            onClick={() => setEditandoFechaSeguimiento(false)}
                                            className="flex-1 px-3 py-2 bg-white border border-slate-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
                                        >Cancelar</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Estadísticas editables */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sí contestó</p>
                                    <p className="text-3xl font-black text-(--theme-500)">{llamadasExitosas}</p>
                                    <p className="text-xs text-gray-400 mt-1">veces</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">No contestó</p>
                                    <p className="text-3xl font-black text-rose-500">{llamadasFallidas}</p>
                                    <p className="text-xs text-gray-400 mt-1">veces</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Citas</p>
                                    <p className="text-3xl font-black text-(--theme-500)">{actividadesContext.filter(a => a.tipo === 'cita').length}</p>
                                    <p className="text-xs text-gray-400 mt-1">agendadas</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">WhatsApps</p>
                                    <p className="text-3xl font-black text-green-500">{actividadesContext.filter(a => a.tipo === 'whatsapp').length}</p>
                                    <p className="text-xs text-gray-400 mt-1">enviados</p>
                                </div>
                            </div>

                            {/* Próxima cita */}
                            {proximaCita && (
                                <div className="bg-(--theme-50) border border-(--theme-200) rounded-xl p-4 flex items-center gap-3 shadow-sm">
                                    <Calendar className="w-8 h-8 text-(--theme-500) shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-(--theme-500) uppercase tracking-wider">Próxima Reunión</p>
                                        <p className="font-bold text-gray-900">{new Date(proximaCita.fecha).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                        <p className="text-sm text-gray-500">{formatHora(proximaCita.fecha)}</p>
                                    </div>
                                </div>
                            )}

                            {/* ==================== ÁRBOL DE LLAMADA ==================== */}
                            <div className="space-y-3">
                                {llamadaFlow === null ? (
                                    <div className="grid grid-cols-3 gap-3">
                                        {/* Llamar */}
                                        <button
                                            onClick={() => setLlamadaFlow({ paso: 'contesto', notas: '', fechaProxima: '', interesado: null })}
                                            className="flex flex-col items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-(--theme-500) rounded-xl p-4 text-gray-700 hover:text-(--theme-600) transition-all shadow-sm font-bold text-sm"
                                        >
                                            <Phone className="w-6 h-6" />
                                            Llamar
                                        </button>
                                        {/* WhatsApp */}
                                        <button
                                            onClick={async () => {
                                                await registrarActividad({ tipo: 'whatsapp', resultado: 'enviado', notas: 'Mensaje de WhatsApp enviado' });
                                            }}
                                            className="flex flex-col items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-green-500 rounded-xl p-4 text-gray-700 hover:text-green-600 transition-all shadow-sm font-bold text-sm"
                                        >
                                            <MessageSquare className="w-6 h-6" />
                                            WhatsApp
                                        </button>
                                        {/* Agendar reunión */}
                                        <button
                                            onClick={() => navigate(`/${rolePath}/calendario`, { state: { prospecto: prospectoSeleccionado } })}
                                            className="flex flex-col items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-(--theme-500) rounded-xl p-4 text-gray-700 hover:text-(--theme-600) transition-all shadow-sm font-bold text-sm text-center leading-tight"
                                        >
                                            <Calendar className="w-6 h-6" />
                                            Agendar Reunión
                                        </button>
                                    </div>
                                ) : (
                                    /* ===== FLUJO DE LLAMADA ===== */
                                    <div className="bg-(--theme-50) border-2 border-(--theme-200) rounded-xl p-5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-(--theme-700) flex items-center gap-2"><Phone className="w-4 h-4" /> Registrando llamada...</span>
                                            <button onClick={() => setLlamadaFlow(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-white/60">✕ Cancelar</button>
                                        </div>

                                        {/* Paso 1: ¿Contestó? */}
                                        {llamadaFlow.paso === 'contesto' && (
                                            <div className="space-y-3">
                                                <p className="font-semibold text-gray-800">¿Contestó la llamada?</p>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => setLlamadaFlow(f => ({ ...f, paso: 'opciones_contesto', contesto: true }))}
                                                        className="flex-1 py-2.5 bg-(--theme-500) text-white rounded-lg font-bold hover:bg-(--theme-600) transition-colors"
                                                    >✓ Sí, contestó</button>
                                                    <button
                                                        onClick={async () => {
                                                            // Registrar llamada fallida y sugerir agendar reintento
                                                            await registrarActividad({ tipo: 'llamada', resultado: 'fallido', notas: 'No contestó' });
                                                            const hoy = new Date();
                                                            hoy.setDate(hoy.getDate() + 1);
                                                            const defaultDate = hoy.toISOString().slice(0, 16);
                                                            setLlamadaFlow({ paso: 'reintento', notas: '', fechaProxima: defaultDate });
                                                        }}
                                                        className="flex-1 py-2.5 bg-rose-500 text-white rounded-lg font-bold hover:bg-rose-600 transition-colors"
                                                    >✗ No contestó</button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Paso 2: Opciones al contestar */}
                                        {llamadaFlow.paso === 'opciones_contesto' && (
                                            <div className="space-y-3">
                                                <p className="font-semibold text-gray-800">¿Cuál fue el resultado de la llamada?</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={async () => {
                                                            await registrarActividad({ tipo: 'llamada', resultado: 'exitoso', notas: 'Agendó reunión' });
                                                            setLlamadaFlow(null);
                                                            navigate(`/${rolePath}/calendario`, { state: { prospecto: prospectoSeleccionado } });
                                                        }}
                                                        className="py-2.5 bg-(--theme-500) text-white rounded-lg font-bold hover:bg-(--theme-600) transition-colors text-sm"
                                                    >📅 Agendó reunión</button>

                                                    <button
                                                        onClick={() => {
                                                            const hoy = new Date();
                                                            hoy.setDate(hoy.getDate() + 3);
                                                            const defaultDate = hoy.toISOString().slice(0, 16);
                                                            setLlamadaFlow(f => ({ ...f, paso: 'llamarDespues', interesado: true, fechaProxima: defaultDate }));
                                                        }}
                                                        className="py-2.5 bg-(--theme-500) text-white rounded-lg font-bold hover:bg-(--theme-600) transition-colors text-sm"
                                                    >📞 Llamar después</button>

                                                    <button
                                                        onClick={() => setLlamadaFlow(f => ({ ...f, paso: 'whatsapp' }))}
                                                        className="py-2.5 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors text-sm"
                                                    >💬 WhatsApp o Correo</button>

                                                    <button
                                                        onClick={() => setLlamadaFlow(f => ({ ...f, paso: 'sin_interes' }))}
                                                        className="py-2.5 bg-gray-400 text-white rounded-lg font-bold hover:bg-gray-500 transition-colors text-sm"
                                                    >✗ Sin interés</button>
                                                </div>
                                            </div>
                                        )}
                                        {/* 2b: No contestó — programar reintento */}
                                        {llamadaFlow.paso === 'reintento' && (
                                            <div className="space-y-3">
                                                <p className="font-semibold text-rose-700">📵 No contestó — ¿Cuándo reintentas?</p>
                                                <TimeWheelPicker
                                                    value={llamadaFlow.fechaProxima}
                                                    onChange={val => setLlamadaFlow(f => ({ ...f, fechaProxima: val }))}
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const pidLocal = prospectoSeleccionado.id || prospectoSeleccionado._id;
                                                                if (llamadaFlow.fechaProxima) {
                                                                    await axios.put(`${API_URL}/api/${rolePath}/prospectos/${pidLocal}`, {
                                                                        proximaLlamada: llamadaFlow.fechaProxima
                                                                    }, { headers: getAuthHeaders() });
                                                                }
                                                                toast.success('Reintento programado');
                                                                setLlamadaFlow(null);
                                                                const res = await axios.get(`${API_URL}/api/${rolePath}/prospectos`, { headers: getAuthHeaders() });
                                                                const updated = res.data.find(p => p.id === pidLocal || p._id === pidLocal);
                                                                if (updated) { setProspectoSeleccionado(updated); setProspectos(res.data); }
                                                            } catch { toast.error('Error al programar reintento'); }
                                                        }}
                                                        className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700"
                                                    >📅 Programar reintento</button>
                                                    <button
                                                        onClick={() => setLlamadaFlow(null)}
                                                        className="px-4 py-2 border border-slate-200 text-gray-600 rounded-lg hover:bg-slate-50 text-sm"
                                                    >Sin fecha</button>
                                                </div>
                                            </div>
                                        )}

                                        {/* 3b: WhatsApp o Correo */}
                                        {llamadaFlow.paso === 'whatsapp' && (
                                            <div className="space-y-3">
                                                <p className="font-semibold text-green-700">💬 Añadir nota para WhatsApp/Correo</p>
                                                <textarea
                                                    rows={2}
                                                    value={llamadaFlow.notas || ''}
                                                    onChange={e => setLlamadaFlow(f => ({ ...f, notas: e.target.value }))}
                                                    placeholder="Ej: Enviar brochure PDF..."
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400"
                                                />
                                                <button
                                                    onClick={async () => {
                                                        const notaFinal = llamadaFlow.notas ? `Prefiere atención por WhatsApp o correo - ${llamadaFlow.notas}` : 'Prefiere atención por WhatsApp o correo';
                                                        await registrarActividad({ tipo: 'llamada', resultado: 'exitoso', notas: notaFinal });
                                                        setLlamadaFlow(null);
                                                        toast('Registrado: Prefiere WhatsApp/Correo', { icon: '💬' });
                                                    }}
                                                    className="w-full py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
                                                >✓ Guardar interacción</button>
                                            </div>
                                        )}

                                        {/* 3c: Sin Interés */}
                                        {llamadaFlow.paso === 'sin_interes' && (
                                            <div className="space-y-3">
                                                <p className="font-semibold text-gray-700">✗ Motivo de falta de interés</p>
                                                <textarea
                                                    rows={2}
                                                    value={llamadaFlow.notas || ''}
                                                    onChange={e => setLlamadaFlow(f => ({ ...f, notas: e.target.value }))}
                                                    placeholder="Ej: Dice que es muy caro, ya tiene proveedor..."
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400"
                                                />
                                                <button
                                                    onClick={async () => {
                                                        const notaFinal = llamadaFlow.notas ? `Sin interés - ${llamadaFlow.notas}` : 'Contestó, sin interés';
                                                        await registrarActividad({ tipo: 'llamada', resultado: 'exitoso', notas: notaFinal });
                                                        setLlamadaFlow(null);
                                                        toast('Sin interés — considera descartarlo', { icon: '💡' });
                                                    }}
                                                    className="w-full py-2 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600"
                                                >✓ Guardar y cerrar</button>
                                            </div>
                                        )}

                                        {/* 3d: Llamar después — marcar fecha */}
                                        {llamadaFlow.paso === 'llamarDespues' && (
                                            <div className="space-y-3">
                                                <p className="font-semibold text-(--theme-700)">📅 ¿Cuándo le llamamos?</p>
                                                <TimeWheelPicker
                                                    value={llamadaFlow.fechaProxima}
                                                    onChange={val => setLlamadaFlow(f => ({ ...f, fechaProxima: val }))}
                                                />
                                                <textarea
                                                    rows={2}
                                                    value={llamadaFlow.notas || ''}
                                                    onChange={e => setLlamadaFlow(f => ({ ...f, notas: e.target.value }))}
                                                    placeholder="Notas de la llamada..."
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-(--theme-400)"
                                                />
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const notasFin = llamadaFlow.notas || 'Interesado, llamar después';
                                                            const pidLocal = prospectoSeleccionado.id || prospectoSeleccionado._id;

                                                            // 1. Registrar Actividad (usa el helper que auto-promueve la etapa)
                                                            await registrarActividad({
                                                                tipo: 'llamada',
                                                                resultado: 'exitoso',
                                                                notas: notasFin
                                                            });

                                                            if (llamadaFlow.fechaProxima) {
                                                                // 2. Crear Tarea de seguimiento
                                                                await axios.post(`${API_URL}/api/tareas`, {
                                                                    titulo: `Llamada de seguimiento: ${prospectoSeleccionado.nombres}`,
                                                                    descripcion: notasFin,
                                                                    cliente: pidLocal,
                                                                    fechaLimite: llamadaFlow.fechaProxima,
                                                                    prioridad: 'media'
                                                                }, { headers: getAuthHeaders() });

                                                                // 3. Actualizar solo proximaLlamada (ruta simple, no requiere nombres/telefono)
                                                                await axios.put(`${API_URL}/api/${rolePath}/prospectos/${pidLocal}`, {
                                                                    proximaLlamada: llamadaFlow.fechaProxima
                                                                }, { headers: getAuthHeaders() });
                                                            }

                                                            toast.success('Seguimiento guardado correctamente');
                                                            setLlamadaFlow(null);
                                                        } catch (err) {
                                                            console.error(err);
                                                            toast.error('Error al guardar el seguimiento completo');
                                                        }
                                                    }}
                                                    className="w-full py-2 bg-(--theme-600) text-white rounded-lg font-bold hover:bg-(--theme-700)"
                                                >✓ Guardar seguimiento</button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ========= CUADRO DE NOTAS EDITABLE ========= */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notas del Prospecto</p>
                                        <button
                                            onClick={handleGuardarNotasRapidas}
                                            disabled={loadingNotas}
                                            className="text-[10px] bg-(--theme-600) text-white px-2 py-1 rounded font-bold hover:bg-(--theme-700) transition-colors disabled:opacity-50"
                                        >
                                            {loadingNotas ? 'Guardando...' : '✓ Guardar'}
                                        </button>
                                    </div>
                                    <textarea
                                        value={notasRapidas}
                                        onChange={(e) => setNotasRapidas(e.target.value)}
                                        placeholder="Escribe notas importantes aquí..."
                                        className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent outline-none min-h-[100px] resize-none scrollbar-hide"
                                    />
                                </div>

                                {/* Acciones de cierre (acordeón para evitar missclick) */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => setAcordeonCierreAbierto(v => !v)}
                                        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-semibold text-gray-600"
                                    >
                                        <span className="flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                            Acciones de cierre
                                        </span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-400 transition-transform ${acordeonCierreAbierto ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                    </button>
                                    {acordeonCierreAbierto && (
                                        <div className="p-3 bg-white border-t border-slate-100 space-y-2">
                                            <p className="text-xs text-slate-400 text-center mb-2">Estas acciones son irreversibles. Confirma antes de continuar.</p>
                                            <button
                                                onClick={() => setModalPasarClienteAbierto(true)}
                                                className="w-full flex items-center justify-center gap-2 bg-(--theme-600) hover:bg-(--theme-700) text-white rounded-lg py-2 font-bold text-sm transition-colors"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Pasar a cliente
                                            </button>
                                            <button
                                                onClick={() => setModalDescartarAbierto(true)}
                                                className="w-full flex items-center justify-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg py-2 font-bold text-sm transition-all"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Descartar prospecto
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ===================== COLUMNA DERECHA: HISTORIAL ===================== */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden sticky top-6" style={{ height: 'calc(100vh - 8rem)' }}>
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-xl flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 uppercase tracking-wider text-sm">Historial de interacciones</h3>
                                <span className="text-xs bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 font-semibold">{actividadesContext.length}</span>
                            </div>
                            <div className="p-4 border-b border-slate-100 bg-white space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Registrar en mural</p>
                                <div className="flex gap-2">
                                    <textarea
                                        value={muralTexto}
                                        onChange={(e) => setMuralTexto(e.target.value)}
                                        placeholder="Escribe una interacción rápida..."
                                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-(--theme-400) focus:border-transparent outline-none"
                                        rows={2}
                                    />
                                    <button
                                        onClick={registrarEnMural}
                                        disabled={guardandoMural || !muralTexto.trim()}
                                        className="self-end px-3 py-2 bg-(--theme-600) text-white rounded-lg text-xs font-bold hover:bg-(--theme-700) disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {guardandoMural ? 'Guardando...' : 'Registrar'}
                                    </button>
                                </div>
                            </div>
                            <div
                                className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide"
                                style={{ minHeight: 0 }}
                            >
                                {loadingContext ? (
                                    <div className="flex justify-center items-center h-32">
                                        <RefreshCw className="w-8 h-8 text-(--theme-500) animate-spin" />
                                    </div>
                                ) : actividadesContext.length === 0 ? (
                                    <div className="text-center text-gray-400 mt-10">
                                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">Sin interacciones registradas aún.</p>
                                    </div>
                                ) : (
                                    [...actividadesContext].reverse().map((act, index) => {
                                        const meta = getActIcon(act);
                                        return (
                                            <div key={act.id || index} className="flex gap-3">
                                                {/* Ícono */}
                                                <div className={`w-9 h-9 rounded-full ${meta.color} flex items-center justify-center text-lg shrink-0 shadow-sm`}>
                                                    <span>{meta.icon}</span>
                                                </div>
                                                {/* Contenido */}
                                                <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="font-semibold text-gray-900 text-sm">{meta.label}</p>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <span className="text-xs text-gray-400 whitespace-nowrap">{formatHora(act.fecha)}</span>
                                                            <button
                                                                onClick={() => handleDeleteActividadContext(act.id)}
                                                                title="Eliminar actividad"
                                                                className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {new Date(act.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        {act.vendedorNombre && <> · {act.vendedorNombre}</>}
                                                    </p>
                                                    {getResultadoTexto(act) && (
                                                        <p className="text-xs font-medium text-gray-600 mt-1">{getResultadoTexto(act)}</p>
                                                    )}
                                                    {act.notas && (
                                                        <p className="text-xs text-gray-500 mt-1.5 italic bg-white px-2 py-1.5 rounded-lg border border-slate-100">
                                                            "{act.notas}"
                                                        </p>
                                                    )}
                                                    {act.fechaCita && (
                                                        <p className="text-xs text-(--theme-600) mt-1.5 font-medium">
                                                            📅 {new Date(act.fechaCita).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {renderModales()}
            </div>
        );
    }






    // VISTA PRINCIPAL (LISTA DE PROSPECTOS)
    return (
        <div className="min-h-screen p-6 bg-slate-50">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Seguimiento de Prospectos</h1>
                        <p className="text-gray-500 mt-1">
                            Selecciona un prospecto para ver su ficha y registrar interacciones
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={handleExportCsv}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-(--theme-300) text-(--theme-700) rounded-lg hover:bg-(--theme-50) transition-colors font-medium text-sm"
                            title="Exportar lista actual a CSV"
                        >
                            <Upload className="w-4 h-4" />
                            Exportar CSV
                        </button>
                        <button
                            onClick={() => setIsImportModalAbierto(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors font-medium text-sm"
                            title="Importar prospectos desde CSV"
                        >
                            <Download className="w-4 h-4" />
                            Importar CSV
                        </button>
                        <button
                            onClick={() => setModalCrearAbierto(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-(--theme-600) text-white rounded-lg hover:bg-(--theme-700) transition-colors font-medium"
                        >
                            <UserPlus className="w-5 h-5" />
                            Crear prospecto
                        </button>
                    </div>
                </div>

                {/* Buscador + Filtros 30/70 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-[30%_1fr] gap-4 items-center">
                        {/* 30% Búsqueda */}
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar prospectos..."
                                value={busquedaProspecto}
                                onChange={(e) => setBusquedaProspecto(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-(--theme-500) focus:border-(--theme-500) bg-slate-50 text-sm h-[42px]"
                                title="Buscar por nombre, empresa, correo o teléfono"
                            />
                        </div>
                        {/* 70% Filtros */}
                        <div className="flex flex-wrap gap-2 items-center w-full">
                            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                            {/* Filtros rápidos por contacto */}
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { value: 'todos', label: 'Todos' },
                                    { value: 'en_contacto', label: '✅ En contacto' },
                                    { value: 'sin_respuesta', label: '📵 Sin respuesta' },
                                    { value: 'no_contactado', label: '🔇 No contactado' },
                                    { value: 'con_cita', label: '📅 Con cita' },
                                ].map(btn => (
                                    <button
                                        key={btn.value}
                                        onClick={() => setFiltroEtapa(btn.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                                            filtroEtapa === btn.value
                                                ? 'bg-(--theme-600) text-white border-(--theme-600) shadow-sm'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-(--theme-400) hover:text-(--theme-700)'
                                        }`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                            {/* Recordatorio pendiente */}
                            <button
                                onClick={() => setFiltroRecordatorio(v => !v)}
                                className={`flex items-center justify-center w-8 h-8 rounded-lg border text-sm transition-all ${filtroRecordatorio
                                    ? 'bg-(--theme-50) border-(--theme-400) text-(--theme-700)'
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                                    }`}
                                title="Solo con recordatorio de llamada"
                            >
                                <Bell className="w-3.5 h-3.5" />
                            </button>
                            {/* Reset filtros */}
                            {(filtroEtapa !== 'todos' || filtroRecordatorio || busquedaProspecto) && (
                                <button
                                    onClick={() => { setFiltroEtapa('todos'); setFiltroRecordatorio(false); setBusquedaProspecto(''); }}
                                    className="flex items-center justify-center w-8 h-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                                    title="Limpiar filtros"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Contador de resultados */}
                    <p className="text-xs text-slate-400 mt-2">
                        Mostrando <span className="font-semibold text-slate-600">{prospectosFiltrados.length}</span> de <span className="font-semibold text-slate-600">{prospectos.length}</span> prospectos
                    </p>
                </div>

                {/* Lista de Prospectos (Tarjetas o Tabla simplificada) */}
                {prospectosFiltrados.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                        <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No se encontraron prospectos.</p>
                        <p className="text-gray-400 text-sm mt-1">Intenta con otra búsqueda o crea uno nuevo.</p>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-100/70 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                                        <th className="px-4 py-3 text-left font-semibold">Empresa</th>
                                        <th className="px-4 py-3 text-left font-semibold">Contacto</th>
                                        <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider">Etapa</th>
                                        <th className="px-4 py-3 text-left font-semibold">Última interacción</th>
                                        <th className="px-4 py-3 text-left font-semibold">Recordatorio</th>
                                        <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {prospectosFiltrados.map((p) => (
                                        <tr key={p._id || p.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => handleSeleccionarProspecto(p)}>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <p className="font-medium text-gray-900">
                                                        {p.nombres} {p.apellidoPaterno}
                                                    </p>
                                                    <div className="flex items-center gap-0.5 text-yellow-500 scale-75 origin-left mt-0.5">
                                                        {[1, 2, 3, 4, 5].map((value) => (
                                                            <Star key={value} className={`w-3.5 h-3.5 ${p.interes >= value ? 'fill-yellow-400' : 'fill-slate-100 text-slate-300'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 text-sm">{p.empresa || '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="space-y-0.5">
                                                    {p.telefono ? (
                                                        <p className="flex items-center gap-1 text-gray-700 text-sm font-medium">
                                                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                            {p.telefono}
                                                        </p>
                                                    ) : p.correo ? (
                                                        <p className="flex items-center gap-1 text-gray-500 text-sm">
                                                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                            <span>{p.correo}</span>
                                                        </p>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Sin contacto</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {p.etapaEmbudo === 'prospecto_nuevo' && !p.ultimaActTipo ? (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                                                        No contactado
                                                    </span>
                                                ) : (
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getEtapaColor(p.etapaEmbudo)}`}>
                                                        {getEtapaLabel(p.etapaEmbudo)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 max-w-[200px]">
                                                {p.ultimaActTipo ? (
                                                    <div className="flex items-start gap-1.5">
                                                        <div className="mt-0.5 shrink-0">
                                                            {p.ultimaActTipo === 'llamada' && <Phone className="w-3 h-3 text-(--theme-500)" />}
                                                            {p.ultimaActTipo === 'whatsapp' && <MessageSquare className="w-3 h-3 text-green-500" />}
                                                            {p.ultimaActTipo === 'correo' && <Mail className="w-3 h-3 text-purple-500" />}
                                                            {p.ultimaActTipo === 'cita' && <Calendar className="w-3 h-3 text-(--theme-500)" />}
                                                            {!['llamada','whatsapp','correo','cita'].includes(p.ultimaActTipo) && <Clock className="w-3 h-3 text-slate-400" />}
                                                        </div>
                                                        <p className="text-[11px] text-slate-600 leading-snug" title={p.ultimaActNotas || ''}>
                                                            {p.ultimaActNotas
                                                                ? (p.ultimaActNotas.length > 50 ? p.ultimaActNotas.slice(0, 50) + '…' : p.ultimaActNotas)
                                                                : <span className="italic text-slate-400">{getTipoLabel(p.ultimaActTipo)}</span>}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300 italic">Sin interacciones</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {p.proximaLlamada ? (() => {
                                                    const esVencido = new Date(p.proximaLlamada) < new Date();
                                                    return (
                                                        <div className={`flex items-center gap-1.5 ${esVencido ? 'text-red-600' : 'text-(--theme-600)'}`}>
                                                            <div className={`w-2 h-2 rounded-full animate-pulse ${esVencido ? 'bg-red-500' : 'bg-(--theme-500)'}`}></div>
                                                            <span className="text-xs font-semibold">
                                                                {new Date(p.proximaLlamada).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                                                {esVencido && ' ⚠'}
                                                            </span>
                                                            <Phone className="w-3 h-3" />
                                                        </div>
                                                    );
                                                })() : (
                                                    <span className="text-xs text-slate-400 italic">Sin pendiente</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-3">
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
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            {renderModales()}
        </div>
    );
};

export default ProspectorSeguimiento;
