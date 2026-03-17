import React, { useState } from 'react';
import { Users, Plus, Search, UserCheck, UserX } from 'lucide-react';
import DataGridTemplate from '../../components/templates/DataGridTemplate';
import DataCardTemplate from '../../components/templates/DataCardTemplate';


const Vendedores = () => {
    const [vendedores, setVendedores] = useState([
        {
            id: 1,
            usuario: 'vendedor1',
            nombre: 'Juan Pérez',
            email: 'juan@infiniguard.com',
            telefono: '5559876543',
            activo: true,
            clientesAsignados: 12,
            ventasDelMes: 45000
        },
        {
            id: 2,
            usuario: 'vendedor2',
            nombre: 'María García',
            email: 'maria@infiniguard.com',
            telefono: '5558765432',
            activo: true,
            clientesAsignados: 10,
            ventasDelMes: 38000
        },
        {
            id: 3,
            usuario: 'vendedor3',
            nombre: 'Carlos López',
            email: 'carlos@infiniguard.com',
            telefono: '5557654321',
            activo: false,
            clientesAsignados: 0,
            ventasDelMes: 0
        }
    ]);

    const [busqueda, setBusqueda] = useState('');
    const [filtroActivo, setFiltroActivo] = useState('todos');

    const vendedoresFiltrados = vendedores.filter(vendedor => {
        const matchBusqueda = busqueda === '' ||
            vendedor.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            vendedor.usuario.toLowerCase().includes(busqueda.toLowerCase());

        const matchActivo = filtroActivo === 'todos' ||
            (filtroActivo === 'activos' && vendedor.activo) ||
            (filtroActivo === 'inactivos' && !vendedor.activo);

        return matchBusqueda && matchActivo;
    });

    return (
        <div className="min-h-screen backdrop-blur-xs p-6">
            <div className="max-w-7xl mx-auto">


                {/* Filtros */}
                <div className="mb-6">
                    <div className="backdrop-blur-sm border border-white/10 rounded-xl p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Búsqueda */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar vendedor..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="w-full bg-gray-900/50 border border-gray-600 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Filtro de estado */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFiltroActivo('todos')}
                                    className={`px-4 py-2 rounded-lg transition-all ${filtroActivo === 'todos'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setFiltroActivo('activos')}
                                    className={`px-4 py-2 rounded-lg transition-all ${filtroActivo === 'activos'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    Activos
                                </button>
                                <button
                                    onClick={() => setFiltroActivo('inactivos')}
                                    className={`px-4 py-2 rounded-lg transition-all ${filtroActivo === 'inactivos'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    Inactivos
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

                {/* Grid de vendedores */}
                {vendedoresFiltrados.length === 0 ? (
                    <div className="backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
                        <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">No se encontraron vendedores</p>
                    </div>
                ) : (
                    <DataGridTemplate>
                        {vendedoresFiltrados.map((vendedor) => (
                            <DataCardTemplate
                                key={vendedor.id}
                                title={vendedor.nombre}
                                subtitle={vendedor.usuario}
                                secondaryText={vendedor.email}
                                status={vendedor.activo ? 'active' : 'inactive'}
                                image={null}
                            />
                        ))}
                    </DataGridTemplate>
                )}
            </div>
        </div>
    );
};

export default Vendedores;
