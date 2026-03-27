import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Phone, MessageSquare, Mail, Calendar, CheckCircle2,
    XCircle, Clock, Star, ArrowLeft, RefreshCw, X, Building2, MapPin, Globe, Edit2, Bell, Send, Trash2, Eye, Copy, ExternalLink
} from 'lucide-react';

import { getToken } from '../utils/authUtils';
import API_URL from '../config/api';
import TimeWheelPicker from './TimeWheelPicker';
import HistorialInteracciones from './HistorialInteracciones';

const ETAPAS_EMBUDO = {
    'prospecto_nuevo': { label: 'Sin contacto', color: 'bg-red-100 text-red-600' },
    'en_contacto': { label: 'En contacto', color: 'bg-[var(--theme-100)] text-[var(--theme-600)]' },
    'reunion_agendada': { label: 'Cita agendada', color: 'bg-[var(--theme-100)] text-[var(--theme-600)]' },
    'reunion_realizada': { label: 'Cita realizada', color: 'bg-[var(--theme-100)] text-[var(--theme-600)]' },
    'en_negociacion': { label: 'Negociación', color: 'bg-amber-100 text-amber-600' },
    'venta_ganada': { label: 'Venta ganada', color: 'bg-[var(--theme-100)] text-[var(--theme-600)]' },
    'perdido': { label: 'Perdido', color: 'bg-rose-100 text-rose-600' }
};

const getEtapaLabel = (etapa) => ETAPAS_EMBUDO[etapa]?.label || etapa;
const getEtapaColor = (etapa) => ETAPAS_EMBUDO[etapa]?.color || 'bg-gray-100 text-gray-600';

const getAuthHeaders = () => ({
    'x-auth-token': getToken() || ''
});

const formatHora = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

