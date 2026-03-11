import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Search, Filter, Star, Plus, X, Phone, MessageSquare, ChevronRight, User, Building2, Mail, MapPin, Calendar, FileText, Edit2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { loadProspectos, saveProspectos } from '../../utils/prospectosStore';
import { getUser, getToken } from '../../utils/authUtils';

import API_URL from '../../services/api';
import socket from '../../config/socket';

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
    const [loadingApi, setLoadingApi] = useState(true);
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
    const [modalEditarApi, setModalEditarApi] = useState(false);
    const [loadingEditarApi, setLoadingEditarApi] = useState(false);
    const [prospectoAEditar, setProspectoAEditar] = useState({
        id: null, nombre: '', empresa: '', ubicacion: '', correo: '', telefono: '', notas: ''
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
        const token = getToken();
        if (!token) {
            setLoadingApi(false);
            return;
        }

        const url = esProspector
            ? `${API_URL}/api/prospector/prospectos`
            : `${API_URL}/api/closer/prospectos`;

        const cargar = async () => {
            try {
                const res = await axios.get(url, {
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

        // 🔄 Polling de copia de seguridad cada 5 min (opcional)
        const interval = setInterval(cargar, 5 * 60 * 1000);

        // 🚀 WEBSOCKETS REFRESH AUTOMÁTICO
        socket.on('prospectos_actualizados', (obj) => {
            console.log('socket: prospectos actualizados detectado', obj);
            cargar();
        });

        return () => {
            clearInterval(interval);
            socket.off('prospectos_actualizados');
        };
    }, [esProspector]);

    const handleCrearProspectoApi = async () => {
        const { nombre, empresa, telefono, correo, ubicacion, fechaRegistro, notas } = nuevoProspecto;

        // We split 'nombre' into nombres and apellidoPaterno for the backend since the UI only asks for "Nombre Completo"
        const parts = nombre ? nombre.trim().split(' ') : [];
        const nombres = parts.length > 0 ? parts[0] : '';
        const apellidoPaterno = parts.length > 1 ? parts.slice(1).join(' ') : '';

        if (!nombres || !telefono) {
            toast.error('El nombre y el teléfono son obligatorios.');
            return;
        }

        const payload = {
            nombres,
            apellidoPaterno,
            apellidoMaterno: '',
            telefono,
            correo: correo || '',
            empresa: empresa || '',
            ubicacion: ubicacion || '',
            notas: notas || ''
        };

        setLoadingCrearApi(true);
        try {
            await axios.post(
                `${API_URL}/api/prospector/crear-prospecto`,
                payload,
                { headers: { 'x-auth-token': getToken() || '' } }
            );

            const url = esProspector
                ? `${API_URL}/api/prospector/prospectos`
                : `${API_URL}/api/closer/prospectos`;

            const res = await axios.get(url, {
                headers: { 'x-auth-token': getToken() || '' }
            });
            setProspectosApi(res.data);
            toast.success('Prospecto creado exitosamente');
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error al crear prospecto');
        } finally {
            setLoadingCrearApi(false);
        }
    };

    const abrirModalEditar = (p) => {
        setProspectoAEditar({
            id: p._id || p.id,
            nombre: `${p.nombres || ''} ${p.apellidoPaterno || ''}`.trim(),
            empresa: p.empresa || '',
            ubicacion: p.ubicacion || '',
            correo: p.correo || '',
            telefono: p.telefono || '',
            notas: p.notas || ''
        });
        setModalEditarApi(true);
    };

    const handleEditarProspectoApi = async () => {
        const { id, nombre, empresa, telefono, correo, ubicacion, notas } = prospectoAEditar;
        const parts = nombre ? nombre.trim().split(' ') : [];
        const nombres = parts.length > 0 ? parts[0] : '';
        const apellidoPaterno = parts.length > 1 ? parts.slice(1).join(' ') : '';

        if (!nombres || !telefono) {
            toast.error('El nombre y el teléfono son obligatorios.');
            return;
        }

        const payload = {
            nombres, apellidoPaterno, apellidoMaterno: '', telefono,
            correo: correo || '', empresa: empresa || '', ubicacion: ubicacion || '', notas: notas || ''
        };

        setLoadingEditarApi(true);
        try {
            const urlToEdit = esProspector
                ? `${API_URL}/api/prospector/prospectos/${id}/editar`
                : `${API_URL}/api/closer/prospectos/${id}/editar`;

            await axios.put(urlToEdit, payload, { headers: { 'x-auth-token': getToken() || '' } });

            const url = esProspector
                ? `${API_URL}/api/prospector/prospectos`
                : `${API_URL}/api/closer/prospectos`;

            const res = await axios.get(url, { headers: { 'x-auth-token': getToken() || '' } });
            setProspectosApi(res.data);
            toast.success('Prospecto actualizado exitosamente');
            setModalEditarApi(false);
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error al actualizar prospecto');
        } finally {
            setLoadingEditarApi(false);
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

    // Vista simplificada sincronizada (API) para ambos roles
    if (usandoApi || loadingApi) {
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
                                onClick={() => setModalAbierto(true)}
                                className="flex items-center gap-2 border border-blue-900 text-blue-900 hover:bg-blue-50 font-medium px-4 py-2 rounded-lg transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Agregar prospecto
                            </button>
                            <Link
                                to="/prospector/seguimiento"
                                className="flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white font-medium px-4 py-2 rounded-lg transition-colors"
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
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
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
                                onClick={() => setModalAbierto(true)}
                                className="text-blue-900 hover:text-blue-950 font-medium"
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
                                            <th className="px-4 py-3 text-center font-semibold">Acciones</th>
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
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.etapaEmbudo === 'reunion_agendada' ? 'bg-blue-100 text-blue-950' :
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
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button
                                                            onClick={() => abrirModalEditar(p)}
                                                            className="text-gray-400 hover:text-blue-900 transition-colors"
                                                            title="Editar Prospecto"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <Link
                                                            to="/prospector/seguimiento"
                                                            className="inline-flex items-center gap-1 text-blue-900 hover:text-blue-950 font-medium text-sm"
                                                            title="Ir a Seguimiento"
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                            Registrar
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {modalAbierto && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={cierreModal} />
                            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[85vh]">
                                <div className="flex-none bg-linear-to-r from-emerald-500 to-blue-900 p-6 sm:p-8 text-white flex justify-between items-start shadow-lg relative overflow-hidden z-10">
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-black tracking-tight mb-1">Nuevo Prospecto</h2>
                                        <p className="text-white/90 text-sm font-medium">Ingresa los datos del cliente potencial.</p>
                                    </div>
                                    <button onClick={cierreModal} className="relative z-10 p-2 rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white">
                                        <X size={24} strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 scrollbar-thin">
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 pl-1">Información Principal</label>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="group relative">
                                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 transition-colors" />
                                                    <input type="text" value={nuevoProspecto.nombre}
                                                        onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, nombre: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400"
                                                        placeholder="Nombre y Apellido" />
                                                </div>
                                                <div className="group relative">
                                                    <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 transition-colors" />
                                                    <input type="text" value={nuevoProspecto.empresa}
                                                        onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, empresa: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400"
                                                        placeholder="Empresa (Opcional)" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="group relative">
                                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 transition-colors" />
                                                    <input type="tel" value={nuevoProspecto.telefono}
                                                        onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, telefono: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400"
                                                        placeholder="Teléfono" />
                                                </div>
                                                <div className="group relative">
                                                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 transition-colors" />
                                                    <input type="email" value={nuevoProspecto.correo}
                                                        onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, correo: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400"
                                                        placeholder="Correo (Opcional)" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex-none p-6 sm:p-8 pt-2 border-t border-gray-100 bg-white">
                                    <div className="flex gap-3">
                                        <button onClick={cierreModal}
                                            className="px-6 py-3.5 rounded-xl border-2 border-slate-100 text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 hover:border-slate-200 transition-all active:scale-95">
                                            Cancelar
                                        </button>
                                        <button onClick={esProspector || location.pathname.includes('/closer/') ? handleCrearProspectoApi : crearProspecto}
                                            disabled={loadingCrearApi || !nuevoProspecto.nombre?.trim() || !nuevoProspecto.telefono?.trim()}
                                            className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/30 disabled:opacity-50">
                                            {loadingCrearApi ? 'Creando...' : 'Crear Prospecto'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {modalEditarApi && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={() => setModalEditarApi(false)} />
                            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[85vh]">
                                <div className="flex-none bg-linear-to-r from-blue-500 to-blue-600 p-6 sm:p-8 text-white flex justify-between items-start shadow-lg relative overflow-hidden z-10">
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-black tracking-tight mb-1">Editar Prospecto</h2>
                                        <p className="text-white/90 text-sm font-medium">Modifica los datos del prospecto.</p>
                                    </div>
                                    <button onClick={() => setModalEditarApi(false)} className="relative z-10 p-2 rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white">
                                        <X size={24} strokeWidth={2.5} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 scrollbar-thin">
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 pl-1">Información Principal</label>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="group relative">
                                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 transition-colors" />
                                                    <input type="text" value={prospectoAEditar.nombre}
                                                        onChange={(e) => setProspectoAEditar({ ...prospectoAEditar, nombre: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400"
                                                        placeholder="Nombre y Apellido" />
                                                </div>
                                                <div className="group relative">
                                                    <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 transition-colors" />
                                                    <input type="text" value={prospectoAEditar.empresa}
                                                        onChange={(e) => setProspectoAEditar({ ...prospectoAEditar, empresa: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400"
                                                        placeholder="Empresa (Opcional)" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="group relative">
                                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 transition-colors" />
                                                    <input type="tel" value={prospectoAEditar.telefono}
                                                        onChange={(e) => setProspectoAEditar({ ...prospectoAEditar, telefono: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400"
                                                        placeholder="Teléfono" />
                                                </div>
                                                <div className="group relative">
                                                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 transition-colors" />
                                                    <input type="email" value={prospectoAEditar.correo}
                                                        onChange={(e) => setProspectoAEditar({ ...prospectoAEditar, correo: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400"
                                                        placeholder="Correo (Opcional)" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-none p-6 sm:p-8 pt-2 border-t border-gray-100 bg-white">
                                    <div className="flex gap-3">
                                        <button onClick={() => setModalEditarApi(false)}
                                            className="px-6 py-3.5 rounded-xl border-2 border-slate-100 text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 hover:border-slate-200 transition-all active:scale-95">
                                            Cancelar
                                        </button>
                                        <button onClick={handleEditarProspectoApi}
                                            disabled={loadingEditarApi || !prospectoAEditar.nombre?.trim() || !prospectoAEditar.telefono?.trim()}
                                            className="flex-1 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/30 disabled:opacity-50">
                                            {loadingEditarApi ? 'Guardando...' : 'Guardar Cambios'}
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
                        className="flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white font-medium px-4 py-2 rounded-lg transition-colors"
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
                                className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800"
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Filter className="w-5 h-5 text-gray-400" />
                            {FILTERS.map((item) => (
                                <button
                                    key={item.value}
                                    onClick={() => setFiltro(item.value)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${filtro === item.value
                                        ? 'bg-blue-900 text-white border-blue-900'
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
                                        <th className="px-3 py-2 text-left">Teléfono</th>
                                        <th className="px-3 py-2 text-left">Correo</th>
                                        <th className="px-3 py-2 text-left">Ubicación</th>
                                        <th className="px-3 py-2 text-left">Último contacto</th>
                                        <th className="px-3 py-2 text-left">Medio</th>
                                        <th className="px-3 py-2 text-center">Interés</th>
                                        <th className="px-3 py-2 text-left">Notas</th>
                                        <th className="px-3 py-2 text-left">Próxima llamada</th>
                                        <th className="px-3 py-2 text-left">Estado</th>
                                        <th className="px-3 py-2 text-center">Agendar</th>
                                        <th className="px-3 py-2 text-center">Cliente</th>
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
                                                    className="w-40 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={prospecto.empresa}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { empresa: event.target.value })
                                                    }
                                                    className="w-40 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={prospecto.telefono}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { telefono: event.target.value })
                                                    }
                                                    className="w-32 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="email"
                                                    value={prospecto.correo}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { correo: event.target.value })
                                                    }
                                                    className="w-48 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={prospecto.ubicacion}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { ubicacion: event.target.value })
                                                    }
                                                    className="w-32 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
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
                                                        className="w-32 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                                                    />
                                                    <input
                                                        type="time"
                                                        value={prospecto.ultimoContactoHora}
                                                        onChange={(event) =>
                                                            actualizarProspecto(prospecto.id, {
                                                                ultimoContactoHora: event.target.value
                                                            })
                                                        }
                                                        className="w-24 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <select
                                                    value={prospecto.medioContacto || ''}
                                                    onChange={(event) =>
                                                        actualizarProspecto(prospecto.id, { medioContacto: event.target.value })
                                                    }
                                                    className="w-28 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                                                >
                                                    <option value="telefono">Teléfono</option>
                                                    <option value="correo">Correo</option>
                                                    <option value="whatsapp">WhatsApp</option>
                                                </select>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1 text-yellow-500 justify-center">
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
                                                    className="w-48 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
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
                                                        className="w-32 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                                                    />
                                                    <input
                                                        type="time"
                                                        value={prospecto.proximaLlamadaHora}
                                                        onChange={(event) =>
                                                            actualizarProspecto(prospecto.id, {
                                                                proximaLlamadaHora: event.target.value
                                                            })
                                                        }
                                                        className="w-24 bg-white border border-slate-200 rounded-md px-2 py-1 focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                                                    />
                                                </div>
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
                                                    className="w-32 bg-white border border-slate-200 rounded-md px-2 py-1 disabled:bg-slate-100 focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
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
                                                    onClick={() => alert(`Agendar acción para: ${prospecto.nombre}`)}
                                                    className="bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors"
                                                >
                                                    Agendar
                                                </button>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm(`¿Transferir a ${prospecto.nombre} a clientes?`)) {
                                                            actualizarProspecto(prospecto.id, {
                                                                status: 'transferido',
                                                                reLlamar: false,
                                                                contactado: true
                                                            });
                                                        }
                                                    }}
                                                    className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors"
                                                >
                                                    Cliente
                                                </button>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm('¿Eliminar prospecto?')) {
                                                            eliminarProspecto(prospecto.id);
                                                        }
                                                    }}
                                                    className="text-red-600 hover:text-red-700 text-xs font-semibold transition-colors bg-red-50 hover:bg-red-100 px-2 py-1.5 rounded-md"
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={cierreModal} />
                        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[85vh]">

                            {/* Header */}
                            <div className="flex-none bg-linear-to-r from-emerald-500 to-blue-900 p-6 sm:p-8 text-white flex justify-between items-start shadow-lg relative overflow-hidden z-10">
                                <div className="relative z-10">
                                    <h2 className="text-2xl font-black tracking-tight mb-1">Nuevo Prospecto</h2>
                                    <p className="text-white/90 text-sm font-medium">Ingresa los datos del cliente potencial.</p>
                                </div>
                                <button onClick={cierreModal} className="relative z-10 p-2 rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white">
                                    <X size={24} strokeWidth={2.5} />
                                </button>
                                {/* Decorative circles */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 scrollbar-thin">

                                {/* Nombre & Empresa */}
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 pl-1">Información Principal</label>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="group relative">
                                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 transition-colors" />
                                                <input type="text" value={nuevoProspecto.nombre}
                                                    onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, nombre: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400"
                                                    placeholder="Nombre Completo" />
                                            </div>
                                            <div className="group relative">
                                                <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 transition-colors" />
                                                <input type="text" value={nuevoProspecto.empresa}
                                                    onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, empresa: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400"
                                                    placeholder="Empresa (Opcional)" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="group relative">
                                                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 transition-colors" />
                                                <input type="tel" value={nuevoProspecto.telefono}
                                                    onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, telefono: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400"
                                                    placeholder="Teléfono" />
                                            </div>
                                            <div className="group relative">
                                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 transition-colors" />
                                                <input type="email" value={nuevoProspecto.correo}
                                                    onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, correo: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400"
                                                    placeholder="Correo (Opcional)" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="group relative">
                                        <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 transition-colors" />
                                        <input type="text" value={nuevoProspecto.ubicacion}
                                            onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, ubicacion: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400"
                                            placeholder="Ubicación / Ciudad (Opcional)" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 pl-1">Detalles Adicionales</label>
                                        <div className="space-y-4">
                                            <div className="group relative">
                                                <FileText size={18} className="absolute left-4 top-3.5 text-emerald-500 transition-colors" />
                                                <textarea rows={3} value={nuevoProspecto.notas}
                                                    onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, notas: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400 resize-none"
                                                    placeholder="Notas o comentarios (Opcional)..." />
                                            </div>
                                            <div className="group relative">
                                                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 transition-colors" />
                                                <input type="date" value={nuevoProspecto.fechaRegistro}
                                                    onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, fechaRegistro: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl outline-none transition-all font-medium text-gray-700" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex-none p-6 sm:p-8 pt-2 border-t border-gray-100 bg-white">
                                <div className="flex gap-3">
                                    <button onClick={cierreModal}
                                        className="px-6 py-3.5 rounded-xl border-2 border-slate-100 text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 hover:border-slate-200 transition-all active:scale-95">
                                        Cancelar
                                    </button>
                                    <button onClick={esProspector ? handleCrearProspectoApi : crearProspecto}
                                        disabled={loadingCrearApi || !nuevoProspecto.nombre?.trim() || !nuevoProspecto.telefono?.trim()}
                                        className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/30 disabled:opacity-50">
                                        {loadingCrearApi ? 'Creando...' : 'Crear Prospecto'}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CRMProspectos;
