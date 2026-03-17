import React, { useState } from 'react';
import { Search, User, Phone, Mail, Calendar } from 'lucide-react';

const MOCK_PROSPECTOS = [
    {
        id: 1,
        nombres: 'María',
        apellidoPaterno: 'Hernández',
        empresa: 'Innovación Digital',
        telefono: '555-0104',
        correo: 'maria@innovacion.com',
        etapaEmbudo: 'reunion_agendada',
        prospector: 'Alex Mendoza',
        fechaTransferencia: '2026-02-10'
    },
    {
        id: 2,
        nombres: 'Pedro',
        apellidoPaterno: 'Sánchez',
        empresa: 'Desarrollo Web',
        telefono: '555-0105',
        correo: 'pedro@desarrolloweb.com',
        etapaEmbudo: 'en_negociacion',
        prospector: 'Angel Torres',
        fechaTransferencia: '2026-02-08'
    },
    {
        id: 3,
        nombres: 'Laura',
        apellidoPaterno: 'Martínez',
        empresa: 'Consultoría Estratégica',
        telefono: '555-0106',
        correo: 'laura@consultoria.com',
        etapaEmbudo: 'reunion_realizada',
        prospector: 'Alex Mendoza',
        fechaTransferencia: '2026-02-09'
    }
];

const CloserProspectos = () => {
    const [prospectos] = useState(MOCK_PROSPECTOS);
    const [busqueda, setBusqueda] = useState('');

    const prospectosFiltrados = prospectos.filter(p =>
        p.nombres.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.apellidoPaterno.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.empresa.toLowerCase().includes(busqueda.toLowerCase())
    );

    const getEtapaColor = (etapa) => {
        switch (etapa) {
            case 'reunion_agendada': return 'bg-blue-500/20 text-blue-400';
            case 'reunion_realizada': return 'bg-cyan-500/20 text-cyan-400';
            case 'en_negociacion': return 'bg-orange-500/20 text-orange-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    const getEtapaLabel = (etapa) => {
        switch (etapa) {
            case 'reunion_agendada': return 'Reunión Agendada';
            case 'reunion_realizada': return 'Reunión Realizada';
            case 'en_negociacion': return 'En Negociación';
            default: return etapa;
        }
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Prospectos Asignados</h1>
                        <p className="text-gray-400 mt-1">{prospectos.length} clientes recibidos de prospectores</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-md">
                        Datos de demostración
                    </span>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, empresa..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    />
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-900/50 border-b border-gray-700">
                            <tr>
                                <th className="text-left p-4 text-gray-400 font-semibold">Cliente</th>
                                <th className="text-left p-4 text-gray-400 font-semibold">Empresa</th>
                                <th className="text-left p-4 text-gray-400 font-semibold">Contacto</th>
                                <th className="text-left p-4 text-gray-400 font-semibold">Prospector</th>
                                <th className="text-center p-4 text-gray-400 font-semibold">Etapa</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prospectosFiltrados.map((prospecto) => (
                                <tr key={prospecto.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                                    <td className="p-4">
                                        <p className="text-white font-semibold">
                                            {prospecto.nombres} {prospecto.apellidoPaterno}
                                        </p>
                                        <p className="text-gray-400 text-sm">Transferido: {prospecto.fechaTransferencia}</p>
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
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <User className="w-4 h-4" />
                                            {prospecto.prospector}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEtapaColor(prospecto.etapaEmbudo)}`}>
                                                {getEtapaLabel(prospecto.etapaEmbudo)}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CloserProspectos;
