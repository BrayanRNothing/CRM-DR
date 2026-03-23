import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, ChevronRight, ArrowLeft, User, History, Trash2, Download, Upload, Plus, X } from 'lucide-react';
import axios from 'axios';
import { getToken } from '../../utils/authUtils';
import { loadProspectos, saveProspectos } from '../../utils/prospectosStore';
import { HistorialInteracciones } from '../../components/HistorialInteracciones';

import API_URL from '../../config/api';

const CRMClientes = () => {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [clienteAEliminar, setClienteAEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);
    const [importando, setImportando] = useState(false);
    const fileInputRef = useRef(null);
    const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
    const [creandoCliente, setCreandoCliente] = useState(false);
    const [formCliente, setFormCliente] = useState({
        nombres: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        telefono: '',
        correo: '',
        empresa: '',
        estado: 'proceso',
        etapaEmbudo: 'prospecto_nuevo'
    });

    // Estados para la vista detallada
    const [prospectoSeleccionado, setProspectoSeleccionado] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);

    const getAuthHeaders = () => ({
        'x-auth-token': getToken() || ''
    });

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
            const rol = getRolePath();
            const res = await axios.get(
                `${API_URL}/api/${rol}/clientes-ganados`,
                { headers: getAuthHeaders() }
            );
            setClientes(res.data || []);
        } catch (error) {
            console.error('Error al cargar clientes:', error);
            setClientes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarClientes();
        const interval = setInterval(cargarClientes, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleVerDetalles = async (cliente) => {
        setProspectoSeleccionado(cliente);
        setLoadingTimeline(true);
        try {
            const rol = getRolePath();
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
        if (!formCliente.nombres || !formCliente.apellidoPaterno || !formCliente.telefono || !formCliente.correo) {
            alert('Complete los campos requeridos: nombres, apellido paterno, teléfono y correo.');
            return;
        }

        setCreandoCliente(true);
        try {
            await axios.post(`${API_URL}/api/clientes`, formCliente, { headers: getAuthHeaders() });
            await cargarClientes();
            setMostrarModalCrear(false);
            setFormCliente({
                nombres: '',
                apellidoPaterno: '',
                apellidoMaterno: '',
                telefono: '',
                correo: '',
                empresa: '',
                estado: 'proceso',
                etapaEmbudo: 'prospecto_nuevo'
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
            return matchBusqueda;
        });
    }, [clientes, busqueda]);

    // VISTA DETALLADA
    if (prospectoSeleccionado) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="max-w-full mx-auto space-y-6">
                    <button
                        onClick={() => setProspectoSeleccionado(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-5 h-5" /> Regresar a la lista
                    </button>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-(--theme-100) rounded-full flex items-center justify-center text-(--theme-600)">
                                    <User className="w-8 h-8" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">
                                        {prospectoSeleccionado.nombres} {prospectoSeleccionado.apellidoPaterno}
                                    </h1>
                                    <p className="text-slate-500">{prospectoSeleccionado.empresa || 'Sin empresa'}</p>
                                    <div className="flex gap-4 mt-2 text-sm text-slate-500">
                                        <span>📞 {prospectoSeleccionado.telefono || '—'}</span>
                                        <span>📧 {prospectoSeleccionado.correo || '—'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-(--theme-100) text-(--theme-800)">
                                    ✓ Cliente Ganado
                                </span>
                                <p className="text-xs text-slate-400 mt-2">
                                    ID: {prospectoSeleccionado.id || prospectoSeleccionado._id}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <History className="w-5 h-5 text-(--theme-500)" /> Historial de Acciones
                            </h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRole() === 'prospector'
                                    ? 'bg-(--theme-100) text-(--theme-700)'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                {getRole() === 'prospector' ? '🎯 Vista Prospector' : '🏁 Vista Closer'}
                            </span>
                        </div>
                        <div className="p-6">
                            {loadingTimeline ? (
                                <div className="text-center py-10">
                                    <RefreshCw className="w-8 h-8 text-(--theme-500) animate-spin mx-auto mb-2" />
                                    <p className="text-slate-500">Cargando historial...</p>
                                </div>
                            ) : (
                                <HistorialInteracciones
                                    timeline={timeline}
                                    esProspector={getRole() === 'prospector'}
                                    onDeleteActividad={handleDeleteActividad}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-full mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
                        <p className="text-gray-500">Cartera de clientes ganados.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={handleImportarClientes}
                        />
                        <button
                            onClick={() => setMostrarModalCrear(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-(--theme-600) text-white rounded-lg hover:bg-(--theme-700) transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Crear Cliente
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importando}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                            {importando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {importando ? 'Importando...' : 'Importar CSV'}
                        </button>
                        <button
                            onClick={exportarClientesCsv}
                            disabled={loading || !clientesFiltrados.length}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Exportar CSV
                        </button>
                        <button
                            onClick={cargarClientes}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar clientes por nombre, empresa, teléfono..."
                            value={busqueda}
                            onChange={(event) => setBusqueda(event.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500)"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                        <RefreshCw className="w-8 h-8 text-(--theme-500) animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">Cargando clientes...</p>
                    </div>
                ) : clientesFiltrados.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-gray-500">
                        No hay clientes registrados aún.
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-100/70 text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Nombre</th>
                                        <th className="px-4 py-3 text-left">Empresa</th>
                                        <th className="px-4 py-3 text-left">Teléfono</th>
                                        <th className="px-4 py-3 text-left">Correo</th>
                                        <th className="px-4 py-3 text-left">Convertido el</th>
                                        <th className="px-4 py-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {clientesFiltrados.map((cliente) => (
                                        <tr key={cliente._id || cliente.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {cliente.nombres} {cliente.apellidoPaterno}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{cliente.empresa || '—'}</td>
                                            <td className="px-4 py-3 text-gray-600">{cliente.telefono || '—'}</td>
                                            <td className="px-4 py-3 text-(--theme-600)">{cliente.correo || '—'}</td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {cliente.fechaUltimaEtapa
                                                    ? new Date(cliente.fechaUltimaEtapa).toLocaleDateString('es-MX')
                                                    : '—'
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleVerDetalles(cliente)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                                                >
                                                    <History className="w-4 h-4" />
                                                    Ver Detalles
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setClienteAEliminar(cliente)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                                                    title="Eliminar cliente"
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
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Nombres *</label>
                            <input
                                type="text"
                                value={formCliente.nombres}
                                onChange={(e) => setFormCliente({ ...formCliente, nombres: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500)"
                                placeholder="Juan"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Apellido Paterno *</label>
                            <input
                                type="text"
                                value={formCliente.apellidoPaterno}
                                onChange={(e) => setFormCliente({ ...formCliente, apellidoPaterno: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500)"
                                placeholder="García"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Apellido Materno</label>
                            <input
                                type="text"
                                value={formCliente.apellidoMaterno}
                                onChange={(e) => setFormCliente({ ...formCliente, apellidoMaterno: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500)"
                                placeholder="López"
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
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
                            <select
                                value={formCliente.estado}
                                onChange={(e) => setFormCliente({ ...formCliente, estado: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500)"
                            >
                                <option value="proceso">Proceso</option>
                                <option value="ganado">Ganado</option>
                                <option value="perdido">Perdido</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Etapa Embudo</label>
                            <select
                                value={formCliente.etapaEmbudo}
                                onChange={(e) => setFormCliente({ ...formCliente, etapaEmbudo: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500)"
                            >
                                <option value="prospecto_nuevo">Prospecto Nuevo</option>
                                <option value="en_contacto">En Contacto</option>
                                <option value="reunion_agendada">Reunión Agendada</option>
                                <option value="reunion_realizada">Reunión Realizada</option>
                                <option value="en_negociacion">En Negociación</option>
                                <option value="venta_ganada">Venta Ganada</option>
                                <option value="perdido">Perdido</option>
                            </select>
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
};

export default CRMClientes;
