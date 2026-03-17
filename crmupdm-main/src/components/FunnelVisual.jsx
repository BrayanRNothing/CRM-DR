import React from 'react';
import { ArrowRight, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';

const FunnelVisual = ({ stages }) => {
    // Mapeo de colores para gradientes
    const getGradientClasses = (color) => {
        const colorMap = {
            'bg-gray-500': 'from-gray-400 to-gray-600',
            'bg-teal-500': 'from-[#2dd4bf] to-[#0d9488]', // RESTORED ORIGINAL TEAL
            'bg-purple-500': 'from-purple-400 to-purple-600',
            'bg-green-500': 'from-green-400 to-green-600',
            'bg-blue-500': 'from-blue-400 to-blue-600',
            'bg-cyan-500': 'from-cyan-400 to-cyan-600',
            'bg-orange-500': 'from-orange-400 to-orange-600',
            'bg-red-500': 'from-red-400 to-red-500',
            'bg-yellow-500': 'from-yellow-400 to-yellow-600'
        };
        return colorMap[color] || 'from-gray-400 to-gray-600';
    };

    return (
        <div className="flex items-stretch gap-2 w-full">
            {stages.map((stage, index) => {
                const isLast = index === stages.length - 1;
                const gradientClass = getGradientClasses(stage.color);

                return (
                    <React.Fragment key={index}>
                        {/* Card Principal - Ancho y Alto Igual */}
                        <div className={`bg-gradient-to-br ${gradientClass} rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group flex-1 h-48`}>
                            {/* Fondo decorativo */}
                            <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 transform origin-top-right group-hover:scale-110 transition-transform duration-500"></div>

                            <div className="relative z-10 h-full flex flex-col">
                                {/* Header: Título y Total */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h4 className="text-white font-bold text-sm leading-tight">
                                        {stage.etapa}
                                    </h4>
                                    <div className="text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
                                        {stage.cantidad}
                                    </div>
                                </div>

                                {/* Contador Hoy */}
                                {stage.contadorHoy > 0 && (
                                    <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md rounded-full px-2 py-0.5 mb-3 border border-white/10 self-start">
                                        <TrendingUp className="w-3 h-3 text-white" />
                                        <span className="text-white text-xs font-bold">
                                            +{stage.contadorHoy} {stage.labelContador || 'hoy'}
                                        </span>
                                    </div>
                                )}

                                {/* Spacer para empujar stats al fondo */}
                                <div className="flex-1"></div>

                                {/* Estadísticas al fondo */}
                                {(stage.cantidadExito !== undefined || stage.cantidadPerdida !== undefined) && (
                                    <div className="space-y-2 bg-black/10 rounded-md p-2.5 backdrop-blur-sm border border-white/5">
                                        {/* Éxito */}
                                        {stage.cantidadExito !== undefined && (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-300" />
                                                    <span className="text-xs font-medium text-green-100">
                                                        {stage.labelExito || 'Continúan'}
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-xl font-bold text-white">
                                                        {stage.cantidadExito}
                                                    </span>
                                                    <span className="text-xs font-semibold text-green-200 bg-green-500/30 px-1.5 py-0.5 rounded">
                                                        {stage.porcentajeExito}%
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Pérdida */}
                                        {stage.cantidadPerdida !== undefined && (
                                            <div className="flex items-center justify-between border-t border-white/10 pt-2">
                                                <div className="flex items-center gap-1.5">
                                                    <XCircle className="w-3.5 h-3.5 text-red-300" />
                                                    <span className="text-xs font-medium text-red-100">
                                                        {stage.labelPerdida || 'Perdidos'}
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-xl font-bold text-white">
                                                        {stage.cantidadPerdida}
                                                    </span>
                                                    <span className="text-xs font-semibold text-red-200 bg-red-500/30 px-1.5 py-0.5 rounded">
                                                        {stage.porcentajePerdida}%
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Conector Visual (Flecha Derecha) */}
                        {!isLast && (
                            <div className="flex items-center flex-shrink-0">
                                <ArrowRight className="w-6 h-6 text-gray-400" />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default FunnelVisual;
