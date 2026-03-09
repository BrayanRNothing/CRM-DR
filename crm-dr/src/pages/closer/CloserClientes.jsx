import React, { useState, useEffect } from 'react';
import { Search, DollarSign, Calendar, TrendingUp, RefreshCw, AlertCircle, Trash2, X } from 'lucide-react';
import axios from 'axios';

import API_URL from '../../config/api';

const CloserClientes = () => {
    const [clientes, setClientes] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [clienteAEliminar, setClienteAEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchClientesGanados = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                if (!token) throw new Error('No se encontró token de acceso');

                const res = await axios.get(`${API_URL}/api/closer/clientes-ganados`, {
                    headers: { 'x-auth-token': token }
                });

                // Mapeo seguro de datos que vienen de la tabla clientes (y tal vez ventas en un futuro)
                const dataMapeada = res.data.map(c => ({
                    id: c.id || c._id,
                    nombres: c.nombres || '',
                    apellidoPaterno: c.apellidoPaterno || '',
                    empresa: c.empresa || 'Sin empresa',
                    telefono: c.telefono || 'Sin teléfono',
                    correo: c.correo || 'Sin correo',
                    montoVenta: c.montoVenta || 0, // Nota: montoVenta podría requerir join con tabla ventas
                    fechaCierre: c.fechaUltimaEtapa ? new Date(c.fechaUltimaEtapa).toLocaleDateString('es-MX') : 'Fecha no disp.',
                    prospector: c.prospectorAsignado?.nombre || 'Desconocido'
                }));

                setClientes(dataMapeada);
            } catch (err) {
                console.error('Error al cargar clientes ganados:', err);
                setError('No se pudieron cargar los clientes cerrados');
            } finally {
                setLoading(false);
            }
        };

        fetchClientesGanados();
        const interval = setInterval(fetchClientesGanados, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleEliminarCliente = async () => {
        if (!clienteAEliminar) return;
        setEliminando(true);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/clientes/${clienteAEliminar.id}`, {
                headers: { 'x-auth-token': token }
            });
            setClientes(prev => prev.filter(c => c.id !== clienteAEliminar.id));
            setClienteAEliminar(null);
        } catch (err) {
            console.error('Error al eliminar cliente:', err);
            alert(err.response?.data?.mensaje || 'No se pudo eliminar el cliente.');
        } finally {
            setEliminando(false);
        }
    };

    const clientesFiltrados = clientes.filter(c =>
        c.nombres.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.apellidoPaterno.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.empresa.toLowerCase().includes(busqueda.toLowerCase())
    );

    const totalVentas = clientes.reduce((sum, c) => sum + (c.montoVenta || 0), 0);
    const promedioVenta = clientes.length > 0 ? totalVentas / clientes.length : 0;

    return (
        <>
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Clientes Ganados</h1>
                        <p className="text-gray-400 mt-1">{clientes.length} ventas cerradas exitosamente</p>
                    </div>
                </div>

                {/* Resumen */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-8 h-8 text-green-400" />
                            <span className="text-3xl font-bold text-white">{clientes.length}</span>
                        </div>
                        <p className="text-gray-400">Clientes Corrientes</p>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="w-8 h-8 text-green-400" />
                            <span className="text-3xl font-bold text-white">${totalVentas.toLocaleString()}</span>
                        </div>
                        <p className="text-gray-400">Valor Total</p>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="w-8 h-8 text-purple-400" />
                            <span className="text-3xl font-bold text-white">${promedioVenta.toLocaleString()}</span>
                        </div>
                        <p className="text-gray-400">Valor Promedio</p>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar cliente (Nombre, Apellido, o Empresa)..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                    />
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-gray-400 h-[400px]">
                            <RefreshCw className="w-8 h-8 animate-spin text-green-500 mb-4" />
                            <p>Cargando clientes cerrados...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center p-12 text-red-400 h-[400px]">
                            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                            <p>{error}</p>
                        </div>
                    ) : clientesFiltrados.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-gray-400 h-[400px]">
                            {busqueda ? (
                                <p>No se encontraron clientes que coincidan con la búsqueda.</p>
                            ) : (
                                <p>Aún no hay clientes cerrados para mostrar.</p>
                            )}
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-900/50 border-b border-gray-700">
                                <tr>
                                    <th className="text-left p-4 text-gray-400 font-semibold">Cliente</th>
                                    <th className="text-left p-4 text-gray-400 font-semibold">Empresa</th>
                                    <th className="text-center p-4 text-gray-400 font-semibold">Monto</th>
                                    <th className="text-center p-4 text-gray-400 font-semibold">Fecha Cierre</th>
                                    <th className="text-left p-4 text-gray-400 font-semibold">Prospector</th>
                                    <th className="text-center p-4 text-gray-400 font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientesFiltrados.map((cliente) => (
                                    <tr key={cliente.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                                        <td className="p-4">
                                            <p className="text-white font-semibold">
                                                {cliente.nombres} {cliente.apellidoPaterno}
                                            </p>
                                            <p className="text-gray-400 text-sm">{cliente.telefono}</p>
                                        </td>
                                        <td className="p-4 text-gray-300">{cliente.empresa}</td>
                                        <td className="p-4">
                                            <p className="text-center text-green-400 font-bold text-lg">
                                                ${cliente.montoVenta.toLocaleString()}
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2 text-gray-300">
                                                <Calendar className="w-4 h-4" />
                                                {cliente.fechaCierre}
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-300">{cliente.prospector}</td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => setClienteAEliminar(cliente)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors font-medium text-xs"
                                                title="Eliminar cliente"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>

        {/* Modal confirmación eliminar */}
        {clienteAEliminar && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="bg-gray-800 border border-red-500/30 rounded-2xl p-6 shadow-xl max-w-md w-full mx-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-400" />
                        </div>
                        <h2 className="text-lg font-bold text-white">Eliminar cliente</h2>
                    </div>
                    <p className="text-gray-300 mb-6">
                        ¿Estás seguro de eliminar a <strong className="text-white">{clienteAEliminar.nombres} {clienteAEliminar.apellidoPaterno}</strong>? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={() => setClienteAEliminar(null)}
                            disabled={eliminando}
                            className="px-4 py-2 rounded-xl bg-gray-700 text-gray-200 font-semibold hover:bg-gray-600 transition-colors"
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

export default CloserClientes;
