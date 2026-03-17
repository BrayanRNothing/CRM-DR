import React, { useState } from 'react';
import { Search, Filter, Calendar, UserPlus, Phone, Mail } from 'lucide-react';

const MOCK_PROSPECTOS = [
    {
        id: 1,
        nombres: 'Carlos',
        apellidoPaterno: 'Ramírez',
        apellidoMaterno: 'González',
        empresa: 'Tech Solutions',
        telefono: '555-0101',
        correo: 'carlos@techsolutions.com',
        etapaEmbudo: 'prospecto_nuevo',
        fechaCreacion: '2026-02-10'
    },
    {
        id: 2,
        nombres: 'Ana',
        apellidoPaterno: 'López',
        apellidoMaterno: 'Martínez',
        empresa: 'Marketing Pro',
        telefono: '555-0102',
        correo: 'ana@marketingpro.com',
        etapaEmbudo: 'en_contacto',
        fechaCreacion: '2026-02-08'
    },
    {
        id: 3,
        nombres: 'Roberto',
        apellidoPaterno: 'García',
        apellidoMaterno: 'Sánchez',
        empresa: 'Consultores SA',
        telefono: '555-0103',
        correo: 'roberto@consultores.com',
        etapaEmbudo: 'en_contacto',
        fechaCreacion: '2026-02-05'
    },
    {
        id: 4,
        nombres: 'María',
        apellidoPaterno: 'Hernández',
        apellidoMaterno: 'Pérez',
        empresa: 'Innovación Digital',
        telefono: '555-0104',
        correo: 'maria@innovacion.com',
        etapaEmbudo: 'reunion_agendada',
        fechaCreacion: '2026-02-01'
    }
];

const CLOSERS = [
    { id: '1', nombre: 'Fernando Ruiz' },
    { id: '2', nombre: 'César Morales' }
];

const ProspectorProspectos = () => {
    const [prospectos] = useState(MOCK_PROSPECTOS);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEtapa, setFiltroEtapa] = useState('todos');
    const [modalAgendar, setModalAgendar] = useState(null);
    const [fechaReunion, setFechaReunion] = useState('');
    const [closerSeleccionado, setCloserSeleccionado] = useState('');

    const prospectosFiltrados = prospectos.filter(p => {
        const matchBusqueda = busqueda === '' ||
            p.nombres.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.apellidoPaterno.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.empresa.toLowerCase().includes(busqueda.toLowerCase());

        const matchEtapa = filtroEtapa === 'todos' || p.etapaEmbudo === filtroEtapa;

        return matchBusqueda && matchEtapa;
    });

    const getEtapaColor = (etapa) => {
        switch (etapa) {
            case 'prospecto_nuevo': return 'bg-gray-500/20 text-gray-400';
            case 'en_contacto': return 'bg-teal-500/20 text-teal-400';
            case 'reunion_agendada': return 'bg-purple-500/20 text-purple-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    const getEtapaLabel = (etapa) => {
        switch (etapa) {
            case 'prospecto_nuevo': return 'Nuevo';
            case 'en_contacto': return 'En Contacto';
            case 'reunion_agendada': return 'Reunión Agendada';
            default: return etapa;
        }
    };

    const handleAgendarReunion = () => {
        alert(`Reunión agendada para ${fechaReunion} con ${CLOSERS.find(c => c.id === closerSeleccionado)?.nombre}`);
        setModalAgendar(null);
        setFechaReunion('');
        setCloserSeleccionado('');
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Mis Prospectos</h1>
                        <p className="text-gray-400 mt-1">{prospectos.length} prospectos asignados</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-md">
                            Datos de demostración
                        </span>
                        <button className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            Nuevo Prospecto
                        </button>
                    </div>
                </div>

                {/* Búsqueda y Filtros */}
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, empresa..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-teal-500"
                        />
                    </div>
                    <select
                        value={filtroEtapa}
                        onChange={(e) => setFiltroEtapa(e.target.value)}
                        className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                    >
                        <option value="todos">Todas las etapas</option>
                        <option value="prospecto_nuevo">Nuevo</option>
                        <option value="en_contacto">En Contacto</option>
                        <option value="reunion_agendada">Reunión Agendada</option>
                    </select>
                </div>

                {/* Tabla de Prospectos */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-900/50 border-b border-gray-700">
                            <tr>
                                <th className="text-left p-4 text-gray-400 font-semibold">Cliente</th>
                                <th className="text-left p-4 text-gray-400 font-semibold">Empresa</th>
                                <th className="text-left p-4 text-gray-400 font-semibold">Contacto</th>
                                <th className="text-center p-4 text-gray-400 font-semibold">Etapa</th>
                                <th className="text-center p-4 text-gray-400 font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prospectosFiltrados.map((prospecto) => (
                                <tr key={prospecto.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                                    <td className="p-4">
                                        <p className="text-white font-semibold">
                                            {prospecto.nombres} {prospecto.apellidoPaterno}
                                        </p>
                                        <p className="text-gray-400 text-sm">{prospecto.fechaCreacion}</p>
                                    </td>
                                    <td className="p-4 text-gray-300">{prospecto.empresa}</td>
                                    <td className="p-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-gray-300 text-sm">
                                                <Phone className="w-3 h-3" />
                                                {prospecto.telefono}
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-300 text-sm">
                                                <Mail className="w-3 h-3" />
                                                {prospecto.correo}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEtapaColor(prospecto.etapaEmbudo)}`}>
                                                {getEtapaLabel(prospecto.etapaEmbudo)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-2">
                                            <button className="px-3 py-1 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors text-sm">
                                                Llamar
                                            </button>
                                            {prospecto.etapaEmbudo !== 'reunion_agendada' && (
                                                <button
                                                    onClick={() => setModalAgendar(prospecto)}
                                                    className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
                                                >
                                                    Agendar Reunión
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Modal Agendar Reunión */}
                {modalAgendar && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
                            <h2 className="text-2xl font-bold text-white mb-4">Agendar Reunión</h2>
                            <p className="text-gray-400 mb-6">
                                Cliente: <span className="text-white font-semibold">
                                    {modalAgendar.nombres} {modalAgendar.apellidoPaterno}
                                </span>
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Fecha y Hora</label>
                                    <input
                                        type="datetime-local"
                                        value={fechaReunion}
                                        onChange={(e) => setFechaReunion(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Asignar a Closer</label>
                                    <select
                                        value={closerSeleccionado}
                                        onChange={(e) => setCloserSeleccionado(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                    >
                                        <option value="">Seleccionar closer...</option>
                                        {CLOSERS.map(closer => (
                                            <option key={closer.id} value={closer.id}>{closer.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setModalAgendar(null)}
                                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAgendarReunion}
                                    disabled={!fechaReunion || !closerSeleccionado}
                                    className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Agendar y Transferir
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProspectorProspectos;
