import React, { useMemo, useState, useEffect } from 'react';
import { Search, Filter, Star, Plus, X } from 'lucide-react';
import { loadProspectos, saveProspectos } from '../../utils/prospectosStore';

const CRMClientes = () => {
    // Cargar prospectos y filtrar solo los que son clientes (transferidos)
    const [prospectos, setProspectos] = useState(() => loadProspectos());
    const [busqueda, setBusqueda] = useState('');

    // Filtrar solo los que tienen status 'transferido' o 'cliente'
    const clientes = useMemo(() => {
        return prospectos.filter(p => p.status === 'transferido' || p.status === 'cliente');
    }, [prospectos]);

    useEffect(() => {
        saveProspectos(prospectos);
    }, [prospectos]);

    const actualizarCliente = (id, patch) => {
        setProspectos((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
        );
    };

    const clientesFiltrados = useMemo(() => {
        return clientes.filter((cliente) => {
            const matchBusqueda =
                busqueda === '' ||
                cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                cliente.empresa.toLowerCase().includes(busqueda.toLowerCase()) ||
                cliente.correo.toLowerCase().includes(busqueda.toLowerCase()) ||
                cliente.telefono.includes(busqueda);
            return matchBusqueda;
        });
    }, [clientes, busqueda]);


    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-[1400px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
                        <p className="text-gray-500">Cartera de clientes activos y transferidos.</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar clientes..."
                            value={busqueda}
                            onChange={(event) => setBusqueda(event.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                    </div>
                </div>

                {clientesFiltrados.length === 0 ? (
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
                                        <th className="px-4 py-3 text-left">Ubicación</th>
                                        <th className="px-4 py-3 text-left">Fecha Reg.</th>
                                        <th className="px-4 py-3 text-left">Notas</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {clientesFiltrados.map((cliente) => (
                                        <tr key={cliente.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={cliente.nombre}
                                                    onChange={(e) => actualizarCliente(cliente.id, { nombre: e.target.value })}
                                                    className="w-full bg-transparent border-none focus:ring-0 p-0"
                                                />
                                            </td>
                                            <td className="px-4 py-3">{cliente.empresa}</td>
                                            <td className="px-4 py-3">{cliente.telefono}</td>
                                            <td className="px-4 py-3 text-teal-600">{cliente.correo}</td>
                                            <td className="px-4 py-3">{cliente.ubicacion}</td>
                                            <td className="px-4 py-3">{cliente.fechaRegistro}</td>
                                            <td className="px-4 py-3">
                                                <textarea
                                                    value={cliente.notas}
                                                    onChange={(e) => actualizarCliente(cliente.id, { notas: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs"
                                                    rows={2}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Cliente
                                                </span>
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
    );
};

export default CRMClientes;
