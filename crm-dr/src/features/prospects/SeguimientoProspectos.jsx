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
    Zap,
    X,
    Building2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getToken, decodeRole } from '../../utils/authUtils';
import TimeWheelPicker from '../../components/TimeWheelPicker';
import SeguimientoHistorialPanel from './SeguimientoHistorialPanel';

import API_URL from '../../services/api';
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
    if (lines.length < 2) return { data: [], errors: ['El CSV estÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â vacÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Âo o solo tiene encabezados.'] };
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
    { value: 'llamada', label: 'Llamada', icon: Phone, color: 'bg-blue-500' },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-green-500' },
    { value: 'correo', label: 'Correo', icon: Mail, color: 'bg-purple-500' },
    { value: 'cita', label: 'Cita agendada', icon: Calendar, color: 'bg-blue-800' }
];

const RESULTADOS = [
    { value: 'exitoso', label: 'Exitoso', icon: CheckCircle2 },
    { value: 'pendiente', label: 'Pendiente', icon: Clock },
    { value: 'fallido', label: 'No contestÃƒÆ’Ã‚Â³', icon: XCircle }
];

const getTipoLabel = (tipo) => TIPOS_ACTIVIDAD.find(t => t.value === tipo)?.label || tipo;
const getTipoColor = (tipo) => TIPOS_ACTIVIDAD.find(t => t.value === tipo)?.color || 'bg-gray-500';
const getResultadoLabel = (r) => RESULTADOS.find(x => x.value === r)?.label || r;

const ETAPAS_EMBUDO = {
    'prospecto_nuevo': { label: 'Sin contacto', color: 'bg-red-100 text-red-600' },
    'en_contacto': { label: 'En contacto', color: 'bg-blue-100 text-blue-600' },
    'reunion_agendada': { label: 'Cita agendada', color: 'bg-blue-100 text-blue-900' },
    'reunion_realizada': { label: 'Cita realizada', color: 'bg-indigo-100 text-indigo-600' },
    'en_negociacion': { label: 'NegociaciÃƒÆ’Ã‚Â³n', color: 'bg-amber-100 text-amber-600' },
    'venta_ganada': { label: 'Venta ganada', color: 'bg-emerald-100 text-emerald-600' },
    'perdido': { label: 'Perdido', color: 'bg-rose-100 text-rose-600' }
};

const getEtapaLabel = (etapa) => ETAPAS_EMBUDO[etapa]?.label || etapa;
const getEtapaColor = (etapa) => ETAPAS_EMBUDO[etapa]?.color || 'bg-gray-100 text-gray-600';

