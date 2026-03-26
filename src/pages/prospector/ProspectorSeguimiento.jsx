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
    Send,
    Download,
    Upload,
    Trash2,
    AlertCircle,
    FileText,
    X,
    Building2,
    MapPin,
    Globe
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getToken } from '../../utils/authUtils';
import HistorialInteracciones from '../../components/HistorialInteracciones';
import ProspectoDetalle from '../../components/ProspectoDetalle';
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
        // Estado para el flujo de llamada inline
                    
    
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

    const handleSeleccionarProspecto = (p) => {
        setProspectoSeleccionado(p);
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


    
    // Shared Modals Render Function
    const renderModales = () => (
        <>
            {/* Modal Crear Prospecto */}
            {modalCrearAbierto && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <UserPlus className="w-6 h-6 text-(--theme-600)" />
                                Nuevo prospecto
                            </h2>
                            <button onClick={resetImportModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto scrollbar-hide">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Sección: Datos Personales */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Información Personal</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Nombres *</label>
                                            <input
                                                type="text"
                                                value={formCrear.nombres}
                                                onChange={(e) => setFormCrear((f) => ({ ...f, nombres: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-500) transition-all outline-none"
                                                placeholder="Ej: Juan"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Apellido Paterno</label>
                                                <input
                                                    type="text"
                                                    value={formCrear.apellidoPaterno}
                                                    onChange={(e) => setFormCrear((f) => ({ ...f, apellidoPaterno: e.target.value }))}
                                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-500) transition-all outline-none"
                                                    placeholder="García"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Apellido Materno</label>
                                                <input
                                                    type="text"
                                                    value={formCrear.apellidoMaterno}
                                                    onChange={(e) => setFormCrear((f) => ({ ...f, apellidoMaterno: e.target.value }))}
                                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-500) transition-all outline-none"
                                                    placeholder="López"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sección: Contacto */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Contacto y Empresa</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Teléfonos *</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormCrear((f) => ({ ...f, telefonos: [...f.telefonos, ''] }))}
                                                    className="flex items-center gap-1 text-xs text-(--theme-600) hover:text-(--theme-700) font-bold"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Agregar
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {formCrear.telefonos.map((tel, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                                        <Phone className="w-3.5 h-3.5 text-slate-400 ml-1" />
                                                        <input
                                                            type="tel"
                                                            value={tel}
                                                            onChange={(e) => setFormCrear((f) => { const t = [...f.telefonos]; t[idx] = e.target.value; return { ...f, telefonos: t }; })}
                                                            className="flex-1 bg-transparent border-0 focus:ring-0 text-sm py-1"
                                                            placeholder="55 1234 5678"
                                                        />
                                                        {formCrear.telefonos.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormCrear((f) => ({ ...f, telefonos: f.telefonos.filter((_, i) => i !== idx) }))}
                                                                className="text-red-400 hover:text-red-600 p-1"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Correo Electrónico</label>
                                            <input
                                                type="email"
                                                value={formCrear.correo}
                                                onChange={(e) => setFormCrear((f) => ({ ...f, correo: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-500) transition-all outline-none"
                                                placeholder="correo@ejemplo.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Sección: Empresa y Web */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Detalles de Empresa</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Empresa</label>
                                            <input
                                                type="text"
                                                value={formCrear.empresa}
                                                onChange={(e) => setFormCrear((f) => ({ ...f, empresa: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-500) transition-all outline-none"
                                                placeholder="Nombre de la empresa"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Sitio Web</label>
                                            <input
                                                type="url"
                                                value={formCrear.sitioWeb}
                                                onChange={(e) => setFormCrear((f) => ({ ...f, sitioWeb: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-500) transition-all outline-none"
                                                placeholder="https://empresa.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Ubicación</label>
                                            <input
                                                type="text"
                                                value={formCrear.ubicacion}
                                                onChange={(e) => setFormCrear((f) => ({ ...f, ubicacion: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-500) transition-all outline-none"
                                                placeholder="Ciudad, Estado"
                                            />
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                        <div className="flex gap-3 p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                            <button
                                onClick={() => {
                                    setModalCrearAbierto(false);
                                    setFormCrear({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefonos: [''], correo: '', empresa: '', sitioWeb: '', ubicacion: '', notas: '' });
                                }}
                                className="px-6 py-2.5 border border-slate-200 text-gray-700 rounded-lg text-sm hover:bg-white font-bold transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCrearProspecto}
                                disabled={loadingCrear}
                                className="flex-1 px-6 py-2.5 bg-(--theme-600) text-white rounded-lg text-sm hover:bg-(--theme-700) font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all shadow-(--theme-500)/20"
                            >
                                {loadingCrear ? 'Creando...' : 'Crear Prospecto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Editar Prospecto */}
            {modalEditarAbierto && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Edit2 className="w-6 h-6 text-(--theme-600)" />
                                Editar prospecto
                            </h2>
                            <button onClick={() => setModalEditarAbierto(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto scrollbar-hide">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Sección: Datos Personales */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Información Personal</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Nombres *</label>
                                            <input
                                                type="text"
                                                value={prospectoAEditar.nombres}
                                                onChange={(e) => setProspectoAEditar((f) => ({ ...f, nombres: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-500) transition-all outline-none"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Apellido Paterno</label>
                                                <input
                                                    type="text"
                                                    value={prospectoAEditar.apellidoPaterno}
                                                    onChange={(e) => setProspectoAEditar((f) => ({ ...f, apellidoPaterno: e.target.value }))}
                                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-500) transition-all outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Apellido Materno</label>
                                                <input
                                                    type="text"
                                                    value={prospectoAEditar.apellidoMaterno}
                                                    onChange={(e) => setProspectoAEditar((f) => ({ ...f, apellidoMaterno: e.target.value }))}
                                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-500) transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sección: Contacto */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Contacto y Correo</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Teléfonos *</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setProspectoAEditar((f) => ({ ...f, telefonos: [...(f.telefonos || ['']), ''] }))}
                                                    className="flex items-center gap-1 text-xs text-(--theme-600) hover:text-(--theme-700) font-bold"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Agregar
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {(prospectoAEditar.telefonos || ['']).map((tel, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                                        <Phone className="w-3.5 h-3.5 text-slate-400 ml-1" />
                                                        <input
                                                            type="tel"
                                                            value={tel}
                                                            onChange={(e) => setProspectoAEditar((f) => { const t = [...(f.telefonos || [''])]; t[idx] = e.target.value; return { ...f, telefonos: t }; })}
                                                            className="flex-1 bg-transparent border-0 focus:ring-0 text-sm py-1"
                                                        />
                                                        {(prospectoAEditar.telefonos || ['']).length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setProspectoAEditar((f) => ({ ...f, telefonos: (f.telefonos || ['']).filter((_, i) => i !== idx) }))}
                                                                className="text-red-400 hover:text-red-600 p-1"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Correo Electrónico</label>
                                            <input
                                                type="email"
                                                value={prospectoAEditar.correo}
                                                onChange={(e) => setProspectoAEditar((f) => ({ ...f, correo: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-500) transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Sección: Empresa */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Detalles de Empresa</h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Empresa</label>
                                                <input
                                                    type="text"
                                                    value={prospectoAEditar.empresa}
                                                    onChange={(e) => setProspectoAEditar((f) => ({ ...f, empresa: e.target.value }))}
                                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-500) transition-all outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Sitio Web</label>
                                                <input
                                                    type="url"
                                                    value={prospectoAEditar.sitioWeb || ''}
                                                    onChange={(e) => setProspectoAEditar((f) => ({ ...f, sitioWeb: e.target.value }))}
                                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-500) transition-all outline-none"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Ubicación</label>
                                            <input
                                                type="text"
                                                value={prospectoAEditar.ubicacion || ''}
                                                onChange={(e) => setProspectoAEditar((f) => ({ ...f, ubicacion: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-500) transition-all outline-none"
                                                placeholder="Ciudad, Estado"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Etapa del Embudo</label>
                                            <select
                                                value={prospectoAEditar.etapaEmbudo}
                                                onChange={(e) => setProspectoAEditar((f) => ({ ...f, etapaEmbudo: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-(--theme-500) outline-none"
                                            >
                                                {Object.entries(ETAPAS_EMBUDO).map(([key, value]) => (
                                                    <option key={key} value={key}>{value.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                        <div className="flex gap-3 p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                            <button
                                onClick={() => setModalEditarAbierto(false)}
                                className="px-6 py-2.5 border border-slate-200 text-gray-700 rounded-lg text-sm hover:bg-white font-bold transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEditarProspecto}
                                disabled={loadingEditar}
                                className="flex-1 px-6 py-2.5 bg-(--theme-600) text-white rounded-lg text-sm hover:bg-(--theme-700) font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all shadow-(--theme-500)/20"
                            >
                                {loadingEditar ? 'Guardando...' : 'Guardar Cambios'}
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

    // VISTA DETALLADA DEL PROSPECTO
    if (prospectoSeleccionado) {
        return (
            <ProspectoDetalle
                prospecto={prospectoSeleccionado}
                rolePath={rolePath}
                onVolver={() => setProspectoSeleccionado(null)}
                onActualizado={cargarDatos}
                abrirModalEditar={abrirModalEditar}
                setModalPasarClienteAbierto={setModalPasarClienteAbierto}
                setModalDescartarAbierto={setModalDescartarAbierto}
            />
        );
    }
// VISTA PRINCIPAL (LISTA DE PROSPECTOS)
    return (
        <div className="min-h-screen p-6 bg-slate-50">
            <div className="max-w-full mx-auto space-y-6">
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
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${filtroEtapa === btn.value
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
                                                            {!['llamada', 'whatsapp', 'correo', 'cita'].includes(p.ultimaActTipo) && <Clock className="w-3 h-3 text-slate-400" />}
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
