import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, RefreshCw, ChevronRight, ArrowLeft, User, History, Trash2, Download, Upload, Plus, X, Phone, MessageCircle, Calendar, Filter, Star, Mail, MessageSquare, Clock, Share2, Edit2, Bell } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getToken } from '../utils/authUtils';
import { HistorialInteracciones } from '../components/HistorialInteracciones';
import TimeWheelPicker from '../components/TimeWheelPicker';
import ClienteDetalle from '../components/ClienteDetalle';
import SourcePicker from '../components/ui/SourcePicker';

import API_URL from '../config/api';

const normalizeClienteRecordatorio = (cliente) => ({
    ...cliente,
    proximaLlamada:
        cliente?.proximaLlamada ||
        cliente?.proximallamada ||
        cliente?.proximoRecordatorio ||
        cliente?.proximorecordatorio ||
        null
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

const ETAPA_META = {
    venta_ganada: { label: 'Venta ganada', className: 'bg-emerald-100 text-emerald-700' },
    cotizacion_realizada: { label: 'Cotizacion realizada', className: 'bg-blue-100 text-blue-700' },
    contrato_firmado: { label: 'Contrato firmado', className: 'bg-indigo-100 text-indigo-700' },
    esperando_pago: { label: 'Esperando pago', className: 'bg-amber-100 text-amber-700' },
    cliente_activo: { label: 'Cliente activo', className: 'bg-cyan-100 text-cyan-700' }
};

const getEtapaMeta = (etapa) => ETAPA_META[etapa] || { label: 'Sin etapa', className: 'bg-slate-100 text-slate-600' };

const Clientes = () => {
    const location = useLocation();
    const esMenuSeguimiento = location.pathname.endsWith('/clientes/seguimiento');
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [clienteAEliminar, setClienteAEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);
    const [importando, setImportando] = useState(false);
    const [filtro, setFiltro] = useState('todos');
    const [filtroVisibilidad, setFiltroVisibilidad] = useState('mine'); // mine | shared | all
    const fileInputRef = useRef(null);
    const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
    const [creandoCliente, setCreandoCliente] = useState(false);
    const [formCliente, setFormCliente] = useState({
        nombreCompleto: '',
        telefono: '',
        correo: '',
        empresa: '',
        fuente: ''
    });

    // Estados para la vista detallada
    const [prospectoSeleccionado, setProspectoSeleccionado] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const [guardandoSeguimiento, setGuardandoSeguimiento] = useState(false);
    const [llamadaFlow, setLlamadaFlow] = useState(null);

    // Estados para la edición de clientes
    const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
    const [clienteAEditar, setClienteAEditar] = useState({});
    const [loadingEditar, setLoadingEditar] = useState(false);

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
        // No existe /api/vendedor/*, reutilizamos rutas closer para vista de clientes e historial.
        if (rol === 'vendedor') return 'closer';
        return rol;
    };

    const cargarClientes = async () => {
        setLoading(true);
        try {
            const rol = 'vendedor';
            const [resClientes, resTareas] = await Promise.all([
                axios.get(`${API_URL}/api/${rol}/clientes-ganados`, {
                    headers: getAuthHeaders(),
                    params: { scope: filtroVisibilidad }
                }),
                axios.get(`${API_URL}/api/tareas`, { headers: getAuthHeaders() })
            ]);

            const remindersByCliente = buildReminderByClienteMap(resTareas.data || []);
            const data = (resClientes.data || []).map((raw) => {
                const cliente = normalizeClienteRecordatorio(raw);
                if (cliente.proximaLlamada) return cliente;

                const clienteId = String(cliente.id || cliente._id || '');
                const fechaTarea = remindersByCliente.get(clienteId) || null;
                return { ...cliente, proximaLlamada: fechaTarea };
            });

            setClientes(data);
            return data;
        } catch (error) {
            console.error('Error al cargar clientes:', error);
            setClientes([]);
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarClientes();
        const interval = setInterval(cargarClientes, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [filtroVisibilidad]);

    const handleToggleCompartido = async (cliente, nuevoEstado) => {
        const id = cliente.id || cliente._id;
        const prev = clientes;
        setClientes((curr) => curr.map((c) => {
            const cid = c.id || c._id;
            return String(cid) === String(id) ? { ...c, compartido: nuevoEstado } : c;
        }));

        try {
            await axios.patch(
                `${API_URL}/api/vendedor/prospectos/${id}/compartir`,
                { compartido: nuevoEstado },
                { headers: getAuthHeaders() }
            );
            toast.success(nuevoEstado ? 'Cliente compartido con tu equipo' : 'Cliente marcado como privado');
        } catch (error) {
            setClientes(prev);
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

    const cargarTimelineCliente = async (cliente) => {
        setLoadingTimeline(true);
        try {
            const rol = 'vendedor';
            const res = await axios.get(
                `${API_URL}/api/${rol}/prospecto/${cliente.id || cliente._id}/historial-completo`,
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

    const handleVerDetalles = async (cliente) => {
        setProspectoSeleccionado(cliente);
        setLlamadaFlow(null);
        if (!cliente) {
            setTimeline([]);
            setLoadingTimeline(false);
            return;
        }
        await cargarTimelineCliente(cliente);
    };

    const abrirModalEditar = (p) => {
        const tels = [p.telefono, p.telefono2].filter(Boolean);
        setClienteAEditar({
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
            etapaEmbudo: p.etapaEmbudo || 'venta_ganada',
            interes: p.interes || 5
        });
        setModalEditarAbierto(true);
    };

    const handleEditarCliente = async () => {
        setLoadingEditar(true);
        try {
            const rolePath = 'vendedor'; // O corregir según rol real
            const id = clienteAEditar.id;
            const telefonosLimpios = (clienteAEditar.telefonos || []).filter(t => t.trim());
            const payload = { 
                ...clienteAEditar, 
                telefono: telefonosLimpios[0] || '', 
                telefono2: telefonosLimpios.slice(1).join(', ') || '' 
            };
            delete payload.telefonos;

            await axios.put(`${API_URL}/api/${rolePath}/prospectos/${id}/editar`, payload, {
                headers: getAuthHeaders()
            });

            toast.success('Cliente actualizado');
            setModalEditarAbierto(false);

            // Recargar datos
            const lista = await cargarClientes();
            if (prospectoSeleccionado && (prospectoSeleccionado.id === id || prospectoSeleccionado._id === id)) {
                const updated = lista.find(c => (c.id || c._id) === id);
                if (updated) setProspectoSeleccionado(updated);
            }
        } catch (error) {
            console.error('Error al editar:', error);
            toast.error(error.response?.data?.msg || 'Error al actualizar cliente');
        } finally {
            setLoadingEditar(false);
        }
    };

    const renderModales = () => (
        <>
            {/* Modal Editar Cliente - Rediseño Moderno */}
            {modalEditarAbierto && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 transition-all duration-300 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[82vh] overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* Header */}
                        <div className="px-6 py-4 bg-linear-to-r from-(--theme-50) to-white border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-(--theme-100) rounded-xl flex items-center justify-center">
                                    <Edit2 className="w-5 h-5 text-(--theme-600)" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Editar Cliente</h2>
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
                                            value={clienteAEditar.nombres}
                                            onChange={(e) => setClienteAEditar((f) => ({ ...f, nombres: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Apellido Paterno</label>
                                            <input
                                                type="text"
                                                value={clienteAEditar.apellidoPaterno}
                                                onChange={(e) => setClienteAEditar((f) => ({ ...f, apellidoPaterno: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Apellido Materno</label>
                                            <input
                                                type="text"
                                                value={clienteAEditar.apellidoMaterno}
                                                onChange={(e) => setClienteAEditar((f) => ({ ...f, apellidoMaterno: e.target.value }))}
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
                                                onClick={() => setClienteAEditar((f) => ({ ...f, telefonos: [...(f.telefonos || ['']), ''] }))}
                                                className="flex items-center gap-1.5 text-xs text-(--theme-600) hover:text-(--theme-700) font-bold hover:bg-(--theme-50) px-2.5 py-1.5 rounded-lg transition-all"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Agregar
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {(clienteAEditar.telefonos || ['']).map((tel, idx) => (
                                                <div key={idx} className="flex gap-3 items-center bg-linear-to-r from-slate-50 to-white p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-all group">
                                                    <Phone className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
                                                    <input
                                                        type="tel"
                                                        value={tel}
                                                        onChange={(e) => setClienteAEditar((f) => { const t = [...(f.telefonos || [''])]; t[idx] = e.target.value; return { ...f, telefonos: t }; })}
                                                        className="flex-1 bg-transparent border-0 focus:ring-0 text-sm py-1 outline-none font-medium"
                                                        placeholder="Ej: +56 9 1234 5678"
                                                    />
                                                    {(clienteAEditar.telefonos || ['']).length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setClienteAEditar((f) => ({ ...f, telefonos: (f.telefonos || ['']).filter((_, i) => i !== idx) }))}
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
                                            value={clienteAEditar.correo}
                                            onChange={(e) => setClienteAEditar((f) => ({ ...f, correo: e.target.value }))}
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
                                            value={clienteAEditar.empresa}
                                            onChange={(e) => setClienteAEditar((f) => ({ ...f, empresa: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300 font-medium"
                                            placeholder="Nombre de la empresa"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Sitio Web</label>
                                        <input
                                            type="url"
                                            value={clienteAEditar.sitioWeb || ''}
                                            onChange={(e) => setClienteAEditar((f) => ({ ...f, sitioWeb: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent transition-all outline-none hover:border-slate-300 font-medium"
                                            placeholder="https://ejemplo.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Ubicación</label>
                                    <input
                                        type="text"
                                        value={clienteAEditar.ubicacion || ''}
                                        onChange={(e) => setClienteAEditar((f) => ({ ...f, ubicacion: e.target.value }))}
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
                                onClick={handleEditarCliente}
                                disabled={loadingEditar}
                                className="px-8 py-3 bg-linear-to-r from-(--theme-600) to-(--theme-700) text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:brightness-110 transition-all"
                            >
                                {loadingEditar ? '⏳ Guardando...' : '✓ Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal crear cliente */}
            {mostrarModalCrear && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 shadow-xl max-w-xl w-full mx-4 border border-slate-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Crear Cliente</h2>
                            <button
                                onClick={() => setMostrarModalCrear(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre completo *</label>
                                <input
                                    type="text"
                                    value={formCliente.nombreCompleto}
                                    onChange={(e) => setFormCliente({ ...formCliente, nombreCompleto: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500)"
                                    placeholder="Juan Pérez López"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono *</label>
                                <input
                                    type="tel"
                                    value={formCliente.telefono}
                                    onChange={(e) => setFormCliente({ ...formCliente, telefono: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500)"
                                    placeholder="555-123-4567"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Correo *</label>
                                <input
                                    type="email"
                                    value={formCliente.correo}
                                    onChange={(e) => setFormCliente({ ...formCliente, correo: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500)"
                                    placeholder="juan@empresa.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Empresa</label>
                                <input
                                    type="text"
                                    value={formCliente.empresa}
                                    onChange={(e) => setFormCliente({ ...formCliente, empresa: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500)"
                                    placeholder="Mi Empresa S.A."
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Origen / Fuente</label>
                                <SourcePicker
                                    selectedSource={formCliente.fuente}
                                    onChange={(val) => setFormCliente({ ...formCliente, fuente: val })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setMostrarModalCrear(false)}
                                disabled={creandoCliente}
                                className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCrearCliente}
                                disabled={creandoCliente}
                                className="px-6 py-2 rounded-lg bg-(--theme-600) text-white font-semibold hover:bg-(--theme-700) transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {creandoCliente ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Creando...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Crear Cliente
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal confirmación eliminar */}
            {clienteAEliminar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full mx-4 border border-red-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Eliminar cliente</h2>
                        </div>
                        <p className="text-gray-600 mb-6">
                            ¿Estás seguro de eliminar a <strong>{clienteAEliminar.nombres} {clienteAEliminar.apellidoPaterno}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setClienteAEliminar(null)}
                                disabled={eliminando}
                                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEliminarCliente}
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

    const registrarActividadCliente = async (payload) => {
        if (!prospectoSeleccionado) return;

        const rol = 'vendedor';
        const clienteId = prospectoSeleccionado.id || prospectoSeleccionado._id;

        if (payload.tipo === 'llamada' && prospectoSeleccionado.proximaLlamada) {
            await axios.put(
                `${API_URL}/api/${rol}/prospectos/${clienteId}`,
                { proximaLlamada: null },
                { headers: getAuthHeaders() }
            );
        }

        await axios.post(
            `${API_URL}/api/${rol}/registrar-actividad`,
            { clienteId, ...payload },
            { headers: getAuthHeaders() }
        );

        await cargarTimelineCliente(prospectoSeleccionado);
        const lista = await cargarClientes();
        const actualizado = lista.find((c) => String(c.id || c._id) === String(clienteId));
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

    const handleEliminarCliente = async () => {
        if (!clienteAEliminar) return;
        setEliminando(true);
        try {
            await axios.delete(
                `${API_URL}/api/clientes/${clienteAEliminar.id || clienteAEliminar._id}`,
                { headers: getAuthHeaders() }
            );
            setClientes(prev => prev.filter(c => (c.id || c._id) !== (clienteAEliminar.id || clienteAEliminar._id)));
            setClienteAEliminar(null);
        } catch (error) {
            console.error('Error al eliminar cliente:', error);
            alert(error.response?.data?.mensaje || 'No se pudo eliminar el cliente.');
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

    const exportarClientesCsv = () => {
        if (!clientesFiltrados.length) {
            alert('No hay clientes para exportar.');
            return;
        }

        const headers = [
            'nombres',
            'apellidoPaterno',
            'apellidoMaterno',
            'telefono',
            'correo',
            'empresa',
            'estado',
            'etapaEmbudo',
            'fechaUltimaEtapa'
        ];

        const rows = clientesFiltrados.map((cliente) => ([
            cliente.nombres,
            cliente.apellidoPaterno,
            cliente.apellidoMaterno,
            cliente.telefono,
            cliente.correo,
            cliente.empresa,
            cliente.estado,
            cliente.etapaEmbudo,
            cliente.fechaUltimaEtapa
        ].map(escapeCsv).join(',')));

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStamp = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.setAttribute('download', `clientes_${dateStamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportarClientes = async (event) => {
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
            const requiredHeaders = ['nombres', 'apellidoPaterno', 'telefono', 'correo'];
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
                    nombres: row.nombres,
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
                row.nombres && row.apellidoPaterno && row.telefono && row.correo
            ));

            if (!payloads.length) {
                alert('No se encontraron filas validas para importar.');
                return;
            }

            const results = await Promise.allSettled(
                payloads.map((payload) => axios.post(`${API_URL}/api/clientes`, payload, { headers: getAuthHeaders() }))
            );

            const creados = results.filter((r) => r.status === 'fulfilled').length;
            const fallidos = results.length - creados;

            await cargarClientes();
            alert(`Importacion finalizada. Creados: ${creados}. Fallidos: ${fallidos}.`);
        } catch (error) {
            console.error('Error al importar clientes:', error);
            alert(error.response?.data?.mensaje || 'No se pudo importar el archivo CSV.');
        } finally {
            setImportando(false);
        }
    };

    const handleCrearCliente = async () => {
        if (!formCliente.nombreCompleto || !formCliente.telefono || !formCliente.correo) {
            alert('Complete los campos requeridos: nombre completo, teléfono y correo.');
            return;
        }

        const partesNombre = formCliente.nombreCompleto.trim().split(/\s+/).filter(Boolean);
        const nombres = partesNombre[0] || '';
        const restoApellidos = partesNombre.slice(1);
        const apellidoPaterno = restoApellidos[0] || '';
        const apellidoMaterno = restoApellidos.slice(1).join(' ');

        setCreandoCliente(true);
        try {
            await axios.post(
                `${API_URL}/api/clientes`,
                {
                    nombres,
                    apellidoPaterno,
                    apellidoMaterno,
                    telefono: formCliente.telefono,
                    correo: formCliente.correo,
                    empresa: formCliente.empresa,
                    estado: 'ganado',
                    etapaEmbudo: 'venta_ganada',
                    fuente: formCliente.fuente,
                    origen: formCliente.fuente
                },
                { headers: getAuthHeaders() }
            );
            await cargarClientes();
            setMostrarModalCrear(false);
            setFormCliente({
                nombreCompleto: '',
                telefono: '',
                correo: '',
                empresa: '',
                fuente: ''
            });
            alert('Cliente creado exitosamente.');
        } catch (error) {
            console.error('Error al crear cliente:', error);
            alert(error.response?.data?.mensaje || 'No se pudo crear el cliente.');
        } finally {
            setCreandoCliente(false);
        }
    };

    const clientesFiltrados = useMemo(() => {
        return clientes.filter((cliente) => {
            const matchBusqueda =
                busqueda === '' ||
                (cliente.nombres || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (cliente.apellidoPaterno || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (cliente.empresa || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (cliente.correo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (cliente.telefono || '').includes(busqueda);
            
            if (filtro === 'con_recordatorio') {
                return matchBusqueda && !!cliente.proximaLlamada;
            }
            if (filtro === 'sin_recordatorio') {
                return matchBusqueda && !cliente.proximaLlamada;
            }
            return matchBusqueda;
        });
    }, [clientes, busqueda, filtro]);

    // VISTA DETALLADA PREMIUM (Post-Venta)
    if (prospectoSeleccionado) {
        return (
            <>
                <ClienteDetalle 
                    Cliente={prospectoSeleccionado}
                    rolePath={'vendedor'}
                    onVolver={() => handleVerDetalles(null)}
                    onActualizado={async () => {
                        const lista = await cargarClientes();
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
        <div className="min-h-screen md:bg-slate-50 md:p-6 bg-white -m-4 md:m-0 p-4 pb-8 md:pb-6">
            <div className="max-w-full mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                            {esMenuSeguimiento ? 'Seguimiento de Clientes' : 'Clientes'}
                        </h1>
                        <p className="text-xs md:text-sm text-gray-500 mt-0.5 leading-snug">
                            {esMenuSeguimiento
                                ? 'Gestiona y da seguimiento a tu cartera de clientes ganados.'
                                : 'Cartera de clientes ganados.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto mt-2 sm:mt-0">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={handleImportarClientes}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importando}
                            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-[11px] md:text-sm font-medium"
                        >
                            {importando ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                            {importando ? 'Importando...' : 'Importar CSV'}
                        </button>
                        <button
                            onClick={exportarClientesCsv}
                            disabled={loading || !clientesFiltrados.length}
                            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors text-[11px] md:text-sm font-medium"
                        >
                            <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            Exportar CSV
                        </button>
                        <button
                            onClick={() => setMostrarModalCrear(true)}
                            className="w-full sm:w-auto justify-center flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-(--theme-600) text-white rounded-lg hover:bg-(--theme-700) transition-colors text-xs md:text-sm font-medium"
                        >
                            <Plus className="w-4 h-4 md:w-5 md:h-5" />
                            Crear Cliente
                        </button>
                    </div>
                </div>

                <div className="bg-white border-b border-slate-100 md:border md:border-slate-200 md:rounded-2xl p-4 md:shadow-sm mb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-[30%_1fr] gap-4 items-center">
                        <div className="relative w-full">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar clientes..."
                                    value={busqueda}
                                    onChange={(event) => setBusqueda(event.target.value)}
                                    className="w-full pl-8 md:pl-10 pr-3 md:pr-4 py-1.5 md:py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-(--theme-500) focus:border-(--theme-500) bg-white text-xs md:text-sm"
                                    title="Buscar por nombre, empresa, correo o teléfono"
                                />
                        </div>
                        <div className="hidden md:flex flex-wrap md:flex-wrap pb-2 -mx-2 px-2 md:mx-0 md:px-0 gap-2 items-center w-full">
                            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden md:block" />
                            <div className="flex flex-nowrap md:flex-wrap gap-1.5 shrink-0">
                                {[
                                    { value: 'mine', label: 'Mis clientes' },
                                    { value: 'shared', label: 'Compartidos' },
                                    { value: 'all', label: 'Todos visibles' },
                                ].map(btn => (
                                    <button
                                        key={btn.value}
                                        onClick={() => setFiltroVisibilidad(btn.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${filtroVisibilidad === btn.value
                                            ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800'
                                            }`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                            <div className="w-px h-6 bg-slate-200 mx-1 shrink-0 hidden md:block"></div>
                            <div className="flex flex-nowrap md:flex-wrap gap-1.5 shrink-0">
                                {[
                                    { value: 'todos', label: 'Todos' },
                                    { value: 'con_recordatorio', label: 'Con recordatorio' },
                                    { value: 'sin_recordatorio', label: 'Sin recordatorio' },
                                ].map(btn => (
                                    <button
                                        key={btn.value}
                                        onClick={() => setFiltro(btn.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${filtro === btn.value
                                            ? 'bg-(--theme-600) text-white border-(--theme-600) shadow-sm'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-(--theme-400) hover:text-(--theme-700)'
                                            }`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setFiltro(f => f === 'con_recordatorio' ? 'todos' : 'con_recordatorio')}
                                className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border text-sm transition-all ${filtro === 'con_recordatorio'
                                    ? 'bg-(--theme-50) border-(--theme-400) text-(--theme-700)'
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                                    }`}
                                title="Solo con recordatorio de llamada"
                            >
                                <Bell className="w-3.5 h-3.5" />
                            </button>
                            {(filtro !== 'todos' || busqueda || filtroVisibilidad !== 'mine') && (
                                <button
                                    onClick={() => { setFiltro('todos'); setBusqueda(''); setFiltroVisibilidad('mine'); }}
                                    className="shrink-0 flex items-center justify-center w-8 h-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                                    title="Limpiar filtros"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Contador de resultados */}
                    <p className="text-xs text-slate-400 mt-2">
                        Mostrando <span className="font-semibold text-slate-600">{clientesFiltrados.length}</span> de <span className="font-semibold text-slate-600">{clientes.length}</span> clientes
                    </p>
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
                ) : clientesFiltrados.length === 0 ? (
                    <div className="bg-white md:rounded-2xl p-12 min-h-60 flex flex-col items-center justify-center text-center">
                        <User className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-gray-500 font-medium">No se encontraron clientes.</p>
                        <p className="text-gray-400 text-sm mt-1">Intenta con otra busqueda o ajusta los filtros.</p>
                    </div>
                ) : (
                    <div className="bg-white md:border md:border-slate-200 md:rounded-2xl md:shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-100/70 text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-[10px] md:text-xs">Cliente</th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-[10px] md:text-xs">Empresa</th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-[10px] md:text-xs">Contacto</th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-center font-semibold text-[9px] md:text-xs uppercase tracking-wider">Etapa</th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-[10px] md:text-xs whitespace-nowrap">Última interacción</th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-[10px] md:text-xs">Recordatorio</th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-center font-semibold text-[10px] md:text-xs">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {clientesFiltrados.map((cliente) => (
                                        <tr key={cliente._id || cliente.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => handleVerDetalles(cliente)}>
                                            <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <p className="font-bold text-gray-900 leading-tight text-[11px] md:text-sm">
                                                        {cliente.nombres} {cliente.apellidoPaterno}
                                                    </p>
                                                    <p className="text-[9px] md:text-[10px] text-slate-400 mt-0.5 max-w-[100px] md:max-w-none truncate">
                                                        {(cliente.esPropietario === true || isOwnerRecord(cliente))
                                                            ? 'Propietario: tú'
                                                            : `Compartido por: ${cliente.propietarioNombre || 'usuario'}`}
                                                    </p>
                                                    <div className="flex items-center gap-0.5 text-yellow-500 scale-[0.6] md:scale-75 origin-left mt-0.5">
                                                        {[1, 2, 3, 4, 5].map((val) => (
                                                            <Star key={val} className={`w-3.5 h-3.5 ${ (cliente.interes || 5) >= val ? 'fill-yellow-400' : 'fill-slate-100 text-slate-300'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-4 py-2 md:py-3 text-gray-600 text-[10px] md:text-sm whitespace-nowrap max-w-[90px] md:max-w-none truncate">{cliente.empresa || '—'}</td>
                                            <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">
                                                <div className="space-y-0.5">
                                                    {cliente.telefono ? (
                                                        <p className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                                                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                            {cliente.telefono}
                                                        </p>
                                                    ) : null}
                                                    {cliente.correo ? (
                                                        <p className="flex items-center gap-1.5 text-gray-500 text-sm">
                                                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                            <span>{cliente.correo}</span>
                                                        </p>
                                                    ) : null}
                                                    {!cliente.telefono && !cliente.correo && (
                                                        <span className="text-xs text-slate-400 italic">Sin contacto</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-4 py-2 md:py-3 text-center whitespace-nowrap">
                                                {(() => {
                                                    const etapa = getEtapaMeta(cliente.etapaEmbudo);
                                                    return (
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${etapa.className}`}>
                                                            {etapa.label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-2 md:px-4 py-2 md:py-3 max-w-[140px] md:max-w-[200px]">
                                                {cliente.ultimaActTipo ? (
                                                    <div className="flex items-start gap-1.5">
                                                        <div className="mt-0.5 shrink-0">
                                                            {cliente.ultimaActTipo === 'llamada' && <Phone className="w-3 h-3 text-(--theme-500)" />}
                                                            {cliente.ultimaActTipo === 'whatsapp' && <MessageSquare className="w-3 h-3 text-green-500" />}
                                                            {cliente.ultimaActTipo === 'correo' && <Mail className="w-3 h-3 text-purple-500" />}
                                                            {cliente.ultimaActTipo === 'cita' && <Calendar className="w-3 h-3 text-(--theme-500)" />}
                                                            {!['llamada', 'whatsapp', 'correo', 'cita'].includes(cliente.ultimaActTipo) && <Clock className="w-3 h-3 text-slate-400" />}
                                                        </div>
                                                        <p className="text-[11px] text-slate-600 leading-snug" title={cliente.ultimaActNotas || ''}>
                                                            {cliente.ultimaActNotas
                                                                ? (cliente.ultimaActNotas.length > 50 ? cliente.ultimaActNotas.slice(0, 50) + '…' : cliente.ultimaActNotas)
                                                                : <span className="italic text-slate-400">{cliente.ultimaActTipo}</span>}
                                                        </p>
                                                    </div>
                                                ) : cliente.fechaUltimaEtapa ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Plus className="w-3 h-3 text-emerald-500" />
                                                        <span className="text-[11px] text-slate-500">
                                                            Ganado el {new Date(cliente.fechaUltimaEtapa).toLocaleDateString('es-MX')}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300 italic">Sin historial</span>
                                                )}
                                            </td>
                                            <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">
                                                {cliente.proximaLlamada ? (() => {
                                                    const esVencido = new Date(cliente.proximaLlamada) < new Date();
                                                    return (
                                                        <div className={`flex items-center gap-1.5 ${esVencido ? 'text-red-600' : 'text-emerald-00'}`}>
                                                            <Phone className="w-3 h-3 shrink-0" />
                                                            <span className="text-[10px] font-bold leading-tight uppercase tracking-tighter">
                                                                {new Date(cliente.proximaLlamada).toLocaleString('es-MX', {
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
                                                    {(cliente.esPropietario === true || isOwnerRecord(cliente)) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleCompartido(cliente, !cliente.compartido);
                                                            }}
                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${cliente.compartido
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                                }`}
                                                            title="Compartir u ocultar este cliente"
                                                        >
                                                            <Share2 className="w-3 h-3" />
                                                            {cliente.compartido ? 'Compartido' : 'Privado'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleVerDetalles(cliente); }}
                                                        className="text-gray-400 hover:text-(--theme-600) transition-colors p-2 rounded-full hover:bg-(--theme-50)"
                                                        title="Ver Detalles / Historial"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); abrirModalEditar(cliente); }}
                                                        className="text-gray-400 hover:text-(--theme-600) transition-colors p-2 rounded-full hover:bg-(--theme-50)"
                                                        title="Editar Cliente"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setClienteAEliminar(cliente); }}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                                                        title="Eliminar Cliente"
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
        </div>
        {renderModales()}
        </>
    );
};

export default Clientes;
