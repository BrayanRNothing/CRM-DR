import React, { useState, useEffect } from 'react';
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
    ChevronRight,
    User
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getToken } from '../../utils/authUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const TIPOS_ACTIVIDAD = [
    { value: 'llamada', label: 'Llamada', icon: Phone, color: 'bg-blue-500' },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-green-500' },
    { value: 'correo', label: 'Correo', icon: Mail, color: 'bg-purple-500' },
    { value: 'cita', label: 'Cita agendada', icon: Calendar, color: 'bg-teal-500' }
];

const RESULTADOS = [
    { value: 'exitoso', label: 'Exitoso', icon: CheckCircle2 },
    { value: 'pendiente', label: 'Pendiente', icon: Clock },
    { value: 'fallido', label: 'No contestó', icon: XCircle }
];

const getTipoLabel = (tipo) => TIPOS_ACTIVIDAD.find(t => t.value === tipo)?.label || tipo;
const getTipoColor = (tipo) => TIPOS_ACTIVIDAD.find(t => t.value === tipo)?.color || 'bg-gray-500';
const getResultadoLabel = (r) => RESULTADOS.find(x => x.value === r)?.label || r;

const ProspectorSeguimiento = () => {
    const [prospectos, setProspectos] = useState([]);
    const [actividadesHoy, setActividadesHoy] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingRegistro, setLoadingRegistro] = useState(false);
    const [usandoMock, setUsandoMock] = useState(false);
    const [busquedaProspecto, setBusquedaProspecto] = useState('');
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
    const [loadingCrear, setLoadingCrear] = useState(false);
    const [formCrear, setFormCrear] = useState({
        nombres: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        telefono: '',
        correo: '',
        empresa: '',
        notas: ''
    });
    const [form, setForm] = useState({
        clienteId: '',
        tipo: 'llamada',
        resultado: 'pendiente',
        notas: '',
        fechaCita: ''
    });

    const getAuthHeaders = () => ({
        'x-auth-token': getToken() || ''
    });

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [resProspectos, resActividades] = await Promise.all([
                axios.get(`${API_URL}/api/prospector/prospectos`, { headers: getAuthHeaders() }),
                axios.get(`${API_URL}/api/prospector/actividades-hoy`, { headers: getAuthHeaders() })
            ]);
            setProspectos(resProspectos.data);
            setActividadesHoy(resActividades.data);
            setUsandoMock(false);
        } catch (error) {
            console.error('Error al cargar:', error);
            setUsandoMock(true);
            setProspectos([]);
            setActividadesHoy([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const prospectosFiltrados = prospectos.filter((p) => {
        const q = busquedaProspecto.toLowerCase();
        const nombre = `${p.nombres || ''} ${p.apellidoPaterno || ''}`.toLowerCase();
        const empresa = (p.empresa || '').toLowerCase();
        const telefono = (p.telefono || '').replace(/\s/g, '');
        const correo = (p.correo || '').toLowerCase();
        return nombre.includes(q) || empresa.includes(q) || telefono.includes(q) || correo.includes(q);
    });

    const handleCrearProspecto = async () => {
        const { nombres, apellidoPaterno, telefono, correo } = formCrear;
        if (!nombres?.trim() || !apellidoPaterno?.trim() || !telefono?.trim() || !correo?.trim()) {
            toast.error('Nombres, apellido, teléfono y correo son requeridos');
            return;
        }
        setLoadingCrear(true);
        try {
            await axios.post(`${API_URL}/api/prospector/crear-prospecto`, formCrear, {
                headers: getAuthHeaders()
            });
            toast.success('Prospecto creado');
            setModalCrearAbierto(false);
            setFormCrear({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefono: '', correo: '', empresa: '', notas: '' });
            cargarDatos();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Error al crear');
        } finally {
            setLoadingCrear(false);
        }
    };

    const handleRegistrar = async () => {
        if (!form.clienteId) {
            toast.error('Selecciona un prospecto');
            return;
        }
        setLoadingRegistro(true);
        try {
            await axios.post(
                `${API_URL}/api/prospector/registrar-actividad`,
                {
                    clienteId: form.clienteId,
                    tipo: form.tipo,
                    resultado: form.resultado,
                    notas: form.notas || undefined,
                    fechaCita: form.tipo === 'cita' && form.fechaCita ? form.fechaCita : undefined
                },
                { headers: getAuthHeaders() }
            );
            toast.success('Actividad registrada');
            setModalAbierto(false);
            setForm({ clienteId: '', tipo: 'llamada', resultado: 'pendiente', notas: '', fechaCita: '' });
            cargarDatos();
        } catch (error) {
            const msg = error.response?.data?.msg || 'Error al registrar';
            toast.error(msg);
        } finally {
            setLoadingRegistro(false);
        }
    };

    const resumen = {
        llamadas: actividadesHoy.filter((a) => a.tipo === 'llamada').length,
        mensajes: actividadesHoy.filter((a) => ['whatsapp', 'correo', 'mensaje'].includes(a.tipo)).length,
        citas: actividadesHoy.filter((a) => a.tipo === 'cita').length
    };

    const formatHora = (date) => {
        const d = new Date(date);
        return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando seguimiento...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Seguimiento</h1>
                        <p className="text-gray-500 mt-1">
                            Registra tus interacciones para que el closer monitoree tu avance
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {usandoMock && (
                            <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-lg">
                                Datos de demostración
                            </span>
                        )}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setModalCrearAbierto(true)}
                                className="flex items-center gap-2 px-4 py-2 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors font-medium"
                            >
                                <UserPlus className="w-5 h-5" />
                                Crear prospecto
                            </button>
                            <button
                                onClick={() => setModalAbierto(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                            >
                                <Plus className="w-5 h-5" />
                                Registrar actividad
                            </button>
                        </div>
                    </div>
                </div>

                {/* Resumen del día */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Phone className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{resumen.llamadas}</p>
                                <p className="text-sm text-gray-500">Llamadas hoy</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <MessageSquare className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{resumen.mensajes}</p>
                                <p className="text-sm text-gray-500">Mensajes / correos hoy</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-teal-100 rounded-lg">
                                <Calendar className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{resumen.citas}</p>
                                <p className="text-sm text-gray-500">Citas hoy</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline del día */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200">
                        <h2 className="text-lg font-bold text-gray-900">Actividades de hoy</h2>
                        <p className="text-sm text-gray-500">{actividadesHoy.length} registros</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {actividadesHoy.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No hay actividades registradas hoy</p>
                                <button
                                    onClick={() => setModalAbierto(true)}
                                    className="mt-3 text-teal-600 hover:text-teal-700 font-medium"
                                >
                                    Registrar la primera
                                </button>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {actividadesHoy.map((act) => (
                                    <li key={act._id} className="px-6 py-4 hover:bg-slate-50/50 flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getTipoColor(act.tipo)} text-white`}>
                                            {act.tipo === 'llamada' && <Phone className="w-5 h-5" />}
                                            {act.tipo === 'whatsapp' && <MessageSquare className="w-5 h-5" />}
                                            {act.tipo === 'correo' && <Mail className="w-5 h-5" />}
                                            {act.tipo === 'cita' && <Calendar className="w-5 h-5" />}
                                            {!['llamada', 'whatsapp', 'correo', 'cita'].includes(act.tipo) && (
                                                <User className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900">
                                                {act.cliente?.nombres} {act.cliente?.apellidoPaterno}
                                                {act.cliente?.empresa && (
                                                    <span className="text-gray-500 font-normal"> · {act.cliente.empresa}</span>
                                                )}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {getTipoLabel(act.tipo)} · {getResultadoLabel(act.resultado)}
                                                {act.notas && ` · ${act.notas}`}
                                            </p>
                                        </div>
                                        <span className="text-sm text-gray-400 shrink-0">{formatHora(act.fecha)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Link a Prospectos */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <User className="w-10 h-10 text-teal-600" />
                        <div>
                            <p className="font-semibold text-gray-900">Oportunidades / Prospectos</p>
                            <p className="text-sm text-gray-500">
                                Vista simplificada de tus prospectos, sincronizada con este seguimiento
                            </p>
                        </div>
                    </div>
                    <a
                        href="/prospector/prospectos"
                        className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium"
                    >
                        Ir a Prospectos <ChevronRight className="w-5 h-5" />
                    </a>
                </div>
            </div>

            {/* Modal Registrar Actividad */}
            {modalAbierto && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Registrar interacción</h2>

                            <div className="space-y-4">
                                {/* Buscar prospecto */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Prospecto</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre, empresa..."
                                            value={busquedaProspecto}
                                            onChange={(e) => setBusquedaProspecto(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        />
                                    </div>
                                    <select
                                        value={form.clienteId}
                                        onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))}
                                        className="mt-2 w-full border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500"
                                        size={4}
                                    >
                                        <option value="">Seleccionar prospecto...</option>
                                        {prospectosFiltrados.map((p) => (
                                            <option key={p._id} value={p._id}>
                                                {p.nombres} {p.apellidoPaterno} — {p.empresa || 'Sin empresa'}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => { setModalAbierto(false); setModalCrearAbierto(true); }}
                                        className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
                                    >
                                        ¿No está? Crear nuevo prospecto
                                    </button>
                                </div>

                                {/* Tipo de actividad */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de interacción</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {TIPOS_ACTIVIDAD.map((t) => {
                                            const Icon = t.icon;
                                            return (
                                                <button
                                                    key={t.value}
                                                    type="button"
                                                    onClick={() => setForm((f) => ({ ...f, tipo: t.value }))}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                                                        form.tipo === t.value
                                                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    {t.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Resultado (solo para llamadas) */}
                                {form.tipo === 'llamada' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Resultado</label>
                                        <div className="flex gap-2">
                                            {RESULTADOS.map((r) => {
                                                const Icon = r.icon;
                                                return (
                                                    <button
                                                        key={r.value}
                                                        type="button"
                                                        onClick={() => setForm((f) => ({ ...f, resultado: r.value }))}
                                                        className={`flex items-center gap-1 px-3 py-2 rounded-lg border-2 transition-all ${
                                                            form.resultado === r.value
                                                                ? 'border-teal-500 bg-teal-50'
                                                                : 'border-slate-200'
                                                        }`}
                                                    >
                                                        <Icon className="w-4 h-4" />
                                                        {r.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Fecha cita */}
                                {form.tipo === 'cita' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora</label>
                                        <input
                                            type="datetime-local"
                                            value={form.fechaCita}
                                            onChange={(e) => setForm((f) => ({ ...f, fechaCita: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                        />
                                    </div>
                                )}

                                {/* Notas */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                                    <textarea
                                        value={form.notas}
                                        onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                                        rows={3}
                                        placeholder="Detalles de la interacción..."
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setModalAbierto(false);
                                        setForm({ clienteId: '', tipo: 'llamada', resultado: 'pendiente', notas: '', fechaCita: '' });
                                    }}
                                    className="flex-1 px-4 py-2 border border-slate-200 text-gray-700 rounded-lg hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleRegistrar}
                                    disabled={loadingRegistro || !form.clienteId}
                                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingRegistro ? 'Guardando...' : 'Registrar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear Prospecto */}
            {modalCrearAbierto && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Crear prospecto</h2>
                            <p className="text-sm text-gray-500 mb-4">Aparecerá en Prospectos y podrás registrar actividades.</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                                    <input
                                        type="text"
                                        value={formCrear.nombres}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, nombres: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                        placeholder="Juan"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido paterno *</label>
                                    <input
                                        type="text"
                                        value={formCrear.apellidoPaterno}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, apellidoPaterno: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                        placeholder="García"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido materno</label>
                                    <input
                                        type="text"
                                        value={formCrear.apellidoMaterno}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, apellidoMaterno: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                        placeholder="López"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                                    <input
                                        type="tel"
                                        value={formCrear.telefono}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, telefono: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                        placeholder="55 1234 5678"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Correo *</label>
                                    <input
                                        type="email"
                                        value={formCrear.correo}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, correo: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                        placeholder="correo@ejemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                                    <input
                                        type="text"
                                        value={formCrear.empresa}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, empresa: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                        placeholder="Mi Empresa SA"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                                    <textarea
                                        value={formCrear.notas}
                                        onChange={(e) => setFormCrear((f) => ({ ...f, notas: e.target.value }))}
                                        rows={2}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                        placeholder="Notas opcionales"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setModalCrearAbierto(false);
                                        setFormCrear({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefono: '', correo: '', empresa: '', notas: '' });
                                    }}
                                    className="flex-1 px-4 py-2 border border-slate-200 text-gray-700 rounded-lg hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCrearProspecto}
                                    disabled={loadingCrear}
                                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                                >
                                    {loadingCrear ? 'Creando...' : 'Crear'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProspectorSeguimiento;
