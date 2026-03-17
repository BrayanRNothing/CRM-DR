import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Search, Filter, Star, Plus, X, Phone, MessageSquare, ChevronRight } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { loadProspectos, saveProspectos } from '../../utils/prospectosStore';
import { getUser, getToken } from '../../utils/authUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const STATUS_OPTIONS = [
    { value: 'no_contactado', label: 'No contactado' },
    { value: 'contactado', label: 'Contactado' },
    { value: 're_llamar', label: 'Re-llamar' },
    { value: 'descartado', label: 'Descartado' }
];

const FILTERS = [
    { value: 'todos', label: 'Todos' },
    { value: 'no_contactado', label: 'No contactados' },
    { value: 'seguimiento', label: 'En seguimiento' },
    { value: 'transferido', label: 'Transferidos' },
    { value: 'descartado', label: 'Descartados' }
];


const applyStatusRules = (prospecto) => {
    const next = { ...prospecto };

    if (next.citaConfirmada) {
        next.status = 'transferido';
        return next;
    }

    if (next.status === 'descartado') {
        next.contactado = false;
        next.reLlamar = false;
        return next;
    }

    if (next.reLlamar || next.status === 're_llamar') {
        next.status = 're_llamar';
        next.reLlamar = true;
        next.contactado = true;
        return next;
    }

    if (next.contactado || next.status === 'contactado') {
        next.status = 'contactado';
        next.contactado = true;
        next.reLlamar = false;
        return next;
    }

    next.status = 'no_contactado';
    next.contactado = false;
    next.reLlamar = false;
    return next;
};

const ETAPA_LABELS = {
    prospecto_nuevo: 'Nuevo',
    en_contacto: 'En contacto',
    reunion_agendada: 'Cita agendada',
    reunion_realizada: 'Reunión realizada',
    en_negociacion: 'En negociación',
    venta_ganada: 'Ganado',
    perdido: 'Perdido'
};

