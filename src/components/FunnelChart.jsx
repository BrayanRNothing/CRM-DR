import React from 'react';
import { TrendingDown, AlertTriangle } from 'lucide-react';

const FunnelChart = ({ data }) => {
    if (!data) return null;

    const { embudo, tasasConversion } = data;

    // Definir las etapas del embudo
    const etapas = [
        { key: 'contacto_inicial', label: 'Contacto Inicial', count: embudo.contacto_inicial, color: 'from-blue-500 to-blue-600' },
        { key: 'llamadas', label: 'Llamadas', count: embudo.llamadas, color: 'from-indigo-500 to-indigo-600', tasa: tasasConversion.llamadas },
        { key: 'citas', label: 'Citas', count: embudo.citas, color: 'from-purple-500 to-purple-600', tasa: tasasConversion.citas },
        { key: 'negociacion', label: 'Negociación', count: embudo.negociacion, color: 'from-pink-500 to-pink-600', tasa: tasasConversion.negociacion },
        { key: 'ganado', label: 'Venta Cerrada', count: embudo.ganado, color: 'from-green-500 to-green-600', tasa: tasasConversion.cierre }
    ];

    // Calcular porcentaje respecto al total
    const calcularPorcentaje = (count) => {
        return embudo.total > 0 ? ((count / embudo.total) * 100).toFixed(1) : 0;
    };

    // Determinar si una tasa es débil (< 30%)
    const esDebil = (tasa) => tasa !== undefined && tasa < 30;

    return (
        <div className="space-y-4">
            {/* Título */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Embudo de Ventas</h3>
                <div className="text-sm text-gray-400">
                    Total: <span className="text-white font-semibold">{embudo.total}</span> clientes
                </div>
            </div>

            {/* Embudo visual */}
            <div className="space-y-3">
                {etapas.map((etapa, index) => {
                    const porcentaje = calcularPorcentaje(etapa.count);
                    const anchoBase = 100;
                    const ancho = anchoBase - (index * 12); // Reducir ancho progresivamente
                    const debil = esDebil(etapa.tasa);

                    return (
                        <div key={etapa.key} className="relative">
                            {/* Barra del embudo */}
                            <div
                                className="mx-auto transition-all duration-300 hover:scale-105"
                                style={{ width: `${ancho}%` }}
                            >
                                <div className={`relative bg-gradient-to-r ${etapa.color} rounded-lg p-4 shadow-lg border ${debil ? 'border-red-500 border-2' : 'border-gray-700'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-white font-semibold">{etapa.label}</h4>
                                                {debil && (
                                                    <div className="flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded-full">
                                                        <AlertTriangle className="w-3 h-3 text-red-400" />
                                                        <span className="text-xs text-red-400 font-medium">Débil</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-white/80 text-sm mt-1">
                                                {etapa.count} clientes ({porcentaje}% del total)
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-bold text-white">{etapa.count}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Flecha y tasa de conversión */}
                            {index < etapas.length - 1 && etapa.tasa !== undefined && (
                                <div className="flex items-center justify-center my-2">
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${debil ? 'bg-red-500/20' : 'bg-gray-800/50'} border ${debil ? 'border-red-500' : 'border-gray-700'}`}>
                                        <TrendingDown className={`w-4 h-4 ${debil ? 'text-red-400' : 'text-gray-400'}`} />
                                        <span className={`text-sm font-semibold ${debil ? 'text-red-400' : 'text-gray-300'}`}>
                                            {etapa.tasa.toFixed(1)}% conversión
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Clientes perdidos */}
            {embudo.perdido > 0 && (
                <div className="mt-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-gray-400 text-sm">Clientes Perdidos</h4>
                            <p className="text-white font-semibold text-lg">{embudo.perdido}</p>
                        </div>
                        <div className="text-gray-500">
                            {calcularPorcentaje(embudo.perdido)}% del total
                        </div>
                    </div>
                </div>
            )}

            {/* Conversión global */}
            <div className="mt-4 p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-gray-300 text-sm">Conversión Global</h4>
                        <p className="text-white font-bold text-2xl">{tasasConversion.global}%</p>
                    </div>
                    <div className="text-gray-400 text-sm">
                        De contacto inicial a venta
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FunnelChart;
