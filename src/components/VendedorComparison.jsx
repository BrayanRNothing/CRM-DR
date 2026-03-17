import React from 'react';
import { Users, TrendingUp, TrendingDown, Award } from 'lucide-react';

const VendedorComparison = ({ comparativa }) => {
    if (!comparativa || comparativa.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                No hay datos de vendedores disponibles
            </div>
        );
    }

    // Encontrar mejor y peor vendedor
    const mejorVendedor = comparativa[0]; // Ya viene ordenado por conversión global
    const peorVendedor = comparativa[comparativa.length - 1];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="w-6 h-6 text-blue-400" />
                    Comparativa de Vendedores
                </h3>
                <span className="text-sm text-gray-400">
                    {comparativa.length} vendedor{comparativa.length !== 1 ? 'es' : ''}
                </span>
            </div>

            {/* Tabla comparativa */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-700">
                            <th className="text-left p-3 text-gray-400 font-semibold text-sm">#</th>
                            <th className="text-left p-3 text-gray-400 font-semibold text-sm">Vendedor</th>
                            <th className="text-center p-3 text-gray-400 font-semibold text-sm">Contactos</th>
                            <th className="text-center p-3 text-gray-400 font-semibold text-sm">Llamadas</th>
                            <th className="text-center p-3 text-gray-400 font-semibold text-sm">Citas</th>
                            <th className="text-center p-3 text-gray-400 font-semibold text-sm">Negociación</th>
                            <th className="text-center p-3 text-gray-400 font-semibold text-sm">Ganados</th>
                            <th className="text-center p-3 text-gray-400 font-semibold text-sm">Conv. Global</th>
                            <th className="text-center p-3 text-gray-400 font-semibold text-sm">Tasa Cierre</th>
                        </tr>
                    </thead>
                    <tbody>
                        {comparativa.map((vendedor, index) => {
                            const esMejor = vendedor.vendedor.id === mejorVendedor.vendedor.id;
                            const esPeor = vendedor.vendedor.id === peorVendedor.vendedor.id && comparativa.length > 1;

                            return (
                                <tr
                                    key={vendedor.vendedor.id}
                                    className={`border-b border-gray-800 hover:bg-gray-800/30 transition-colors ${esMejor ? 'bg-green-500/10' : esPeor ? 'bg-red-500/10' : ''
                                        }`}
                                >
                                    {/* Posición */}
                                    <td className="p-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                                index === 1 ? 'bg-gray-400/20 text-gray-400' :
                                                    index === 2 ? 'bg-orange-500/20 text-orange-400' :
                                                        'bg-gray-700 text-gray-500'
                                            }`}>
                                            {index + 1}
                                        </div>
                                    </td>

                                    {/* Nombre */}
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <p className="text-white font-semibold">{vendedor.vendedor.nombre}</p>
                                                <p className="text-gray-500 text-xs">@{vendedor.vendedor.usuario}</p>
                                            </div>
                                            {esMejor && (
                                                <Award className="w-4 h-4 text-yellow-400" />
                                            )}
                                        </div>
                                    </td>

                                    {/* Etapas del embudo */}
                                    <td className="p-3 text-center text-gray-300">{vendedor.embudo.contacto_inicial}</td>
                                    <td className="p-3 text-center text-gray-300">{vendedor.embudo.llamadas}</td>
                                    <td className="p-3 text-center text-gray-300">{vendedor.embudo.citas}</td>
                                    <td className="p-3 text-center text-gray-300">{vendedor.embudo.negociacion}</td>
                                    <td className="p-3 text-center">
                                        <span className="text-green-400 font-semibold">{vendedor.embudo.ganado}</span>
                                    </td>

                                    {/* Conversión Global */}
                                    <td className="p-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <span className={`font-bold ${vendedor.metricas.conversionGlobal >= 50 ? 'text-green-400' :
                                                    vendedor.metricas.conversionGlobal >= 30 ? 'text-yellow-400' :
                                                        'text-red-400'
                                                }`}>
                                                {vendedor.metricas.conversionGlobal}%
                                            </span>
                                        </div>
                                    </td>

                                    {/* Tasa de Cierre */}
                                    <td className="p-3 text-center">
                                        <span className={`font-semibold ${vendedor.metricas.tasaCierre >= 50 ? 'text-green-400' :
                                                vendedor.metricas.tasaCierre >= 30 ? 'text-yellow-400' :
                                                    'text-red-400'
                                            }`}>
                                            {vendedor.metricas.tasaCierre}%
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Resumen de top performers */}
            {comparativa.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {/* Mejor vendedor */}
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            <h4 className="text-green-400 font-semibold">Mejor Rendimiento</h4>
                        </div>
                        <p className="text-white font-bold text-lg">{mejorVendedor.vendedor.nombre}</p>
                        <p className="text-gray-400 text-sm">
                            {mejorVendedor.metricas.conversionGlobal}% de conversión global
                        </p>
                    </div>

                    {/* Peor vendedor (necesita apoyo) */}
                    <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-5 h-5 text-orange-400" />
                            <h4 className="text-orange-400 font-semibold">Necesita Apoyo</h4>
                        </div>
                        <p className="text-white font-bold text-lg">{peorVendedor.vendedor.nombre}</p>
                        <p className="text-gray-400 text-sm">
                            {peorVendedor.metricas.conversionGlobal}% de conversión global
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendedorComparison;
