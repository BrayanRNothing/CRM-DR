import React, { useState } from 'react';
import { Users, Plus, Search, Filter } from 'lucide-react';
import DataGridTemplate from '../../components/templates/DataGridTemplate';
import DataCardTemplate from '../../components/templates/DataCardTemplate';

const Clientes = () => {
    const [clientes, setClientes] = useState([
        {
            id: 1,
            nombres: 'Carlos',
            apellidoPaterno: 'López',
            apellidoMaterno: 'Martínez',
            telefono: '5551111111',
            correo: 'carlos.lopez@empresa.com',
            empresa: 'Tech Solutions SA',
            estado: 'proceso'
        },
        {
            id: 2,
            nombres: 'Ana',
            apellidoPaterno: 'Rodríguez',
            apellidoMaterno: 'Sánchez',
            telefono: '5552222222',
            correo: 'ana.rodriguez@company.com',
            empresa: 'Digital Corp',
            estado: 'ganado'
        },
        {
            id: 3,
            nombres: 'Pedro',
            apellidoPaterno: 'Hernández',
            apellidoMaterno: 'González',
            telefono: '5553333333',
            correo: 'pedro.hernandez@business.com',
            empresa: 'Innovate Inc',
            estado: 'proceso'
        }
    ]);

    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');

    const getEstadoColor = (estado) => {
        switch (estado) {
            case 'ganado':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'perdido':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'proceso':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const clientesFiltrados = clientes.filter(cliente => {
        const matchEstado = filtroEstado === 'todos' || cliente.estado === filtroEstado;
        const matchBusqueda = busqueda === '' ||
            cliente.nombres.toLowerCase().includes(busqueda.toLowerCase()) ||
            cliente.apellidoPaterno.toLowerCase().includes(busqueda.toLowerCase()) ||
            cliente.empresa?.toLowerCase().includes(busqueda.toLowerCase());
        return matchEstado && matchBusqueda;
    });

    return (
        <div className="min-h-screen backdrop-blur-xs p-6">
            <div className="max-w-7xl mx-auto">

                {/* Filtros y búsqueda */}
                <div className="mb-6">
                    <div className="backdrop-blur-sm border border-white/10 rounded-xl p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Búsqueda */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o empresa..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="w-full bg-gray-900/50 border border-gray-600 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Filtro de estado */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFiltroEstado('todos')}
                                    className={`px-4 py-2 rounded-lg transition-all ${filtroEstado === 'todos'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setFiltroEstado('proceso')}
                                    className={`px-4 py-2 rounded-lg transition-all ${filtroEstado === 'proceso'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    En Proceso
                                </button>
                                <button
                                    onClick={() => setFiltroEstado('ganado')}
                                    className={`px-4 py-2 rounded-lg transition-all ${filtroEstado === 'ganado'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    Ganados
                                </button>
                                <button
                                    onClick={() => setFiltroEstado('perdido')}
                                    className={`px-4 py-2 rounded-lg transition-all ${filtroEstado === 'perdido'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    Perdidos
                                </button>
                            </div>

                            {/* Botón Agregar */}
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/50 whitespace-nowrap">
                                <Plus className="w-5 h-5" />
                                Nuevo
                            </button>
                        </div>
                    </div>
                </div>

                {/* Grid de clientes */}
                {clientesFiltrados.length === 0 ? (
                    <div className="backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
                        <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">No se encontraron clientes</p>
                    </div>
                ) : (
                    <DataGridTemplate>
                        {clientesFiltrados.map((cliente) => (
                            <DataCardTemplate
                                key={cliente.id}
                                title={`${cliente.nombres} ${cliente.apellidoPaterno}`}
                                subtitle={cliente.empresa || 'Sin empresa'}
                                secondaryText={cliente.correo}
                                status={cliente.estado === 'ganado' ? 'active' : cliente.estado === 'proceso' ? 'pending' : 'inactive'}
                                image={null}
                            />
                        ))}
                    </DataGridTemplate>
                )}
            </div>

        </div >
    );
};

export default Clientes;
