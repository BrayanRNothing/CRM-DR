import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';

/**
 * PLANTILLA BASE PARA PÁGINAS
 * 
 * Copia este archivo y personaliza:
 * 1. Cambia el nombre del componente
 * 2. Actualiza el título y descripción
 * 3. Modifica los datos mock según tu necesidad
 * 4. Personaliza los filtros y búsqueda
 */

const PageTemplate = () => {
    // Estado para datos
    const [items, setItems] = useState([
        { id: 1, nombre: 'Item 1', estado: 'activo' },
        { id: 2, nombre: 'Item 2', estado: 'inactivo' },
    ]);

    // Estado para filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState('todos');

    // Filtrado de items
    const itemsFiltrados = items.filter(item => {
        const matchBusqueda = busqueda === '' ||
            item.nombre.toLowerCase().includes(busqueda.toLowerCase());
        const matchFiltro = filtro === 'todos' || item.estado === filtro;
        return matchBusqueda && matchFiltro;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white">
                                Título de la Página
                            </h1>
                            <p className="text-gray-400 mt-1">Descripción breve</p>
                        </div>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/50">
                            <Plus className="w-5 h-5" />
                            Nuevo Item
                        </button>
                    </div>

                    {/* Filtros */}
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Búsqueda */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="w-full bg-gray-900/50 border border-gray-600 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Filtros */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFiltro('todos')}
                                    className={`px-4 py-2 rounded-lg transition-all ${filtro === 'todos'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setFiltro('activo')}
                                    className={`px-4 py-2 rounded-lg transition-all ${filtro === 'activo'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    Activos
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contenido Principal */}
                <div className="grid gap-4">
                    {itemsFiltrados.length === 0 ? (
                        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-12 text-center">
                            <p className="text-gray-400 text-lg">No hay items</p>
                        </div>
                    ) : (
                        itemsFiltrados.map((item) => (
                            <div
                                key={item.id}
                                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all"
                            >
                                <h3 className="text-xl font-semibold text-white">{item.nombre}</h3>
                                <p className="text-gray-400 mt-2">Estado: {item.estado}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default PageTemplate;