const SeguimientoContactos = () => {
    const role = decodeRole();
    const rolePath = role === 'closer' ? 'closer' : 'prospector';
    const isDoctorOrAdmin = role === 'doctor' || role === 'admin' || role === 'individual';
    const labelMain = isDoctorOrAdmin ? 'Pacientes' : 'Prospectos';
    const labelSingle = isDoctorOrAdmin ? 'Paciente' : 'Prospecto';

    const [prospectos, setProspectos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usandoMock, setUsandoMock] = useState(false);
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

    // Estado para la ediciÃƒÆ’Ã‚Â³n de prospectos
    const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
    const [prospectoAEditar, setProspectoAEditar] = useState({});
    const [loadingEditar, setLoadingEditar] = useState(false);

    // Estados para modales de conversiÃƒÆ’Ã‚Â³n y descarte
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

    // Estado para el acordeÃƒÆ’Ã‚Â³n de acciones de cierre
    const [acordeonCierreAbierto, setAcordeonCierreAbierto] = useState(false);

    // Estado para ediciÃƒÆ’Ã‚Â³n rÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Âpida de fecha de seguimiento
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
            // Recargar datos y actualizar el panel de detalle si estÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â abierto
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

    // Nuevo: Estados para interacciÃƒÆ’Ã‚Â³n personalizada
    const [notaInteraccion, setNotaInteraccion] = useState('');
    const [registrandoInteraccion, setRegistrandoInteraccion] = useState(false);

    // Nuevo: Estados para Pre-acciones editables
    const [preacciones, setPreacciones] = useState(() => {
        const saved = localStorage.getItem('crm_preacciones');
        return saved ? JSON.parse(saved) : ['Documento enviado', 'Llamada realizada', 'WhatsApp enviado', 'Interesado'];
    });
    const [nuevaPreaccion, setNuevaPreaccion] = useState('');
    const [mostrandoAddPreaccion, setMostrandoAddPreaccion] = useState(false);
    const [modoEdicionPreacciones, setModoEdicionPreacciones] = useState(false);

    useEffect(() => {
        localStorage.setItem('crm_preacciones', JSON.stringify(preacciones));
    }, [preacciones]);

    const handleAddPreaccion = (e) => {
        e.preventDefault();
        if (nuevaPreaccion.trim() && !preacciones.includes(nuevaPreaccion.trim())) {
            setPreacciones([...preacciones, nuevaPreaccion.trim()]);
            setNuevaPreaccion('');
            setMostrandoAddPreaccion(false);
        }
    };

    const handleRemovePreaccion = (tag) => {
        setPreacciones(preacciones.filter(p => p !== tag));
    };

    const handleQuickAction = async (tag) => {
        await registrarActividad({
            tipo: 'personalizado',
            resultado: 'exitoso',
            notas: tag
        });
    };

    const handleGuardarNotasRapidas = async () => {
        if (!prospectoSeleccionado) return;
        setLoadingNotas(true);
        try {
            const pid = prospectoSeleccionado.id || prospectoSeleccionado._id;
            await axios.put(`${API_URL}/api/${rolePath}/prospectos/${pid}/editar`, {
                // Solo enviamos los campos editables mÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Ânimos para no sobreescribir datos enriquecidos
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
            setUsandoMock(false);
        } catch (error) {
            console.error('Error al cargar:', error);
            setUsandoMock(true);
            setProspectos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            await cargarDatos();
            // Si venimos de otra pÃƒÆ’Ã‚Â¡gina con un ID seleccionado
            if (location.state?.selectedId) {
                const res = await axios.get(`${API_URL}/api/${rolePath}/prospectos`, { headers: getAuthHeaders() });
                // eslint-disable-next-line eqeqeq
                const found = res.data.find(p => p.id == location.state.selectedId || p._id == location.state.selectedId);
                if (found) {
                    setProspectoSeleccionado(found);
                    setNotasRapidas(found.notas || '');
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

    // Cargar actividades cuando se selecciona un prospecto
    useEffect(() => {
        if (!prospectoSeleccionado) {
            setActividadesContext([]);
            return;
        }
        const pid = prospectoSeleccionado.id || prospectoSeleccionado._id;
        const cargarActividades = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/${rolePath}/actividades?prospectoId=${pid}`, { headers: getAuthHeaders() });
                setActividadesContext(Array.isArray(res.data) ? res.data : []);
            } catch {
                // Si falla, intentar leer del objeto prospecto directamente
                setActividadesContext(prospectoSeleccionado.actividades || []);
            }
        };
        cargarActividades();
        setNotasRapidas(prospectoSeleccionado.notas || '');
    }, [prospectoSeleccionado?.id, prospectoSeleccionado?._id]);

    // Orden de prioridad de etapas (mÃƒÆ’Ã‚Â¡s avanzadas primero, perdido al fondo)
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

        // BÃƒÆ’Ã‚Âºsqueda...
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
            // RespondiÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â: etapa avanzÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â mÃƒÆ’Ã‚Â¡s allÃƒÆ’Ã‚Â¡ de prospecto_nuevo
            filtrados = filtrados.filter(p => p.etapaEmbudo !== 'prospecto_nuevo');
        } else if (filtroEtapa === 'sin_respuesta') {
            // Intentaron contactar (hay actividades) pero sigue en prospecto_nuevo ? no contestÃƒÆ’Ã‚Â³
            filtrados = filtrados.filter(p => p.etapaEmbudo === 'prospecto_nuevo' && !!p.ultimaActTipo);
        } else if (filtroEtapa === 'no_contactado') {
            // Sin ninguna actividad registrada = nuevo prospecto sin interacciÃƒÆ’Ã‚Â³n
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
                    // Aumentamos 1 dÃƒÆ’Ã‚Â­a a la fechaHasta local para que sea inclusivo el dÃƒÆ’Ã‚Â­a entero
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
                // 'vencido': ya pasÃƒÆ’Ã‚Â­ la fecha. 'futuro': aÃƒÆ’Ã‚Âºn no. Ambos se muestran, vencidos primero.
                return true;
            });
        }

        return filtrados;
    }, [prospectos, busquedaProspecto, filtroEtapa, filtroFecha, fechaDesde, fechaHasta, filtroRecordatorio]).sort((a, b) => {
        // Perdidos siempre al fondo
        const esPerdidoA = a.etapaEmbudo === 'perdido';
        const esPerdidoB = b.etapaEmbudo === 'perdido';
        if (esPerdidoA !== esPerdidoB) return esPerdidoA ? 1 : -1;

        // Con prÃƒÆ’Ã‚Â³xima llamada urgente primero (vencidas aÃƒÆ’Ã‚Âºn antes que futuras)
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

        // Mayor interÃƒÆ’Ã‚Â©s primero
        const interesA = a.interes || 0;
        const interesB = b.interes || 0;
        if (interesB !== interesA) return interesB - interesA;

        // Etapa mÃƒÆ’Ã‚Â¡s avanzada primero
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
        if (!csvPreview || csvPreview.data.length === 0) { toast.error('No hay datos vÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Âlidos para importar.'); return; }
        try {
            setImportando(true);
            const response = await axios.post(`${API_URL}/api/${rolePath}/importar-csv`, { prospectos: csvPreview.data }, { headers: getAuthHeaders() });
            setImportResult(response.data);
            cargarDatos();
            toast.success(`ImportaciÃƒÆ’Ã‚Â³n completada: ${response.data.insertados} nuevos.`);
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
        setNotasRapidas(p.notas || ''); // Inicializar notas rÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Âpidas
        setEditandoFechaSeguimiento(false); // Resetear ediciÃƒÆ’Ã‚Â³n inline de fecha
        setAcordeonCierreAbierto(false);    // Colapsar acordeÃƒÆ’Ã‚Â³n de cierre
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
        if (!window.confirm('ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂEliminar esta actividad? Esta acciÃƒÆ’Ã‚Â³n no se puede deshacer.')) return;
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
            toast.success('InterÃƒÆ’Ã‚Â©s actualizado');
            setProspectos(prev => prev.map(p => (p.id === id || p._id === id) ? { ...p, interes: nuevoInteres } : p));
            if (prospectoSeleccionado && (prospectoSeleccionado.id === id || prospectoSeleccionado._id === id)) {
                setProspectoSeleccionado({ ...prospectoSeleccionado, interes: nuevoInteres });
            }
        } catch (error) {
            toast.error('Error al actualizar interÃƒÆ’Ã‚Â©s');
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
                    <RefreshCw className="w-12 h-12 text-blue-800 animate-spin mx-auto mb-4" />
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
                                        placeholder="GarcÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Âa"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-medium text-gray-700">TelÃƒÆ’Ã‚Â©fonos</label>
                                        <button
                                            type="button"
                                            onClick={() => setFormCrear((f) => ({ ...f, telefonos: [...f.telefonos, ''] }))}
                                            className="flex items-center gap-1 text-xs text-blue-900 hover:text-blue-950 font-medium"
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
                                    <label className="block text-xs font-medium text-gray-700 mb-1">UbicaciÃƒÆ’Ã‚Â³n</label>
                                    <input
                                        type="text"
                                        value={formCrear.ubicacion}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, ubicacion: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm"
                                        placeholder="Ciudad, Estado, PaÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Âs"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                                    <textarea
                                        rows={3}
                                        value={formCrear.notas}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, notas: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm resize-none"
                                        placeholder="InformaciÃƒÆ’Ã‚Â³n relevante sobre el primer contacto..."
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
                                className="flex-1 px-3 py-2 bg-blue-900 text-white rounded text-sm hover:bg-blue-950 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                            <h2 className="text-lg font-bold text-gray-900">?? Editar prospecto</h2>
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
                                        <label className="block text-xs font-medium text-gray-700">TelÃƒÆ’Ã‚Â©fonos</label>
                                        <button
                                            type="button"
                                            onClick={() => setProspectoAEditar((f) => ({ ...f, telefonos: [...(f.telefonos || ['']), ''] }))}
                                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
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
                                    <label className="block text-xs font-medium text-gray-700 mb-1">UbicaciÃƒÆ’Ã‚Â³n</label>
                                    <input
                                        type="text"
                                        value={prospectoAEditar.ubicacion || ''}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, ubicacion: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm"
                                        placeholder="Ciudad, Estado, PaÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Âs"
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
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Recordatorio (PrÃƒÆ’Ã‚Â³xima Llamada)</label>
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
                                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <div className="p-4 border-b border-slate-100 bg-emerald-50">
                            <h2 className="text-lg font-bold text-emerald-900">?? Pasar a cliente</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-gray-600 text-sm">
                                ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂConfirmas que <span className="font-semibold">{prospectoSeleccionado?.nombres} {prospectoSeleccionado?.apellidoPaterno}</span> se convierte en cliente?
                            </p>
                            <textarea
                                rows={2}
                                value={notaConversion}
                                onChange={e => setNotaConversion(e.target.value)}
                                placeholder="Notas (opcional)..."
                                className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400"
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
                                className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingConversion ? 'Procesando...' : '? Confirmar'}
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
                            <h2 className="text-lg font-bold text-red-900">??? Descartar prospecto</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-gray-600 text-sm">
                                ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂDescartar a <span className="font-semibold">{prospectoSeleccionado?.nombres} {prospectoSeleccionado?.apellidoPaterno}</span>? Se registrarÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â en el historial.
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
                                {loadingConversion ? 'Procesando...' : '? Descartar'}
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
                                ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂEstÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Âs seguro de eliminar a <strong>{prospectoAEliminar.nombres} {prospectoAEliminar.apellidoPaterno}</strong>?
                                Esta acciÃƒÆ’Ã‚Â³n no se puede deshacer.
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
                                {eliminando ? 'Eliminando...' : 'SÃƒÆ’Ã‚Â­, eliminar'}
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
                                        className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-700 hover:bg-blue-50/30 transition-all"
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileChange({ target: { files: [f] } }); }}
                                    >
                                        <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
                                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        {csvFile ? (
                                            <p className="font-semibold text-slate-700 text-sm">{csvFile.name}</p>
                                        ) : (
                                            <p className="text-slate-500 text-sm">Arrastra un CSV aquÃƒÆ’Ã‚Â­ o haz clic para seleccionar</p>
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
                                            className="flex-1 px-3 py-2 bg-blue-900 text-white rounded text-sm hover:bg-blue-950 font-medium disabled:opacity-50"
                                        >
                                            {importando ? 'Importando...' : `Importar ${csvPreview?.data.length || 0} prospectos`}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
                                        <p className="font-semibold">? ImportaciÃƒÆ’Ã‚Â³n completada</p>
                                        <p>Insertados: {importResult.insertados} ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Duplicados: {importResult.duplicados} ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Errores: {importResult.errores}</p>
                                    </div>
                                    <button onClick={resetImportModal} className="w-full px-3 py-2 bg-blue-900 text-white rounded text-sm hover:bg-blue-950 font-medium">Cerrar</button>
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
            toast.success('ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂProspecto convertido a cliente!');
            setModalPasarClienteAbierto(false);
            setNotaConversion('');
            setProspectoSeleccionado(null);
            // Redirigir a la pÃƒÆ’Ã‚Â¡gina de clientes
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
            toast('Prospecto descartado', { icon: '???' });
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
                if (act.notas?.includes('WhatsApp')) return { icon: '??', color: 'bg-green-500', label: 'WhatsApp / Correo' };
                if (act.notas?.includes('llamar despuÃƒÆ’Ã‚Â©s')) return { icon: '??', color: 'bg-indigo-500', label: 'Llamar despuÃƒÆ’Ã‚Â©s' };
                if (act.notas?.toLowerCase().includes('sin interÃƒÆ’Ã‚Â©s')) return { icon: '??', color: 'bg-gray-500', label: 'Sin interÃƒÆ’Ã‚Â©s' };
                if (act.notas?.includes('AgendÃƒÆ’Ã‚Â³ reuniÃƒÆ’Ã‚Â³n')) return { icon: '??', color: 'bg-blue-800', label: 'Cita Agendada' };

                if (act.resultado === 'exitoso') return { icon: '??', color: 'bg-emerald-500', label: 'Llamada exitosa' };
                if (act.resultado === 'fallido') return { icon: '??', color: 'bg-rose-500', label: 'Sin respuesta' };
            }

            if (act.tipo === 'cita') {
                const desc = act.descripcion || '';
                if (act.resultado === 'pendiente') return { icon: '??', color: 'bg-blue-500', label: 'Cita Agendada' };
                if (desc.includes('no asistiÃƒÆ’Ã‚Â³') || desc.includes('No asistiÃƒÆ’Ã‚Â³')) return { icon: '?', color: 'bg-red-500', label: desc };
                if (desc.includes('Venta cerrada') || desc.includes('ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂVenta')) return { icon: '??', color: 'bg-green-500', label: desc };
                if (desc.includes('cotizaciÃƒÆ’Ã‚Â³n') || desc.includes('CotizaciÃƒÆ’Ã‚Â³n')) return { icon: '??', color: 'bg-blue-600', label: desc };
                if (desc.includes('otra reuniÃƒÆ’Ã‚Â³n') || desc.includes('Otra reuniÃƒÆ’Ã‚Â³n')) return { icon: '??', color: 'bg-yellow-500', label: desc };
                if (desc.includes('No le interesÃƒÆ’Ã‚Â­') || desc.includes('no le interesÃƒÆ’Ã‚Â­')) return { icon: '??', color: 'bg-gray-500', label: desc };
                return { icon: '??', color: 'bg-blue-500', label: desc || 'ReuniÃƒÆ’Ã‚Â³n' };
            }
            if (act.tipo === 'whatsapp') return { icon: '??', color: 'bg-green-500', label: 'WhatsApp' };
            if (act.tipo === 'personalizado') return { icon: '??', color: 'bg-blue-600', label: 'InteracciÃƒÆ’Ã‚Â³n' };
            if (act.tipo === 'nota') return { icon: '??', color: 'bg-slate-500', label: 'Nota' };
            if (act.tipo === 'cliente') return { icon: '??', color: 'bg-yellow-500', label: 'Convertido a cliente' };
            if (act.tipo === 'descartado') return { icon: '???', color: 'bg-gray-400', label: 'Descartado' };
            return { icon: '??', color: 'bg-slate-400', label: act.tipo || 'InteracciÃƒÆ’Ã‚Â³n' };
        };
        const getResultadoTexto = (act) => {
            if (act.tipo === 'llamada' && act.resultado === 'exitoso') return 'ContestÃƒÆ’Ã‚Â³ ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“';
            if (act.tipo === 'llamada' && act.resultado === 'fallido') return 'No contestÃƒÆ’Ã‚Â³ ÃƒÂ¢Ã…â€œÃ¢â‚¬â€';
            if (act.tipo === 'cita') {
                if (act.resultado === 'pendiente') return 'Cita programada';
                if (act.descripcion) return act.descripcion;
                const mapa = { exitoso: 'ReuniÃƒÆ’Ã‚Â³n realizada', fallido: 'No asistiÃƒÆ’Ã‚Â³ / Cancelada', convertido: 'Venta cerrada' };
                return mapa[act.resultado] || act.resultado;
            }
            if (act.tipo === 'whatsapp') return 'Mensaje enviado';
            if (act.tipo === 'personalizado' || act.tipo === 'nota') return act.notas || 'Sin detalles';
            if (act.resultado) return act.resultado;
            return '';
        };

        // Tarea pendiente: mostrar si hay una prÃƒÆ’Ã‚Â³xima llamada agendada o cita
        const tareaLlamar = prospectoSeleccionado.proximaLlamada ? { fecha: prospectoSeleccionado.proximaLlamada, tipo: 'llamada' } : null;
        const proximaCita = actividadesContext.find(a => a.tipo === 'cita' && a.resultado === 'pendiente' && new Date(a.fechaCita || a.fecha) >= new Date());

        const registrarActividad = async (payload) => {
            try {
                // Promover etapa automÃƒÆ’Ã‚Â¡ticamente si corresponde
                const payloadFinal = { ...payload };
                if (
                    payload.tipo === 'llamada' &&
                    payload.resultado === 'exitoso' &&
                    prospectoSeleccionado.etapaEmbudo === 'prospecto_nuevo'
                ) {
                    payloadFinal.etapaEmbudo = 'en_contacto';
                }

                // Al registrar cualquier llamada, limpiar el seguimiento pendiente
                // (si se agenda nueva fecha, el flujo "Llamar despuÃƒÆ’Ã‚Â©s" la sobreescribe)
                if (payload.tipo === 'llamada' && prospectoSeleccionado.proximaLlamada) {
                    await axios.put(`${API_URL}/api/${rolePath}/prospectos/${pid}`, {
                        proximaLlamada: null
                    }, { headers: getAuthHeaders() });
                }

                await axios.post(`${API_URL}/api/${rolePath}/registrar-actividad`, { clienteId: pid, ...payloadFinal }, { headers: getAuthHeaders() });
                toast.success('InteracciÃƒÆ’Ã‚Â³n registrada');

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

        const handleGuardarInteraccion = async () => {
            if (!notaInteraccion.trim()) {
                toast.error('Escribe una nota para registrar la interacciÃƒÆ’Ã‚Â³n');
                return;
            }
            setRegistrandoInteraccion(true);
            try {
                await registrarActividad({
                    tipo: 'personalizado',
                    resultado: 'exitoso',
                    notas: notaInteraccion
                });
                setNotaInteraccion('');
            } catch (error) {
                console.error(error);
            } finally {
                setRegistrandoInteraccion(false);
            }
        };
        return (
            <div className="flex h-[calc(100vh-6.5rem)] min-h-[700px] bg-slate-100 overflow-hidden rounded-2xl border border-slate-200">

                {/* ============ COLUMNA IZQUIERDA ============ */}
                <div className="flex-1 min-w-0 flex flex-col overflow-y-auto p-5 gap-4">

                    {/* â”€â”€ HEADER ROW â”€â”€ */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm shrink-0 px-4 py-3">
                        <div className="flex items-start gap-2">

                            {/* Avatar + regresar */}
                            <div className="flex flex-col items-center gap-1 shrink-0">
                                <button onClick={() => setProspectoSeleccionado(null)} className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300 transition-colors">
                                    <User className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            {/* Nombre + Estrellas */}
                            <div className="flex flex-col shrink-0">
                                <span className="px-4 py-2 bg-blue-900 text-white text-sm font-black rounded-lg uppercase tracking-wide cursor-pointer hover:bg-blue-950" onClick={() => setProspectoSeleccionado(null)}>
                                    {prospectoSeleccionado.nombres} {prospectoSeleccionado.apellidoPaterno}
                                </span>
                                <div className="flex items-center gap-1 mt-2">
                                    {[1,2,3,4,5].map(v => (
                                        <button key={v} onClick={() => actualizarInteres(pid, v)}>
                                            <Star className={`w-5 h-5 ${prospectoSeleccionado.interes >= v ? 'fill-yellow-400 text-yellow-400' : 'fill-slate-200 text-slate-200'}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* BOX: Datos de contacto */}
                            <div className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 text-sm text-slate-600 space-y-1.5">
                                {prospectoSeleccionado.telefono && (
                                    <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400 shrink-0" /><span className="truncate">{prospectoSeleccionado.telefono}{prospectoSeleccionado.telefono2 ? ` Â· ${prospectoSeleccionado.telefono2}` : ''}</span></div>
                                )}
                                {prospectoSeleccionado.correo && (
                                    <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400 shrink-0" /><span className="truncate">{prospectoSeleccionado.correo}</span></div>
                                )}
                                {prospectoSeleccionado.empresa && (
                                    <div className="flex items-center gap-1.5"><Building2 className="w-3 h-3 text-slate-400 shrink-0" /><span className="truncate">{prospectoSeleccionado.empresa}</span></div>
                                )}
                                {prospectoSeleccionado.ubicacion && (
                                    <div className="flex items-center gap-1.5"><span className="text-slate-400 shrink-0">ðŸ“</span><span className="truncate">{prospectoSeleccionado.ubicacion}</span></div>
                                )}
                            </div>

                            {/* BOX: Etapa actual + Recordatorio */}
                            <div className="w-60 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 text-sm space-y-1.5 shrink-0">
                                <div className="flex items-center gap-1.5">
                                    <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] uppercase ${getEtapaColor(prospectoSeleccionado.etapaEmbudo)}`}>
                                        {getEtapaLabel(prospectoSeleccionado.etapaEmbudo)}
                                    </span>
                                </div>
                                {prospectoSeleccionado.proximaLlamada ? (
                                    <div className="flex items-center gap-1 text-amber-600 font-medium">
                                        <Bell className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{new Date(prospectoSeleccionado.proximaLlamada).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                ) : (
                                    <span className="text-slate-400 italic">Sin recordatorio</span>
                                )}
                                {actividadesContext.find(a => a.tipo === 'cita' && a.resultado === 'pendiente') && (
                                    <div className="flex items-center gap-1 text-blue-600 font-medium">
                                        <Calendar className="w-3 h-3 shrink-0" />
                                        <span className="truncate">Cita pendiente</span>
                                    </div>
                                )}
                            </div>

                            {/* Gear (editar) */}
                            <button onClick={() => abrirModalEditar(prospectoSeleccionado)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0 mt-0.5" title="Editar">
                                <Edit2 className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* â”€â”€ 4 KPIs â”€â”€ */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                        {[
                            { label: 'Llamadas\ncontestadas', value: actividadesContext.filter(a => a.tipo === 'llamada' && a.resultado === 'exitoso').length, color: 'text-emerald-500' },
                            { label: 'Sin\nrespuesta', value: actividadesContext.filter(a => a.tipo === 'llamada' && a.resultado === 'fallido').length, color: 'text-rose-500' },
                            { label: 'Citas', value: actividadesContext.filter(a => a.tipo === 'cita').length, color: 'text-blue-600' },
                            { label: 'WhatsApp', value: actividadesContext.filter(a => a.tipo === 'whatsapp').length, color: 'text-green-500' },
                        ].map(kpi => (
                            <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm min-h-[110px] flex flex-col justify-center">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wide leading-tight whitespace-pre-line">{kpi.label}</p>
                                <p className={`text-3xl font-black mt-1 ${kpi.color}`}>{kpi.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* â”€â”€ AGREGAR ACCIONES + edit â”€â”€ */}
                    <div className="flex items-center gap-3 shrink-0">
                        <button onClick={() => setMostrandoAddPreaccion(!mostrandoAddPreaccion)} className="px-6 py-3 bg-orange-500 text-white font-black uppercase rounded-lg hover:bg-orange-600 transition-colors text-lg leading-none">
                            Agregar acciones
                        </button>
                        <button onClick={() => setModoEdicionPreacciones(!modoEdicionPreacciones)} className={`px-4 py-3 border rounded-lg text-xl font-semibold transition-all ${modoEdicionPreacciones ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            edit
                        </button>
                        {mostrandoAddPreaccion && (
                            <form onSubmit={handleAddPreaccion} className="flex gap-1.5 flex-1">
                                <input autoFocus type="text" value={nuevaPreaccion} onChange={e => setNuevaPreaccion(e.target.value)} placeholder="Nombre de la acciÃ³n..." className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-400" />
                                <button type="submit" disabled={!nuevaPreaccion.trim()} className="bg-blue-600 text-white px-2.5 py-1.5 rounded text-xs font-bold">âœ“</button>
                                <button type="button" onClick={() => setMostrandoAddPreaccion(false)} className="text-slate-400 px-2 py-1.5 rounded text-xs hover:bg-slate-100">âœ•</button>
                            </form>
                        )}
                    </div>

                    {/* â”€â”€ CONTENEDOR DE ACCIONES: AGENDAR + RECORDAR + chips â”€â”€ */}
                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 shadow-sm shrink-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Agendar (fijo) */}
                            <button onClick={() => navigate(`/${rolePath}/calendario`, { state: { prospecto: prospectoSeleccionado } })} className="flex items-center gap-2 px-6 py-3 bg-blue-900 text-white rounded-lg text-lg font-black uppercase hover:bg-blue-950 transition-colors shadow-sm leading-none">
                                <Calendar className="w-5 h-5" /> Agendar
                            </button>

                            {/* Recordar llamada (fijo, toggle del flujo) */}
                            <button onClick={() => setLlamadaFlow(llamadaFlow ? null : { paso: 'contesto', notas: '', fechaProxima: '' })} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-black uppercase transition-colors shadow-sm text-lg leading-none ${llamadaFlow ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                <Phone className="w-5 h-5" /> {llamadaFlow ? 'Cancelar' : 'Recordar llamada'}
                            </button>

                            {/* Chips personalizados */}
                            {preacciones.map((tag, i) => (
                                <div key={i} className="relative group">
                                    <button onClick={() => !modoEdicionPreacciones && handleQuickAction(tag)} className={`flex items-center gap-1 px-3 py-2 border rounded-lg text-[10px] font-bold transition-all ${modoEdicionPreacciones ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600'}`}>
                                        <Zap className={`w-2.5 h-2.5 ${modoEdicionPreacciones ? 'text-amber-400' : 'text-blue-400 group-hover:text-white'}`} />
                                        {tag}
                                    </button>
                                    {modoEdicionPreacciones && (
                                        <button onClick={() => handleRemovePreaccion(tag)} className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 z-10">
                                            <X className="w-2 h-2" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* â”€â”€ FLUJO DE LLAMADA (aparece encima del Ã¡rea notas cuando estÃ¡ activo) â”€â”€ */}
                    {llamadaFlow !== null && (
                        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-3 shrink-0 space-y-2">
                            <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider flex items-center gap-1.5"><Phone className="w-3 h-3" /> Registrando llamada</p>
                            {llamadaFlow.paso === 'contesto' && (
                                <div className="flex gap-2">
                                    <button onClick={() => setLlamadaFlow(f => ({ ...f, paso: 'opciones_contesto' }))} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-bold text-xs hover:bg-emerald-600">âœ” SÃ­ contestÃ³</button>
                                    <button onClick={async () => { await registrarActividad({ tipo: 'llamada', resultado: 'fallido', notas: 'No contestÃ³' }); const h = new Date(); h.setDate(h.getDate()+1); setLlamadaFlow({ paso: 'reintento', notas: '', fechaProxima: h.toISOString().slice(0,16) }); }} className="flex-1 py-2 bg-rose-500 text-white rounded-lg font-bold text-xs hover:bg-rose-600">âœ— No contestÃ³</button>
                                </div>
                            )}
                            {llamadaFlow.paso === 'opciones_contesto' && (
                                <div className="grid grid-cols-4 gap-1.5">
                                    <button onClick={() => navigate(`/${rolePath}/calendario`, { state: { prospecto: prospectoSeleccionado } })} className="py-2 bg-blue-900 text-white rounded-lg font-bold text-[10px] hover:bg-blue-950">ðŸ“… AgendÃ³ reuniÃ³n</button>
                                    <button onClick={() => { const h = new Date(); h.setDate(h.getDate()+3); setLlamadaFlow(f => ({ ...f, paso: 'llamarDespues', fechaProxima: h.toISOString().slice(0,16) })); }} className="py-2 bg-blue-500 text-white rounded-lg font-bold text-[10px] hover:bg-blue-600">ðŸ“ž Llamar despuÃ©s</button>
                                    <button onClick={() => setLlamadaFlow(f => ({ ...f, paso: 'whatsapp' }))} className="py-2 bg-green-500 text-white rounded-lg font-bold text-[10px] hover:bg-green-600">ðŸ’¬ WhatsApp</button>
                                    <button onClick={() => setLlamadaFlow(f => ({ ...f, paso: 'sin_interes' }))} className="py-2 bg-gray-400 text-white rounded-lg font-bold text-[10px] hover:bg-gray-500">âœ— Sin interÃ©s</button>
                                </div>
                            )}
                            {llamadaFlow.paso === 'reintento' && (
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-semibold text-rose-700">Â¿CuÃ¡ndo reintentas?</p>
                                    <TimeWheelPicker value={llamadaFlow.fechaProxima} onChange={val => setLlamadaFlow(f => ({ ...f, fechaProxima: val }))} />
                                    <button onClick={async () => { try { if (llamadaFlow.fechaProxima) await axios.put(`${API_URL}/api/${rolePath}/prospectos/${pid}`, { proximaLlamada: llamadaFlow.fechaProxima }, { headers: getAuthHeaders() }); toast.success('Reintento programado'); setLlamadaFlow(null); const res = await axios.get(`${API_URL}/api/${rolePath}/prospectos`, { headers: getAuthHeaders() }); const upd = res.data.find(p => p.id === pid || p._id === pid); if (upd) { setProspectoSeleccionado(upd); setProspectos(res.data); } } catch { toast.error('Error'); } }} className="w-full py-1.5 bg-rose-600 text-white rounded-lg font-bold text-xs hover:bg-rose-700">ðŸ“… Programar reintento</button>
                                </div>
                            )}
                            {llamadaFlow.paso === 'whatsapp' && (
                                <div className="space-y-1.5">
                                    <textarea className="w-full p-2 border rounded text-xs" placeholder="Notas..." rows={2} value={llamadaFlow.notas||''} onChange={e => setLlamadaFlow(f => ({ ...f, notas: e.target.value }))} />
                                    <button onClick={async () => { await registrarActividad({ tipo: 'whatsapp', resultado: 'exitoso', notas: llamadaFlow.notas || 'WhatsApp' }); setLlamadaFlow(null); }} className="w-full py-1.5 bg-green-600 text-white rounded-lg font-bold text-xs hover:bg-green-700">Registrar y cerrar</button>
                                </div>
                            )}
                            {llamadaFlow.paso === 'sin_interes' && (
                                <div className="space-y-1.5">
                                    <textarea className="w-full p-2 border rounded text-xs" placeholder="Motivo..." rows={2} value={llamadaFlow.notas||''} onChange={e => setLlamadaFlow(f => ({ ...f, notas: e.target.value }))} />
                                    <button onClick={async () => { await registrarActividad({ tipo: 'llamada', resultado: 'fallido', notas: llamadaFlow.notas || 'Sin interÃ©s' }); setLlamadaFlow(null); }} className="w-full py-1.5 bg-gray-600 text-white rounded-lg font-bold text-xs hover:bg-gray-700">Registrar desinterÃ©s</button>
                                </div>
                            )}
                            {llamadaFlow.paso === 'llamarDespues' && (
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-semibold text-blue-700">Programar seguimiento</p>
                                    <TimeWheelPicker value={llamadaFlow.fechaProxima} onChange={val => setLlamadaFlow(f => ({ ...f, fechaProxima: val }))} />
                                    <button onClick={async () => { try { await registrarActividad({ tipo: 'llamada', resultado: 'pendiente', notas: 'Interesado, llamar despuÃ©s' }); if (llamadaFlow.fechaProxima) await axios.put(`${API_URL}/api/${rolePath}/prospectos/${pid}`, { proximaLlamada: llamadaFlow.fechaProxima }, { headers: getAuthHeaders() }); toast.success('Seguimiento programado'); setLlamadaFlow(null); } catch { toast.error('Error'); } }} className="w-full py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700">ðŸ“… Guardar</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notas y recordatorios */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm min-h-[210px]">
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Notas rápidas</p>
                                <button
                                    onClick={handleGuardarNotasRapidas}
                                    disabled={loadingNotas}
                                    className="text-[10px] px-2 py-1 rounded bg-blue-900 text-white hover:bg-blue-950 disabled:opacity-50"
                                >
                                    {loadingNotas ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                            <textarea
                                value={notasRapidas}
                                onChange={(e) => setNotasRapidas(e.target.value)}
                                rows={3}
                                placeholder="Notas internas del prospecto..."
                                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 min-h-[210px]">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Seguimiento</p>

                            {tareaLlamar ? (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                                    <p className="text-[10px] font-semibold text-amber-700 flex items-center gap-1">
                                        <Bell className="w-3 h-3" /> Próxima llamada
                                    </p>
                                    {!editandoFechaSeguimiento ? (
                                        <div className="mt-1 flex items-center justify-between gap-2">
                                            <p className="text-[11px] text-amber-800">
                                                {new Date(tareaLlamar.fecha).toLocaleDateString('es-MX', {
                                                    weekday: 'short',
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                            <button
                                                onClick={() => {
                                                    setNuevaFechaSeguimiento((prospectoSeleccionado.proximaLlamada || '').slice(0, 16));
                                                    setEditandoFechaSeguimiento(true);
                                                }}
                                                className="text-[10px] px-2 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-100"
                                            >
                                                Editar
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mt-1 space-y-1.5">
                                            <TimeWheelPicker value={nuevaFechaSeguimiento} onChange={setNuevaFechaSeguimiento} />
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => guardarFechaSeguimiento(pid)}
                                                    className="flex-1 text-[10px] px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700"
                                                >
                                                    Guardar
                                                </button>
                                                <button
                                                    onClick={() => setEditandoFechaSeguimiento(false)}
                                                    className="text-[10px] px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-[11px] text-slate-400 italic">Sin llamada pendiente</p>
                            )}

                            {proximaCita && (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-2">
                                    <p className="text-[10px] font-semibold text-blue-700 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Cita agendada
                                    </p>
                                    <p className="text-[11px] text-blue-700">{proximaCita.descripcion || 'Reunión pendiente'}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* â”€â”€ ACCIONES DE CIERRE â”€â”€ */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shrink-0 bg-white shadow-sm mt-auto">
                        <button onClick={() => setAcordeonCierreAbierto(v => !v)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors">
                            <span className="text-xs font-semibold text-gray-600">Acciones de Cierre</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 text-slate-400 transition-transform ${acordeonCierreAbierto ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                        {acordeonCierreAbierto && (
                            <div className="p-2 border-t border-slate-100 flex gap-2">
                                <button onClick={() => setModalPasarClienteAbierto(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 font-black text-xs uppercase transition-colors">
                                    <CheckCircle2 className="w-4 h-4" /> Pasar cliente
                                </button>
                                <button onClick={() => setModalDescartarAbierto(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-white border-2 border-red-300 hover:bg-red-50 text-red-500 rounded-lg py-2 font-black text-xs uppercase transition-all">
                                    <XCircle className="w-4 h-4" /> Descartar
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <SeguimientoHistorialPanel
                    actividadesContext={actividadesContext}
                    notaInteraccion={notaInteraccion}
                    setNotaInteraccion={setNotaInteraccion}
                    registrandoInteraccion={registrandoInteraccion}
                    onGuardarInteraccion={handleGuardarInteraccion}
                />

                {renderModales()}
            </div>
        );
    }
    // VISTA PRINCIPAL (LISTA DE PROSPECTOS)
    return (
        <div className="min-h-screen p-6 bg-slate-50">
            <div className="w-full space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Seguimiento de Prospectos</h1>
                        <p className="text-gray-500 mt-1">
                            Selecciona un prospecto para ver su ficha y registrar interacciones
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {usandoMock && (
                            <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-lg">
                                Datos de demostracion
                            </span>
                        )}
                        <button
                            onClick={handleExportCsv}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors font-medium text-sm"
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
                            className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition-colors font-medium"
                        >
                            <UserPlus className="w-5 h-5" />
                            Crear prospecto
                        </button>
                    </div>
                </div>

                {/* Buscador + Filtros 30/70 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-[30%_1fr] gap-4 items-center">
                        {/* 30% BÃƒÆ’Ã‚Âºsqueda */}
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar prospectos..."
                                value={busquedaProspecto}
                                onChange={(e) => setBusquedaProspecto(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800 bg-slate-50 text-sm h-[42px]"
                                title="Buscar por nombre, empresa, correo o telÃƒÆ’Ã‚Â©fono"
                            />
                        </div>
                        {/* 70% Filtros */}
                        <div className="flex flex-wrap gap-2 items-center w-full">
                            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                            {/* Filtros rÃƒÆ’Ã‚Â¡pidos por contacto */}
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { value: 'todos', label: 'Todos' },
                                    { value: 'en_contacto', label: 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ En contacto' },
                                    { value: 'sin_respuesta', label: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Âµ Sin respuesta' },
                                    { value: 'no_contactado', label: 'ÃƒÂ¢Ã‚Â­Ã¢â‚¬Â¢ No contactado' },
                                    { value: 'con_cita', label: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¦ Con cita' },
                                ].map(btn => (
                                    <button
                                        key={btn.value}
                                        onClick={() => setFiltroEtapa(btn.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${filtroEtapa === btn.value
                                            ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-700 hover:text-blue-950'
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
                                    ? 'bg-blue-50 border-blue-400 text-blue-700'
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
                                    ?
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
                    <div className="rounded-xl p-12 text-center">
                        <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No se encontraron prospectos.</p>
                        <p className="text-gray-400 text-sm mt-1">Intenta con otra bÃƒÆ’Ã‚Âºsqueda o crea uno nuevo.</p>
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
                                        <th className="px-4 py-3 text-left font-semibold">ÃƒÆ’Ã…Â¡ltima interacciÃƒÆ’Ã‚Â³n</th>
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
                                                        <Star className={`w-3.5 h-3.5 ${p.interes >= 1 ? 'fill-yellow-400' : 'fill-slate-100 text-slate-300'}`} />
                                                        <Star className={`w-3.5 h-3.5 ${p.interes >= 3 ? 'fill-yellow-400' : 'fill-slate-100 text-slate-300'}`} />
                                                        <Star className={`w-3.5 h-3.5 ${p.interes >= 5 ? 'fill-yellow-400' : 'fill-slate-100 text-slate-300'}`} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 text-sm">{p.empresa || 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}</td>
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
                                                            {p.ultimaActTipo === 'llamada' && <Phone className="w-3 h-3 text-blue-500" />}
                                                            {p.ultimaActTipo === 'whatsapp' && <MessageSquare className="w-3 h-3 text-green-500" />}
                                                            {p.ultimaActTipo === 'correo' && <Mail className="w-3 h-3 text-purple-500" />}
                                                            {p.ultimaActTipo === 'cita' && <Calendar className="w-3 h-3 text-blue-800" />}
                                                            {!['llamada', 'whatsapp', 'correo', 'cita'].includes(p.ultimaActTipo) && <Clock className="w-3 h-3 text-slate-400" />}
                                                        </div>
                                                        <p className="text-[11px] text-slate-600 leading-snug" title={p.ultimaActNotas || ''}>
                                                            {p.ultimaActNotas
                                                                ? (p.ultimaActNotas.length > 50 ? p.ultimaActNotas.slice(0, 50) + 'ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦' : p.ultimaActNotas)
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
                                                        <div className={`flex items-center gap-1.5 ${esVencido ? 'text-red-600' : 'text-blue-600'}`}>
                                                            <div className={`w-2 h-2 rounded-full animate-pulse ${esVencido ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                                            <span className="text-xs font-semibold">
                                                                {new Date(p.proximaLlamada).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                                                {esVencido && ' ?'}
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
                                                        className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50"
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

export default SeguimientoContactos;
