import React, { useState } from 'react';
import { TrendingUp, AlertCircle, DollarSign, Calendar } from 'lucide-react';

const MOCK_SEGUIMIENTO = [
    {
        id: 1,
        cliente: { nombres: 'Pedro', apellidoPaterno: 'Sánchez', empresa: 'Desarrollo Web' },
        etapa: 'en_negociacion',
        valorEstimado: 45000,
        probabilidad: 70,
        proximaAccion: 'Enviar propuesta final',
        fechaLimite: '2026-02-15'
    },
    {
        id: 2,
        cliente: { nombres: 'Laura', apellidoPaterno: 'Martínez', empresa: 'Consultoría Estratégica' },
        etapa: 'reunion_realizada',
        valorEstimado: 32000,
        probabilidad: 50,
        proximaAccion: 'Llamada de seguimiento',
        fechaLimite: '2026-02-13'
    },
    {
        id: 3,
        cliente: { nombres: 'Jorge', apellidoPaterno: 'Ramírez', empresa: 'Tech Innovations' },
        etapa: 'en_negociacion',
        valorEstimado: 58000,
        probabilidad: 85,
        proximaAccion: 'Reunión de cierre',
        fechaLimite: '2026-02-14'
    }
];

const CloserSeguimiento = () => {
    const [seguimiento] = useState(MOCK_SEGUIMIENTO);

    const getProbabilidadColor = (prob) => {
        if (prob >= 70) return 'text-green-400 bg-green-500/20';
        if (prob >= 40) return 'text-yellow-400 bg-yellow-500/20';
        return 'text-red-400 bg-red-500/20';
    };

    const getEtapaLabel = (etapa) => {
        switch (etapa) {
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
                        <h1 className="text-3xl font-bold text-white">Seguimiento</h1>
                        <p className="text-gray-400 mt-1">Oportunidades en proceso</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-md">
                        Datos de demostración
                    </span>
                </div>

                <div className="space-y-4">
                    {seguimiento.map((item) => (
                        <div key={item.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">
                                        {item.cliente.nombres} {item.cliente.apellidoPaterno}
                                    </h3>
                                    <p className="text-gray-400">{item.cliente.empresa}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getProbabilidadColor(item.probabilidad)}`}>
                                    {item.probabilidad}% probabilidad
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-400" />
                                    <div>
                                        <p className="text-gray-400 text-xs">Valor Estimado</p>
                                        <p className="text-white font-semibold">${item.valorEstimado.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-purple-400" />
                                    <div>
                                        <p className="text-gray-400 text-xs">Etapa</p>
                                        <p className="text-white font-semibold">{getEtapaLabel(item.etapa)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-400" />
                                    <div>
                                        <p className="text-gray-400 text-xs">Fecha Límite</p>
                                        <p className="text-white font-semibold">{item.fechaLimite}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-purple-400 mt-0.5" />
                                <div>
                                    <p className="text-purple-400 font-semibold text-sm">Próxima acción:</p>
                                    <p className="text-white">{item.proximaAccion}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CloserSeguimiento;