export default function ProspectoDetalle({
    prospecto: initialProspecto,
    rolePath,
    onVolver,
    onActualizado,
    abrirModalEditar,
    setModalPasarClienteAbierto,
    setModalDescartarAbierto
}) {
    const navigate = useNavigate();

    const [prospectoSeleccionado, setProspectoSeleccionado] = useState(initialProspecto);
    const pid = prospectoSeleccionado?.id || prospectoSeleccionado?._id;

    const [actividadesContext, setActividadesContext] = useState([]);
    const [loadingContext, setLoadingContext] = useState(false);

    const [notasRapidas, setNotasRapidas] = useState(initialProspecto?.notas || '');
    const [loadingNotas, setLoadingNotas] = useState(false);

    const [muralTexto, setMuralTexto] = useState('');
    const [guardandoMural, setGuardandoMural] = useState(false);

    const [llamadaFlow, setLlamadaFlow] = useState(null);
    const [editandoEtapa, setEditandoEtapa] = useState(false);
    const [loadingEtapa, setLoadingEtapa] = useState(false);

    const [modalRecordatorioAbierto, setModalRecordatorioAbierto] = useState(false);
    const [recordatorio, setRecordatorio] = useState({ fechaProxima: '', notas: '', editandoId: null });
    const [acordeonCierreAbierto, setAcordeonCierreAbierto] = useState(false);
    const [recordatoriosLlamada, setRecordatoriosLlamada] = useState([]);
    const [loadingCitaId, setLoadingCitaId] = useState(null);
    const [modalCita, setModalCita] = useState({ abierto: false, cita: null, editando: false });
    const [editDataCita, setEditDataCita] = useState({ fecha: '', notas: '' });

    // Solo actualizar estado local al recibir nuevos datos
    useEffect(() => {
        if (initialProspecto) {
            setProspectoSeleccionado(initialProspecto);
            setNotasRapidas(initialProspecto.notas || '');
        }
    }, [initialProspecto]);

    // Solo cargar el historial cuando cambie el ID del prospecto
    useEffect(() => {
        if (initialProspecto && (initialProspecto.id || initialProspecto._id)) {
            handleSeleccionarProspectoProp(initialProspecto);
            cargarRecordatorios(initialProspecto.id || initialProspecto._id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialProspecto?.id, initialProspecto?._id]);

    const cargarRecordatorios = async (prospectoId) => {
        try {
            const res = await axios.get(`${API_URL}/api/${rolePath}/prospectos/${prospectoId}/recordatorios`, { headers: getAuthHeaders() });
            setRecordatoriosLlamada(res.data || []);
        } catch (err) {
            console.error('Error al cargar recordatorios:', err);
        }
    };

    const handleSeleccionarProspectoProp = async (p) => {
        setLoadingContext(true);
        try {
            const endpoint = `${API_URL}/api/${rolePath}/prospecto/${p.id || p._id}/historial-completo`;
            const res = await axios.get(endpoint, { headers: getAuthHeaders() });

            if (res.data.timeline) {
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
                        notas: act.notas,
                        googleMeetLink: act.googleMeetLink
                    }));
                setActividadesContext(actividades);
            } else {
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

    const handleSeleccionarProspecto = () => {
        handleSeleccionarProspectoProp(prospectoSeleccionado);
    };

    const handleDeleteActividadContext = async (actividadId) => {
        if (!window.confirm('¿Eliminar esta actividad? Esta acción no se puede deshacer.')) return;
        try {
            await axios.delete(`${API_URL}/api/actividades/${actividadId}`, { headers: getAuthHeaders() });
            setActividadesContext(prev => prev.filter(a => a.id !== actividadId));
            toast.success('Actividad eliminada');
        } catch (error) {
            console.error(error);
            toast.error('No se pudo eliminar la actividad');
        }
    };

    const actualizarInteres = async (id, nuevoInteres) => {
        try {
            await axios.put(`${API_URL}/api/${rolePath}/prospectos/${id}`, { interes: nuevoInteres }, { headers: getAuthHeaders() });
            toast.success('Interés actualizado');
            setProspectoSeleccionado({ ...prospectoSeleccionado, interes: nuevoInteres });
            if (onActualizado) onActualizado();
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar interés');
        }
    };

    const handleGuardarNotasRapidas = async () => {
        if (!prospectoSeleccionado) return;
        setLoadingNotas(true);
        try {
            const pidLoc = prospectoSeleccionado.id || prospectoSeleccionado._id;
            await axios.put(`${API_URL}/api/${rolePath}/prospectos/${pidLoc}/editar`, {
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
            if (onActualizado) onActualizado();
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar notas');
        } finally {
            setLoadingNotas(false);
        }
    };

    const setProspectos = () => {
        if (onActualizado) onActualizado();
    };


    // Helpers para vista detallada
    const llamadasExitosas = actividadesContext.filter(a => a.tipo === 'llamada' && a.resultado === 'exitoso').length;
    const llamadasFallidas = actividadesContext.filter(a => a.tipo === 'llamada' && (a.resultado === 'fallido' || a.resultado === 'pendiente')).length;
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

    // Citas pendientes futuras (puede haber múltiples)
    const citasPendientes = actividadesContext
        .filter(a => a.tipo === 'cita' && a.resultado === 'pendiente' && new Date(a.fechaCita || a.fecha) >= new Date())
        .sort((a, b) => new Date(a.fechaCita || a.fecha) - new Date(b.fechaCita || b.fecha));

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

    const abrirNuevoRecordatorio = () => {
        const fechaDefault = new Date();
        fechaDefault.setDate(fechaDefault.getDate() + 3);
        const isoDefault = fechaDefault.toISOString().slice(0, 16);
        setRecordatorio({ fechaProxima: isoDefault, notas: '', editandoId: null });
        setModalRecordatorioAbierto(true);
    };

    const handleEditarRecordatorio = (rec) => {
        setRecordatorio({
            fechaProxima: rec.fechaLimite ? rec.fechaLimite.slice(0, 16) : '',
            notas: rec.descripcion || '',
            editandoId: rec.id
        });
        setModalRecordatorioAbierto(true);
    };

    const syncRecordatorioFechaHora = (key, value) => {
        setRecordatorio((prev) => {
            const baseFecha = prev.fechaProxima || new Date().toISOString().slice(0, 16);
            const [fechaActual = '', horaActual = '09:00'] = baseFecha.split('T');
            const siguienteFecha = key === 'fecha' ? value : (fechaActual || new Date().toISOString().slice(0, 10));
            const siguienteHora = key === 'hora' ? value : (horaActual || '09:00');

            if (!siguienteFecha || !siguienteHora) {
                return { ...prev, fechaProxima: '' };
            }

            return { ...prev, fechaProxima: `${siguienteFecha}T${siguienteHora}` };
        });
    };

    const descartarRecordatorio = async (recId) => {
        try {
            await axios.delete(`${API_URL}/api/${rolePath}/recordatorios/${recId}`, { headers: getAuthHeaders() });
            setRecordatoriosLlamada(prev => prev.filter(r => r.id !== recId));
            toast.success('Recordatorio eliminado');
        } catch (err) {
            console.error(err);
            toast.error('No se pudo eliminar el recordatorio');
        }
    };

    const handleDescartarCita = async (cita) => {
        if (!window.confirm('¿Descartar esta reunión? Se eliminará de la base de datos y se intentará quitar de Google Calendar.')) return;
        try {
            const id = cita.id || cita._id;
            // 1. Eliminar de Google Calendar (intento)
            try {
                await axios.delete(`${API_URL}/api/google/event-by-activity/${id}`, { headers: getAuthHeaders() });
            } catch (gErr) {
                console.warn('No se pudo eliminar de Google Calendar:', gErr.message);
            }
            // 2. Eliminar de la BD
            await axios.delete(`${API_URL}/api/actividades/${id}`, { headers: getAuthHeaders() });
            setActividadesContext(prev => prev.filter(a => (a.id || a._id) !== id));
            toast.success('Reunión descartada');
        } catch (error) {
            console.error(error);
            toast.error('Error al descartar la reunión');
        }
    };

    const handleActualizarCita = async () => {
        if (!editDataCita.fecha) return toast.error('La fecha es requerida');
        try {
            const id = modalCita.cita.id || modalCita.cita._id;
            // 1. Actualizar en la BD
            await axios.put(`${API_URL}/api/actividades/${id}`, {
                fecha: editDataCita.fecha,
                notas: editDataCita.notas
            }, { headers: getAuthHeaders() });

            // 2. Sincronizar con Google Calendar
            try {
                await axios.patch(`${API_URL}/api/google/event-by-activity/${id}`, {
                    startDateTime: new Date(editDataCita.fecha).toISOString(),
                    endDateTime: new Date(new Date(editDataCita.fecha).getTime() + 45 * 60000).toISOString(),
                    description: editDataCita.notas
                }, { headers: getAuthHeaders() });
            } catch (gErr) {
                console.warn('No se pudo sincronizar actualización con Google:', gErr.message);
            }

            // Actualizar contexto local
            setActividadesContext(prev => prev.map(a => 
                (a.id || a._id) === id 
                ? { ...a, fecha: editDataCita.fecha, notas: editDataCita.notas } 
                : a
            ));

            toast.success('Reunión actualizada');
            setModalCita({ abierto: false, cita: null, editando: false });
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar la reunión');
        }
    };

    const handleMarcarCitaRealizada = async (cita) => {
        if (!cita?.id) {
            toast.error('No se pudo identificar la cita');
            return;
        }
        setLoadingCitaId(cita.id);
        try {
            await axios.put(`${API_URL}/api/actividades/${cita.id}`, {
                resultado: 'exitoso',
                notas: cita.notas ? `${cita.notas}\n[Manual] Cita marcada como realizada` : '[Manual] Cita marcada como realizada'
            }, { headers: getAuthHeaders() });

            const quedanPendientes = citasPendientes.some((c) => c.id !== cita.id);
            if (!quedanPendientes && prospectoSeleccionado.etapaEmbudo === 'reunion_agendada') {
                await axios.put(`${API_URL}/api/${rolePath}/prospectos/${pid}/editar`, {
                    nombres: prospectoSeleccionado.nombres || '',
                    apellidoPaterno: prospectoSeleccionado.apellidoPaterno || '',
                    apellidoMaterno: prospectoSeleccionado.apellidoMaterno || '',
                    telefono: prospectoSeleccionado.telefono || '',
                    telefono2: prospectoSeleccionado.telefono2 || '',
                    correo: prospectoSeleccionado.correo || '',
                    empresa: prospectoSeleccionado.empresa || '',
                    sitioWeb: prospectoSeleccionado.sitioWeb || '',
                    ubicacion: prospectoSeleccionado.ubicacion || '',
                    notas: prospectoSeleccionado.notas || '',
                    etapaEmbudo: 'reunion_realizada'
                }, { headers: getAuthHeaders() });
                setProspectoSeleccionado(prev => ({ ...prev, etapaEmbudo: 'reunion_realizada' }));
            }

            toast.success('Cita marcada como realizada');
            if (onActualizado) onActualizado();
            handleSeleccionarProspecto(prospectoSeleccionado);
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar la cita');
        } finally {
            setLoadingCitaId(null);
        }
    };

    const handleCambiarEtapa = async (nuevaEtapa) => {
        setLoadingEtapa(true);
        try {
            await axios.put(`${API_URL}/api/${rolePath}/prospectos/${pid}/editar`, {
                nombres: prospectoSeleccionado.nombres || '',
                apellidoPaterno: prospectoSeleccionado.apellidoPaterno || '',
                apellidoMaterno: prospectoSeleccionado.apellidoMaterno || '',
                telefono: prospectoSeleccionado.telefono || '',
                telefono2: prospectoSeleccionado.telefono2 || '',
                correo: prospectoSeleccionado.correo || '',
                empresa: prospectoSeleccionado.empresa || '',
                sitioWeb: prospectoSeleccionado.sitioWeb || '',
                ubicacion: prospectoSeleccionado.ubicacion || '',
                notas: prospectoSeleccionado.notas || '',
                etapaEmbudo: nuevaEtapa
            }, { headers: getAuthHeaders() });
            toast.success(`Etapa actualizada: ${getEtapaLabel(nuevaEtapa)}`);
            setEditandoEtapa(false);
            const res = await axios.get(`${API_URL}/api/${rolePath}/prospectos`, { headers: getAuthHeaders() });
            const updated = res.data.find(p => p.id === pid || p._id === pid);
            if (updated) { setProspectoSeleccionado(updated); }
            if (onActualizado) onActualizado();
        } catch (error) {
            console.error(error);
            toast.error('Error al cambiar la etapa');
        } finally {
            setLoadingEtapa(false);
        }
    };

    return (
        <div className="fixed inset-0 overflow-hidden p-4 sm:p-6 bg-slate-50 z-40">
            <style>{`
                    .hide-scrollbar::-webkit-scrollbar { display: none; }
                    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>
            <div className="max-w-full mx-auto h-full flex flex-col gap-2">
                {/* Botón regresar */}
                <button
                    onClick={onVolver}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium mb-2 shrink-0"
                >
                    <ArrowLeft className="w-5 h-5" /> Regresar a la lista
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden">
                    {/* ===================== COLUMNA IZQUIERDA ===================== */}
                    <div className="lg:col-span-2 flex flex-col gap-4 overflow-y-auto hide-scrollbar pr-1">

                        {/* Cabecera + Estrellas + Datos de contacto (Rediseño 3 - Más Compacto) */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:px-6 shadow-sm shrink-0">
                            <div className="flex flex-col gap-3">
                                {/* Fila Superior: Nombre, Editar, Etapa e Interés */}
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                                                {prospectoSeleccionado.nombres} {prospectoSeleccionado.apellidoPaterno}
                                            </h1>
                                            <button
                                                onClick={() => abrirModalEditar(prospectoSeleccionado)}
                                                className="p-1.5 text-slate-400 hover:text-(--theme-600) hover:bg-(--theme-50) rounded-full transition-all"
                                                title="Editar información del prospecto"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {editandoEtapa ? (
                                                <div className="flex items-center gap-1">
                                                    <select
                                                        autoFocus
                                                        defaultValue={prospectoSeleccionado.etapaEmbudo}
                                                        onChange={(e) => handleCambiarEtapa(e.target.value)}
                                                        disabled={loadingEtapa}
                                                        className="border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold bg-white focus:ring-2 focus:ring-(--theme-500) outline-none"
                                                    >
                                                        {Object.entries(ETAPAS_EMBUDO).map(([key, val]) => (
                                                            <option key={key} value={key}>{val.label}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => setEditandoEtapa(false)}
                                                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                                        title="Cancelar"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getEtapaColor(prospectoSeleccionado.etapaEmbudo)}`}>
                                                        {getEtapaLabel(prospectoSeleccionado.etapaEmbudo)}
                                                    </span>
                                                    <button
                                                        onClick={() => setEditandoEtapa(true)}
                                                        className="p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded transition-all"
                                                        title="Cambiar etapa"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                            {prospectoSeleccionado.empresa && (
                                                <span className="text-gray-500 text-sm font-medium flex items-center gap-1.5 border-l border-slate-200 pl-2">
                                                    <Building2 className="w-4 h-4 text-slate-400" />
                                                    {prospectoSeleccionado.empresa}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Interés (estrellas sin contenedor) */}
                                    <div className="flex items-center gap-2 py-1">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Interés:</span>
                                        <div className="flex items-center gap-0.5 text-yellow-500">
                                            {[1, 2, 3, 4, 5].map((value) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    onClick={() => actualizarInteres(pid, prospectoSeleccionado.interes === value ? 0 : value)}
                                                    className="hover:scale-110 transition-transform active:scale-95 px-0.5"
                                                    title={`Nivel de interés: ${value} de 5`}
                                                >
                                                    <Star className={`w-5.5 h-5.5 ${prospectoSeleccionado.interes >= value ? 'fill-yellow-400' : 'fill-slate-100 text-slate-300'}`} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Grid de Información de Contacto (Solo si hay datos) - Ahora más compacto */}
                                {(prospectoSeleccionado.telefono || prospectoSeleccionado.correo || prospectoSeleccionado.ubicacion || prospectoSeleccionado.sitioWeb) && (
                                    <div className="pt-3 border-t border-slate-100">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                            {/* Teléfonos */}
                                            {(prospectoSeleccionado.telefono || prospectoSeleccionado.telefono2) && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 shrink-0">
                                                        <Phone className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 leading-none mb-0.5">Teléfono</span>
                                                        <div className="flex flex-wrap text-xs font-bold text-slate-700 truncate">
                                                            {[prospectoSeleccionado.telefono, prospectoSeleccionado.telefono2].filter(Boolean).flatMap(t => t.split(',').map(s => s.trim())).filter(Boolean).slice(0, 1).map((tel, idx) => (
                                                                <span key={idx}>{tel}</span>
                                                            ))}
                                                            {[prospectoSeleccionado.telefono, prospectoSeleccionado.telefono2].filter(Boolean).flatMap(t => t.split(',').map(s => s.trim())).filter(Boolean).length > 1 && (
                                                                <span className="ml-1 text-slate-400 text-[10px]">...</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Correo */}
                                            {prospectoSeleccionado.correo && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 shrink-0">
                                                        <Mail className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 leading-none mb-0.5">Correo</span>
                                                        <span className="text-xs font-bold text-slate-700 truncate" title={prospectoSeleccionado.correo}>
                                                            {prospectoSeleccionado.correo}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Ubicación */}
                                            {prospectoSeleccionado.ubicacion && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 shrink-0">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 leading-none mb-0.5">Ubicación</span>
                                                        <span className="text-xs font-bold text-slate-700 truncate">
                                                            {prospectoSeleccionado.ubicacion}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Sitio Web */}
                                            {prospectoSeleccionado.sitioWeb && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 shrink-0">
                                                        <Globe className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 leading-none mb-0.5">Web</span>
                                                        <a
                                                            href={prospectoSeleccionado.sitioWeb.startsWith('http') ? prospectoSeleccionado.sitioWeb : `https://${prospectoSeleccionado.sitioWeb}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs font-bold text-(--theme-600) hover:underline truncate"
                                                        >
                                                            {prospectoSeleccionado.sitioWeb.replace(/^https?:\/\//, '')}
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
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


                        {/* ==================== ÁRBOL DE LLAMADA ==================== */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                                {/* Llamar */}
                                <button
                                    onClick={() => setLlamadaFlow({ paso: 'contesto', notas: '', fechaProxima: '', interesado: null })}
                                    className="flex flex-col items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-(--theme-500) rounded-xl p-4 text-gray-700 hover:text-(--theme-600) transition-all shadow-sm font-bold text-sm"
                                >
                                    <Phone className="w-6 h-6" />
                                    Llamar
                                </button>
                                {/* Recordatorio de llamada */}
                                <button
                                    onClick={abrirNuevoRecordatorio}
                                    className="flex flex-col items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-(--theme-500) rounded-xl p-4 text-gray-700 hover:text-(--theme-600) transition-all shadow-sm font-bold text-sm"
                                >
                                    <Clock className="w-6 h-6 text-(--theme-500)" />
                                    Crear Recordatorio
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

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-sm relative max-h-[280px]">
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Bell className="w-3.5 h-3.5 text-(--theme-500)" />
                                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Notificaciones</p>
                                    </div>

                                    {/* Contenido con altura fija y scroll */}
                                    <div className="overflow-y-auto hide-scrollbar flex flex-col gap-2 flex-shrink-0" style={{ maxHeight: '200px', height: '200px' }}>

                                        {citasPendientes.map((cita) => {
                                            const fechaCita = cita.fechaCita || cita.fecha;
                                            return (
                                                <div key={`cita-${cita.id || fechaCita}`} className="bg-white border border-slate-200 rounded-lg px-3 py-2 space-y-1.5 shadow-sm">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-xs font-semibold text-gray-800">📅 Reunión agendada</p>
                                                        <p className="text-[10px] text-gray-400 shrink-0">
                                                            {new Date(fechaCita).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            onClick={() => handleMarcarCitaRealizada(cita)}
                                                            disabled={loadingCitaId === cita.id}
                                                            title="Marcar como realizada"
                                                            className="flex-1 flex items-center justify-center gap-1.5 bg-(--theme-600) hover:bg-(--theme-700) text-white rounded py-1.5 text-[10px] font-bold transition-colors disabled:opacity-50"
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            {loadingCitaId === cita.id ? '...' : 'Realizada'}
                                                        </button>
                                                        <button
                                                            onClick={() => setModalCita({ abierto: true, cita, editando: false })}
                                                            className="flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded px-2 py-1.5 transition-colors shadow-sm"
                                                            title="Ver"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditDataCita({ fecha: fechaCita, notas: cita.notas || '' });
                                                                setModalCita({ abierto: true, cita, editando: true });
                                                            }}
                                                            className="flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded px-2 py-1.5 transition-colors shadow-sm"
                                                            title="Editar"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDescartarCita(cita)}
                                                            className="flex items-center justify-center bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded px-2 py-1.5 transition-colors shadow-sm"
                                                            title="Descartar"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {recordatoriosLlamada.map(rec => (
                                            <div key={rec.id} className="bg-white border border-slate-200 rounded-lg px-3 py-2 space-y-1.5 shadow-sm">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-semibold text-gray-800">📞 Recordatorio de llamada</p>
                                                    <p className="text-[10px] text-gray-400 shrink-0">
                                                        {new Date(rec.fechaLimite).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </p>
                                                </div>
                                                {rec.descripcion && (
                                                    <p className="text-[10px] text-slate-500 italic">{rec.descripcion}</p>
                                                )}
                                                <div className="flex gap-1.5">
                                                    <button
                                                        onClick={() => handleEditarRecordatorio(rec)}
                                                        className="flex-1 flex items-center justify-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded py-1.5 text-[10px] font-bold transition-colors"
                                                    >
                                                        <Edit2 className="w-3 h-3" /> Editar
                                                    </button>
                                                    <button
                                                        onClick={() => descartarRecordatorio(rec.id)}
                                                        className="flex-1 flex items-center justify-center gap-1 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded py-1.5 text-[10px] font-bold transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" /> Quitar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {citasPendientes.length === 0 && recordatoriosLlamada.length === 0 && (
                                            <p className="text-[11px] text-slate-500 px-1 italic">Sin alertas por ahora.</p>
                                        )}
                                    </div>

                                    {/* Indicador de scroll discreto */}
                                    {(citasPendientes.length + recordatoriosLlamada.length > 2) && (
                                        <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ bottom: '-6px' }}>
                                            <svg className="w-5 h-5 text-slate-400 animate-bounce" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M7 10l5 5 5-5z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {/* ========= CUADRO DE NOTAS EDITABLE ========= */}
                                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-sm">
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
                                        className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent outline-none min-h-[140px] resize-none scrollbar-hide"
                                    />
                                </div>
                            </div>

                            {/* Acciones de cierre (Desplegable lateral) */}
                            <div className="relative inline-block mt-2">
                                <button
                                    onClick={() => setAcordeonCierreAbierto(v => !v)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-semibold transition-all border border-slate-200"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                    Acciones de cierre
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-400 transition-transform ${acordeonCierreAbierto ? '-rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                                </button>

                                {acordeonCierreAbierto && (
                                    <div className="absolute left-full top-0 ml-3 z-50 flex flex-row items-center gap-2 bg-white border border-slate-200 rounded-lg shadow-xl p-0 animate-in fade-in slide-in-from-left-2 duration-200 whitespace-nowrap overflow-hidden">
                                        <button
                                            onClick={() => { setModalPasarClienteAbierto(true); setAcordeonCierreAbierto(false); }}
                                            className="flex items-center gap-2 bg-(--theme-600) hover:bg-(--theme-700) text-white px-4 py-2 font-bold text-sm transition-colors cursor-pointer"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Pasar a cliente
                                        </button>
                                        <div className="w-px h-4 bg-slate-200 shadow-sm" />
                                        <button
                                            onClick={() => { setModalDescartarAbierto(true); setAcordeonCierreAbierto(false); }}
                                            className="flex items-center gap-2 bg-white text-red-500 hover:text-red-700 px-4 py-2 font-bold text-sm transition-all cursor-pointer"
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
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden lg:h-full h-[70vh] min-h-0">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">Historial de interacciones</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">↑ Más reciente arriba</p>
                            </div>
                            <span className="text-xs bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 font-semibold">{actividadesContext.length}</span>
                        </div>
                        <div
                            className="flex-1 overflow-y-auto px-4 py-4 hide-scrollbar"
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
                                <div className="relative">
                                    {/* Línea vertical de tiempo */}
                                    <div className="absolute left-[13px] top-2 bottom-2 w-px bg-slate-200" />

                                    <div className="space-y-0">
                                        {[...actividadesContext].reverse().map((act, index) => {
                                            const meta = getActIcon(act);
                                            const esElMasReciente = index === 0;

                                            const dotColor =
                                                act.tipo === 'whatsapp' ? 'bg-green-500' :
                                                    act.tipo === 'cita' ? 'bg-(--theme-500)' :
                                                        act.tipo === 'llamada' && act.resultado === 'fallido' ? 'bg-rose-400' :
                                                            act.tipo === 'llamada' ? 'bg-(--theme-500)' :
                                                                act.tipo === 'cliente' ? 'bg-yellow-500' :
                                                                    act.tipo === 'descartado' ? 'bg-gray-400' :
                                                                        'bg-slate-400';

                                            return (
                                                <div key={act.id || index} className="relative flex gap-3 pb-4">
                                                    {/* Punto de la línea de tiempo */}
                                                    <div className="relative z-10 shrink-0 mt-1.5">
                                                        <div className={`w-[11px] h-[11px] rounded-full border-2 border-white ${dotColor} shadow-sm`} />
                                                    </div>

                                                    {/* Tarjeta */}
                                                    <div className="flex-1 min-w-0">
                                                        {esElMasReciente && (
                                                            <span className="inline-block text-[9px] font-extrabold uppercase tracking-widest text-white bg-(--theme-500) rounded px-1.5 py-0.5 mb-1">
                                                                Más reciente
                                                            </span>
                                                        )}
                                                        <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 hover:border-slate-200 transition-colors">
                                                            <div className="flex items-start justify-between gap-1">
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-gray-800 leading-tight">{meta.label}</p>
                                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                                        {new Date(act.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                        {' · '}{formatHora(act.fecha)}
                                                                        {act.vendedorNombre && <> · <span className="text-slate-500">{act.vendedorNombre}</span></>}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleDeleteActividadContext(act.id)}
                                                                    title="Eliminar"
                                                                    className="shrink-0 p-1 rounded text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all mt-0.5"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                            {getResultadoTexto(act) && (
                                                                <p className="text-[10px] text-gray-500 mt-1 font-medium">{getResultadoTexto(act)}</p>
                                                            )}
                                                            {act.notas && (
                                                                <p className="text-[10px] text-gray-500 mt-1 italic truncate" title={act.notas}>"{act.notas}"</p>
                                                            )}
                                                            {act.fechaCita && (
                                                                <p className="text-[10px] text-(--theme-600) mt-1 font-semibold">
                                                                    📅 {new Date(act.fechaCita).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-(--theme-400)/20 focus-within:border-(--theme-400) transition-all">
                                <textarea
                                    value={muralTexto}
                                    onChange={(e) => setMuralTexto(e.target.value)}
                                    placeholder="Escribe una nota rápida en el mural..."
                                    className="flex-1 px-3 py-2.5 text-sm border-0 focus:ring-0 outline-none resize-none bg-transparent min-h-[44px] max-h-[120px] scrollbar-hide"
                                    rows={1}
                                    onInput={(e) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                />
                                <button
                                    onClick={registrarEnMural}
                                    disabled={guardandoMural || !muralTexto.trim()}
                                    className="shrink-0 w-10 h-10 flex items-center justify-center bg-(--theme-600) hover:bg-(--theme-700) text-white rounded-xl transition-all shadow-sm shadow-(--theme-500)/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                    title="Registrar en mural"
                                >
                                    {guardandoMural ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* MODAL RECORDATORIO DE LLAMADA */}
            {llamadaFlow !== null && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-linear-to-r from-(--theme-50) to-white flex items-center justify-between gap-3">
                            <span className="font-bold text-(--theme-700) flex items-center gap-2"><Phone className="w-4 h-4" /> Registrando llamada...</span>
                            <button onClick={() => setLlamadaFlow(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-white/60">✕ Cancelar</button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
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
                                                    // 2. Actualizar solo proximaLlamada (ruta simple, no requiere nombres/telefono)
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
                    </div>
                </div>
            )}

            {/* MODAL RECORDATORIO DE LLAMADA */}
            {modalRecordatorioAbierto && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 bg-linear-to-r from-(--theme-50) to-white">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-5 h-5 text-(--theme-600)" />
                                        <h2 className="text-lg font-bold text-gray-900">{recordatorio.editandoId ? 'Editar recordatorio' : 'Crear recordatorio'}</h2>
                                    </div>
                                    <p className="text-sm text-slate-600">Configura una fecha rápida para volver a llamar a {prospectoSeleccionado.nombres}.</p>
                                </div>
                                <button
                                    onClick={() => { setModalRecordatorioAbierto(false); setRecordatorio({ fechaProxima: '', notas: '', editandoId: null }); }}
                                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors"
                                    aria-label="Cerrar modal"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Fecha</label>
                                    <input
                                        type="date"
                                        value={recordatorio.fechaProxima ? recordatorio.fechaProxima.slice(0, 10) : ''}
                                        onChange={(e) => syncRecordatorioFechaHora('fecha', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-300) focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Hora</label>
                                    <input
                                        type="time"
                                        step="300"
                                        value={recordatorio.fechaProxima ? recordatorio.fechaProxima.slice(11, 16) : ''}
                                        onChange={(e) => syncRecordatorioFechaHora('hora', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-300) focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Notas (opcional)</label>
                                <textarea
                                    rows={4}
                                    value={recordatorio.notas}
                                    onChange={(e) => setRecordatorio(r => ({ ...r, notas: e.target.value }))}
                                    placeholder="Ej: Confirmar presupuesto y validar disponibilidad"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-300) focus:border-transparent outline-none resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 px-6 py-5 border-t border-slate-100 bg-slate-50/70">
                            <button
                                onClick={() => { setModalRecordatorioAbierto(false); setRecordatorio({ fechaProxima: '', notas: '', editandoId: null }); }}
                                className="sm:flex-1 px-4 py-2.5 border border-slate-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        if (!recordatorio.fechaProxima) {
                                            toast.error('Selecciona una fecha');
                                            return;
                                        }
                                        const pid = prospectoSeleccionado.id || prospectoSeleccionado._id;

                                        if (recordatorio.editandoId) {
                                            // Editar recordatorio existente
                                            const res = await axios.put(`${API_URL}/api/${rolePath}/recordatorios/${recordatorio.editandoId}`, {
                                                fechaLimite: recordatorio.fechaProxima,
                                                descripcion: recordatorio.notas || ''
                                            }, { headers: getAuthHeaders() });
                                            const updated = res.data.recordatorio;
                                            setRecordatoriosLlamada(prev => prev.map(r => r.id === recordatorio.editandoId ? updated : r));
                                            toast.success('📞 Recordatorio actualizado');
                                        } else {
                                            // Crear nuevo recordatorio
                                            const res = await axios.post(`${API_URL}/api/${rolePath}/prospectos/${pid}/recordatorios`, {
                                                fechaLimite: recordatorio.fechaProxima,
                                                descripcion: recordatorio.notas || ''
                                            }, { headers: getAuthHeaders() });
                                            setRecordatoriosLlamada(prev => [...prev, res.data.recordatorio]);
                                            toast.success('📞 Recordatorio programado');
                                        }

                                        setModalRecordatorioAbierto(false);
                                        setRecordatorio({ fechaProxima: '', notas: '', editandoId: null });
                                    } catch (err) {
                                        console.error(err);
                                        toast.error('Error al guardar el recordatorio');
                                    }
                                }}
                                className="sm:flex-1 px-4 py-2.5 bg-(--theme-600) text-white rounded-lg text-sm font-semibold hover:bg-(--theme-700) transition-colors"
                            >
                                ✓ Guardar recordatorio
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL DETALLE / EDICIÓN DE CITA */}
            {modalCita.abierto && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 bg-linear-to-r from-(--theme-50) to-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-(--theme-600)" />
                                <h2 className="text-lg font-bold text-gray-900">
                                    {modalCita.editando ? 'Editar reunión agendada' : 'Detalles de la reunión'}
                                </h2>
                            </div>
                            <button
                                onClick={() => setModalCita({ abierto: false, cita: null, editando: false })}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {modalCita.editando ? (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha y Hora</label>
                                        <input
                                            type="datetime-local"
                                            value={editDataCita.fecha ? new Date(editDataCita.fecha).toISOString().slice(0, 16) : ''}
                                            onChange={(e) => setEditDataCita({ ...editDataCita, fecha: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-400) outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notas de la reunión</label>
                                        <textarea
                                            value={editDataCita.notas}
                                            onChange={(e) => setEditDataCita({ ...editDataCita, notas: e.target.value })}
                                            placeholder="Detalles o preparativos para la reunión..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-(--theme-400) outline-none transition-all min-h-[120px] resize-none"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Fecha</span>
                                            <span className="text-sm font-semibold text-slate-700">
                                                {new Date(modalCita.cita.fechaCita || modalCita.cita.fecha).toLocaleDateString('es-MX', { dateStyle: 'long' })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Hora</span>
                                            <span className="text-sm font-semibold text-slate-700">
                                                {new Date(modalCita.cita.fechaCita || modalCita.cita.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Notas</span>
                                            <p className="text-sm text-slate-600 leading-relaxed italic">
                                                {modalCita.cita.notas || 'Sin notas registradas.'}
                                            </p>
                                        </div>

                                        {modalCita.cita.googleMeetLink && (
                                            <div className="pt-2 border-t border-slate-200">
                                                <span className="text-xs font-bold text-(--theme-600) uppercase block mb-1.5">Enlace de Google Meet</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 truncate font-mono">
                                                        {modalCita.cita.googleMeetLink}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(modalCita.cita.googleMeetLink);
                                                            toast.success('Enlace copiado');
                                                        }}
                                                        className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-sm transition-all"
                                                        title="Copiar enlace"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    <a
                                                        href={modalCita.cita.googleMeetLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-(--theme-600) hover:bg-(--theme-700) text-white rounded-lg shadow-sm transition-all"
                                                        title="Unirse a la reunión"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-3 p-3 bg-(--theme-50) border border-(--theme-100) rounded-xl">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Star className="w-4 h-4 text-(--theme-500)" />
                                        </div>
                                        <div className="text-xs">
                                            <p className="font-bold text-(--theme-700)">Reunión con {prospectoSeleccionado.nombres}</p>
                                            <p className="text-(--theme-600)">Empresa: {prospectoSeleccionado.empresa || 'No especificada'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setModalCita({ abierto: false, cita: null, editando: false })}
                                className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cerrar
                            </button>
                            {modalCita.editando && (
                                <button
                                    onClick={handleActualizarCita}
                                    className="px-6 py-2 bg-(--theme-600) text-white rounded-lg text-sm font-bold hover:bg-(--theme-700) shadow-sm transition-colors"
                                >
                                    Guardar cambios
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );








}
