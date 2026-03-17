import React, { useMemo, useState, useEffect } from 'react';
import { Search, Filter, Star, Plus, X, RefreshCw, ChevronRight, ArrowLeft, User, History, Trash2, AlertTriangle } from 'lucide-react';
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

    // Estados para la vista detallada
    const [prospectoSeleccionado, setProspectoSeleccionado] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);

    const getAuthHeaders = () => ({
        'x-auth-token': getToken() || ''
    });

    const getRole = () => {
        const userStr = localStorage.getItem('user');
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

    const cargarClientes = async () => {
        setLoading(true);
        try {
            const rol = getRole();
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
            const rol = getRole();
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
                <div className="max-w-[1000px] mx-auto space-y-6">
                    <button
                        onClick={() => setProspectoSeleccionado(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-5 h-5" /> Regresar a la lista
                    </button>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
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
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800">
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
                                <History className="w-5 h-5 text-teal-500" /> Historial de Acciones
                            </h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRole() === 'prospector'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                {getRole() === 'prospector' ? '🎯 Vista Prospector' : '🏁 Vista Closer'}
                            </span>
                        </div>
                        <div className="p-6">
                            {loadingTimeline ? (
                                <div className="text-center py-10">
                                    <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-2" />
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
            <div className="max-w-[1400px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
                        <p className="text-gray-500">Cartera de clientes ganados.</p>
                    </div>
                    <button
                        onClick={cargarClientes}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar clientes por nombre, empresa, teléfono..."
                            value={busqueda}
                            onChange={(event) => setBusqueda(event.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                        <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-4" />
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
                                            <td className="px-4 py-3 text-teal-600">{cliente.correo || '—'}</td>
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
