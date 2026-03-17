import React, { useState } from 'react';
import { Search, DollarSign, Calendar, TrendingUp } from 'lucide-react';

const MOCK_CLIENTES = [
    {
        id: 1,
        nombres: 'Jorge',
        apellidoPaterno: 'Ramírez',
        empresa: 'Tech Innovations',
        telefono: '555-0107',
        correo: 'jorge@techinnovations.com',
        montoVenta: 58000,
        fechaCierre: '2026-02-11',
        prospector: 'Angel Torres'
    },
    {
        id: 2,
        nombres: 'Sofía',
        apellidoPaterno: 'González',
        empresa: 'Digital Marketing',
        telefono: '555-0108',
        correo: 'sofia@digitalmarketing.com',
        montoVenta: 42000,
        fechaCierre: '2026-02-08',
        prospector: 'Alex Mendoza'
    },
    {
        id: 3,
        nombres: 'Ricardo',
        apellidoPaterno: 'Torres',
        empresa: 'Soluciones Empresariales',
        telefono: '555-0109',
        correo: 'ricardo@soluciones.com',
        montoVenta: 65000,
        fechaCierre: '2026-02-05',
        prospector: 'Angel Torres'
    }
];

const CloserClientes = () => {
    const [clientes] = useState(MOCK_CLIENTES);
    const [busqueda, setBusqueda] = useState('');

    const clientesFiltrados = clientes.filter(c =>
        c.nombres.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.apellidoPaterno.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.empresa.toLowerCase().includes(busqueda.toLowerCase())
    );

    const totalVentas = clientes.reduce((sum, c) => sum + c.montoVenta, 0);
    const promedioVenta = totalVentas / clientes.length;

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Clientes Ganados</h1>
                        <p className="text-gray-400 mt-1">{clientes.length} ventas cerradas exitosamente</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-md">
                        Datos de demostración
                    </span>
                </div>

                {/* Resumen */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-8 h-8 text-green-400" />
                            <span className="text-3xl font-bold text-white">{clientes.length}</span>
                        </div>
                        <p className="text-gray-400">Clientes Ganados</p>
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
                        placeholder="Buscar cliente..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                    />
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-900/50 border-b border-gray-700">
                            <tr>
                                <th className="text-left p-4 text-gray-400 font-semibold">Cliente</th>
                                <th className="text-left p-4 text-gray-400 font-semibold">Empresa</th>
                                <th className="text-center p-4 text-gray-400 font-semibold">Monto</th>
                                <th className="text-center p-4 text-gray-400 font-semibold">Fecha Cierre</th>
                                <th className="text-left p-4 text-gray-400 font-semibold">Prospector</th>
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CloserClientes;