const CRMProspectos = () => {
    const location = useLocation();
    const esProspector = location.pathname.includes('/prospector/');
    const [prospectos, setProspectos] = useState(() => loadProspectos());
    const [prospectosApi, setProspectosApi] = useState([]);
    const [loadingApi, setLoadingApi] = useState(esProspector);
    const [usandoApi, setUsandoApi] = useState(false);
    const [modalCrearApi, setModalCrearApi] = useState(false);
    const [loadingCrearApi, setLoadingCrearApi] = useState(false);
    const [formCrearApi, setFormCrearApi] = useState({
        nombres: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        telefono: '',
        correo: '',
        empresa: '',
        notas: ''
    });
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState('todos');
    const [modalAbierto, setModalAbierto] = useState(false);
    const currentUser = getUser();
    const userName =
        currentUser?.nombre || currentUser?.username || currentUser?.email || 'Usuario';
    const [nuevoProspecto, setNuevoProspecto] = useState({
        nombre: '',
        empresa: '',
        ubicacion: '',
        correo: '',
        telefono: '',
        notas: '',
        fechaRegistro: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        saveProspectos(prospectos);
    }, [prospectos]);

    useEffect(() => {
        if (!esProspector) return;
        const token = getToken();
        if (!token) {
            setLoadingApi(false);
            return;
        }
        const cargar = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/prospector/prospectos`, {
                    headers: { 'x-auth-token': token }
                });
                setProspectosApi(res.data);
                setUsandoApi(true);
            } catch {
                setUsandoApi(false);
            } finally {
                setLoadingApi(false);
            }
        };
        cargar();
    }, [esProspector]);

    const handleCrearProspectoApi = async () => {
        const { nombres, apellidoPaterno, telefono, correo } = formCrearApi;
        if (!nombres?.trim() || !apellidoPaterno?.trim() || !telefono?.trim() || !correo?.trim()) {
            return;
        }
        setLoadingCrearApi(true);
        try {
            await axios.post(
                `${API_URL}/api/prospector/crear-prospecto`,
        formCrearApi,
        { headers: { 'x-auth-token': getToken() || '' } }
            );
            setModalCrearApi(false);
            setFormCrearApi({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefono: '', correo: '', empresa: '', notas: '' });
            const res = await axios.get(`${API_URL}/api/prospector/prospectos`, {
                headers: { 'x-auth-token': getToken() || '' }
            });
            setProspectosApi(res.data);
            toast.success('Prospecto creado');
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error al crear');
        } finally {
            setLoadingCrearApi(false);
        }
    };

    const actualizarProspecto = (id, patch) => {
        setProspectos((prev) =>
            prev.map((prospecto) => {
                if (prospecto.id !== id) return prospecto;
                const updatedPatch = { ...patch };
                if (
                    (updatedPatch.citaConfirmada === true || updatedPatch.status === 'transferido') &&
                    !prospecto.vendedor
                ) {
                    updatedPatch.vendedor = userName;
                }
                const actualizado = applyStatusRules({ ...prospecto, ...updatedPatch });
                return actualizado;
            })
        );
    };

    const eliminarProspecto = (id) => {
        setProspectos((prev) => prev.filter((prospecto) => prospecto.id !== id));
    };

    const crearProspecto = () => {

        const nuevoId = Math.max(...prospectos.map((p) => p.id), 0) + 1;
        const prospecto = {
            id: nuevoId,
            ...nuevoProspecto,
            contactado: false,
            ultimoContactoFecha: '',
            ultimoContactoHora: '',
            medioContacto: 'telefono',
            interes: 3,
            notas: nuevoProspecto.notas || '',
            intentosLlamadas: 0,
            mensajeWhatsapp: false,
            mensajeCorreo: false,
            citaFecha: '',
            citaHora: '',
            citaConfirmada: false,
            status: 'no_contactado',
            reLlamar: false,
            proximaLlamadaFecha: '',
            proximaLlamadaHora: ''
        };

        setProspectos((prev) => [...prev, prospecto]);
        setModalAbierto(false);
        setNuevoProspecto({
            nombre: '',
            empresa: '',
            ubicacion: '',
            correo: '',
            telefono: '',
            notas: '',
            fechaRegistro: new Date().toISOString().split('T')[0]
        });
    };

    const cierreModal = () => {
        setModalAbierto(false);
        setNuevoProspecto({
            nombre: '',
            empresa: '',
            ubicacion: '',
            correo: '',
            telefono: '',
            notas: '',
            fechaRegistro: new Date().toISOString().split('T')[0]
        });
    };

    const prospectosFiltrados = useMemo(() => {
        return prospectos.filter((prospecto) => {
            const matchBusqueda =
                busqueda === '' ||
                prospecto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                prospecto.empresa.toLowerCase().includes(busqueda.toLowerCase()) ||
                prospecto.correo.toLowerCase().includes(busqueda.toLowerCase()) ||
                prospecto.telefono.includes(busqueda);

            const matchFiltro =
                filtro === 'todos' ||
                (filtro === 'seguimiento' &&
                    (prospecto.status === 'contactado' || prospecto.status === 're_llamar')) ||
                prospecto.status === filtro;
            return matchBusqueda && matchFiltro;
        });
    }, [prospectos, busqueda, filtro]);

    const getFilterCount = (filterValue) => {
        if (filterValue === 'todos') {
            return prospectos.length;
        }
        if (filterValue === 'seguimiento') {
            return prospectos.filter(
                (p) => p.status === 'contactado' || p.status === 're_llamar'
            ).length;
        }
        return prospectos.filter((p) => p.status === filterValue).length;
    };

    const prospectosApiFiltrados = prospectosApi.filter((p) => {
        const q = busqueda.toLowerCase();
        const nombre = `${p.nombres || ''} ${p.apellidoPaterno || ''}`.toLowerCase();
        const empresa = (p.empresa || '').toLowerCase();
        const telefono = (p.telefono || '').replace(/\s/g, '');
        if (!q) return true;
        return nombre.includes(q) || empresa.includes(q) || telefono.includes(q);
    });

    // Vista simplificada sincronizada para prospector (API)
    if (esProspector && (usandoApi || loadingApi)) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="max-w-[1200px] mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Oportunidades / Prospectos</h1>
                            <p className="text-gray-500">
                                Vista simple · Sincronizada con tu seguimiento
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setModalCrearApi(true)}
                                className="flex items-center gap-2 border border-teal-600 text-teal-600 hover:bg-teal-50 font-medium px-4 py-2 rounded-lg transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Agregar prospecto
                            </button>
                            <Link
                                to="/prospector/seguimiento"
                                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                            >
                                <Phone className="w-5 h-5" />
                                Ir a Seguimiento
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, empresa o teléfono..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                    </div>

                    {loadingApi ? (
                        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-gray-500">
                            Cargando prospectos...
                        </div>
                    ) : prospectosApiFiltrados.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-gray-500">
                            <p className="mb-4">No tienes prospectos asignados.</p>
                            <button
                                onClick={() => setModalCrearApi(true)}
                                className="text-teal-600 hover:text-teal-700 font-medium"
                            >
                                Crear tu primer prospecto
                            </button>
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
                                            <th className="px-4 py-3 text-center font-semibold">Etapa</th>
                                            <th className="px-4 py-3 text-left font-semibold">Última interacción</th>
                                            <th className="px-4 py-3 text-center font-semibold">Ir a Seguimiento</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {prospectosApiFiltrados.map((p) => (
                                            <tr key={p._id} className="hover:bg-slate-50/70">
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-gray-900">
                                                        {p.nombres} {p.apellidoPaterno}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{p.empresa || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <div className="space-y-0.5">
                                                        <p className="text-gray-700">{p.telefono}</p>
                                                        <p className="text-gray-500 text-xs">{p.correo}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        p.etapaEmbudo === 'reunion_agendada' ? 'bg-teal-100 text-teal-700' :
                                                        p.etapaEmbudo === 'en_contacto' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {ETAPA_LABELS[p.etapaEmbudo] || p.etapaEmbudo}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {p.ultimaInteraccion
                                                        ? new Date(p.ultimaInteraccion).toLocaleString('es-MX', {
                                                            dateStyle: 'short',
                                                            timeStyle: 'short'
                                                          })
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Link
                                                        to="/prospector/seguimiento"
                                                        className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium text-sm"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                        Registrar
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {modalCrearApi && (
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                                <div className="p-6">
                                    <h2 className="text-xl font-bold text-gray-900 mb-4">Crear prospecto</h2>
                                    <p className="text-sm text-gray-500 mb-4">Sincronizado con Seguimiento.</p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                                            <input
                                                type="text"
                                                value={formCrearApi.nombres}
                                                onChange={(e) => setFormCrearApi((f) => ({ ...f, nombres: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                                placeholder="Juan"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido paterno *</label>
                                            <input
                                                type="text"
                                                value={formCrearApi.apellidoPaterno}
                                                onChange={(e) => setFormCrearApi((f) => ({ ...f, apellidoPaterno: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                                placeholder="García"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido materno</label>
                                            <input
                                                type="text"
                                                value={formCrearApi.apellidoMaterno}
                                                onChange={(e) => setFormCrearApi((f) => ({ ...f, apellidoMaterno: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                                placeholder="López"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                                            <input
                                                type="tel"
                                                value={formCrearApi.telefono}
                                                onChange={(e) => setFormCrearApi((f) => ({ ...f, telefono: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                                placeholder="55 1234 5678"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Correo *</label>
                                            <input
                                                type="email"
                                                value={formCrearApi.correo}
                                                onChange={(e) => setFormCrearApi((f) => ({ ...f, correo: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                                placeholder="correo@ejemplo.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                                            <input
                                                type="text"
                                                value={formCrearApi.empresa}
                                                onChange={(e) => setFormCrearApi((f) => ({ ...f, empresa: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                                placeholder="Mi Empresa SA"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                                            <textarea
                                                value={formCrearApi.notas}
                                                onChange={(e) => setFormCrearApi((f) => ({ ...f, notas: e.target.value }))}
                                                rows={2}
                                                className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                                placeholder="Opcional"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => {
                                                setModalCrearApi(false);
                                                setFormCrearApi({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefono: '', correo: '', empresa: '', notas: '' });
                                            }}
                                            className="flex-1 px-4 py-2 border border-slate-200 text-gray-700 rounded-lg hover:bg-slate-50"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleCrearProspectoApi}
                                            disabled={loadingCrearApi || !formCrearApi.nombres?.trim() || !formCrearApi.apellidoPaterno?.trim() || !formCrearApi.telefono?.trim() || !formCrearApi.correo?.trim()}
                                            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loadingCrearApi ? 'Creando...' : 'Crear'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-[1400px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Prospectos</h1>
                        <p className="text-gray-500">Lista editable para seguimiento y transferencia.</p>
                    </div>
                    <button
                        onClick={() => setModalAbierto(true)}
                        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Agregar prospecto
                    </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, empresa, correo electrónico o teléfono..."
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Filter className="w-5 h-5 text-gray-400" />
                            {FILTERS.map((item) => (
                                <button
                                    key={item.value}
                                    onClick={() => setFiltro(item.value)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${filtro === item.value
                                            ? 'bg-teal-600 text-white border-teal-600'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    {item.label} ({getFilterCount(item.value)})
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {prospectosFiltrados.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-gray-500">
                        No hay prospectos con este filtro.
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs">
                                <thead className="bg-slate-100/70 text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Nombre</th>
                                        <th className="px-3 py-2 text-left">Empresa</th>
                                        <th className="px-3 py-2 text-left">Número de teléfono</th>
                                        <th className="px-3 py-2 text-left">Correo electrónico</th>
                                        <th className="px-3 py-2 text-left">Ubicación</th>
                                        <th className="px-3 py-2 text-left">Fecha Reg.</th>
                                        <th className="px-3 py-2 text-center">Contactado</th>
                                        <th className="px-3 py-2 text-left">Último contacto</th>
                                        <th className="px-3 py-2 text-left">Medio de contacto</th>
                                        <th className="px-3 py-2 text-center">Interés</th>
                                        <th className="px-3 py-2 text-left">Notas</th>
                                        <th className="px-3 py-2 text-center">Intentos llamada</th>
                                        <th className="px-3 py-2 text-center">Mensaje WhatsApp</th>
                                        <th className="px-3 py-2 text-center">Mensaje Correo</th>
                                        <th className="px-3 py-2 text-center">Re-llamar</th>
                                        <th className="px-3 py-2 text-left">Próxima llamada</th>
                                        <th className="px-3 py-2 text-left">Fecha reunión</th>
                                        <th className="px-3 py-2 text-left">Hora reunión</th>
                                        <th className="px-3 py-2 text-center">Cita confirmada</th>
                                        <th className="px-3 py-2 text-left">Estado</th>
                                        <th className="px-3 py-2 text-center">Eliminar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {prospectosFiltrados.map((prospecto) => (
                                        <tr key={prospecto.id} className="align-top transition-colors hover:bg-slate-50/70">
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={prospecto.nombre}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { nombre: event.target.value })
                                                    }
                                                    className="w-40 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={prospecto.empresa}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { empresa: event.target.value })
                                                    }
                                                    className="w-40 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={prospecto.telefono}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { telefono: event.target.value })
                                                    }
                                                    className="w-32 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="email"
                                                    value={prospecto.correo}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { correo: event.target.value })
                                                    }
                                                    className="w-48 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={prospecto.ubicacion}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { ubicacion: event.target.value })
                                                    }
                                                    className="w-32 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="date"
                                                    value={prospecto.fechaRegistro}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { fechaRegistro: event.target.value })
                                                    }
                                                    className="w-36 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={prospecto.contactado}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { contactado: event.target.checked })
                                                    }
                                                    className="h-4 w-4"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="date"
                                                        value={prospecto.ultimoContactoFecha}
                                                        onChange={(event) =>
                                                            actualizarProspecto(prospecto.id, {
                                                                ultimoContactoFecha: event.target.value
                                                            })
                                                        }
                                                        className="w-32 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                    />
                                                    <input
                                                        type="time"
                                                        value={prospecto.ultimoContactoHora}
                                                        onChange={(event) =>
                                                            actualizarProspecto(prospecto.id, {
                                                                ultimoContactoHora: event.target.value
                                                            })
                                                        }
                                                        className="w-24 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <select
                                                    value={prospecto.medioContacto}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { medioContacto: event.target.value })
                                                    }
                                                    className="w-28 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                >
                                                    <option value="telefono">Teléfono</option>
                                                    <option value="correo">Correo electrónico</option>
                                                    <option value="whatsapp">WhatsApp</option>
                                                </select>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1 text-yellow-500">
                                                    {[1, 2, 3, 4, 5].map((value) => (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            onClick={() => actualizarProspecto(prospecto.id, { interes: value })}
                                                        >
                                                            <Star
                                                                className={`w-4 h-4 ${prospecto.interes >= value ? 'fill-yellow-400' : 'fill-none'
                                                                    }`}
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <textarea
                                                    value={prospecto.notas}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { notas: event.target.value })
                                                    }
                                                    rows={2}
                                                    className="w-48 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={prospecto.intentosLlamadas}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, {
                                                            intentosLlamadas: Number(event.target.value)
                                                        })
                                                    }
                                                    className="w-16 bg-white border border-slate-200 rounded-md px-2 py-1 text-center focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={prospecto.mensajeWhatsapp}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, {
                                                            mensajeWhatsapp: event.target.checked
                                                        })
                                                    }
                                                    className="h-4 w-4"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={prospecto.mensajeCorreo}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, {
                                                            mensajeCorreo: event.target.checked
                                                        })
                                                    }
                                                    className="h-4 w-4"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={prospecto.reLlamar}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { reLlamar: event.target.checked })
                                                    }
                                                    className="h-4 w-4"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="date"
                                                        value={prospecto.proximaLlamadaFecha}
                                                        onChange={(event) =>
                                                            actualizarProspecto(prospecto.id, {
                                                                proximaLlamadaFecha: event.target.value
                                                            })
                                                        }
                                                        className="w-32 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                    />
                                                    <input
                                                        type="time"
                                                        value={prospecto.proximaLlamadaHora}
                                                        onChange={(event) =>
                                                            actualizarProspecto(prospecto.id, {
                                                                proximaLlamadaHora: event.target.value
                                                            })
                                                        }
                                                        className="w-24 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="date"
                                                    value={prospecto.citaFecha}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { citaFecha: event.target.value })
                                                    }
                                                    className="w-32 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="time"
                                                    value={prospecto.citaHora}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { citaHora: event.target.value })
                                                    }
                                                    className="w-24 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={prospecto.citaConfirmada}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, {
                                                            citaConfirmada: event.target.checked
                                                        })
                                                    }
                                                    className="h-4 w-4"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <select
                                                    value={prospecto.status === 'transferido' ? 'transferido' : prospecto.status}
                                                    disabled={prospecto.status === 'transferido'}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, {
                                                            status: event.target.value,
                                                            reLlamar: event.target.value === 're_llamar',
                                                            contactado: event.target.value !== 'no_contactado'
                                                        })
                                                    }
                                                    className="w-32 bg-white border border-slate-200 rounded-md px-2 py-1 disabled:bg-slate-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                >
                                                    {STATUS_OPTIONS.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                    <option value="transferido">Transferido</option>
                                                </select>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm('¿Eliminar prospecto?')) {
                                                            eliminarProspecto(prospecto.id);
                                                        }
                                                    }}
                                                    className="text-red-600 hover:text-red-700 text-xs font-semibold"
                                                >
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {modalAbierto && (
                    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl border border-slate-200">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Nuevo Prospecto</h2>
                                <button
                                    onClick={cierreModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                                    <input
                                        type="text"
                                        value={nuevoProspecto.nombre}
                                        onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, nombre: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800"
                                        placeholder="Nombre completo"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la empresa</label>
                                    <input
                                        type="text"
                                        value={nuevoProspecto.empresa}
                                        onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, empresa: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800"
                                        placeholder="Nombre de la empresa"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de teléfono</label>
                                    <input
                                        type="tel"
                                        value={nuevoProspecto.telefono}
                                        onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, telefono: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800"
                                        placeholder="10 dígitos"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                                    <input
                                        type="email"
                                        value={nuevoProspecto.correo}
                                        onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, correo: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800"
                                        placeholder="correo@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                                    <input
                                        type="text"
                                        value={nuevoProspecto.ubicacion}
                                        onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, ubicacion: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800"
                                        placeholder="Ciudad"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                                    <textarea
                                        rows={3}
                                        value={nuevoProspecto.notas}
                                        onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, notas: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800"
                                        placeholder="Notas adicionales"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de registro</label>
                                    <input
                                        type="date"
                                        value={nuevoProspecto.fechaRegistro}
                                        onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, fechaRegistro: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={cierreModal}
                                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={crearProspecto}
                                    className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
                                >
                                    Crear
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CRMProspectos;
