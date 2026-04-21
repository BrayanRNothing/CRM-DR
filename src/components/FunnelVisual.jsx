import React from 'react';
import { ArrowRight, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';

const FunnelVisual = ({ stages }) => {
    const formatPercent = (value) => {
        if (value === null || value === undefined || value === '') return '0%';
        const numeric = Number(value);
        if (Number.isFinite(numeric)) return `${numeric.toFixed(1)}%`;
        return `${String(value).replace(/%$/, '')}%`;
    };

    // Mapeo de colores para gradientes
    const getGradientClasses = (color) => {
        const colorMap = {
            'bg-gray-500': 'from-gray-400 to-gray-600',
            'bg-slate-600': 'from-slate-500 to-slate-700',
            'bg-slate-500': 'from-slate-400 to-slate-600',
            'bg-slate-400': 'from-slate-300 to-slate-500',
            'bg-blue-500': 'from-blue-400 to-blue-600',
            'bg-indigo-500': 'from-indigo-400 to-indigo-600',
            'bg-purple-500': 'from-purple-400 to-purple-600',
            'bg-green-500': 'from-green-400 to-green-600',
            'bg-emerald-500': 'from-emerald-400 to-emerald-600',
            'bg-teal-500': 'from-teal-400 to-teal-600',
            'bg-(--theme-600)': 'from-(--theme-500) to-(--theme-700)',
            'bg-(--theme-500)': 'from-(--theme-400) to-(--theme-600)',
            'bg-(--theme-400)': 'from-(--theme-300) to-(--theme-500)',
            'bg-(--theme-300)': 'from-(--theme-200) to-(--theme-400)',
            'bg-cyan-500': 'from-cyan-400 to-cyan-600',
            'bg-orange-500': 'from-orange-400 to-orange-600',
            'bg-amber-400': 'from-amber-300 to-amber-500',
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
                        <div className={`bg-linear-to-br ${gradientClass} rounded-lg p-2.5 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group flex-1 h-48`}>
                            {/* Fondo decorativo */}
                            <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 transform origin-top-right group-hover:scale-110 transition-transform duration-500"></div>

                            <div className="relative z-10 h-full flex flex-col">
                                {/* Header: Título y Total */}
                                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                    <h4 className="text-white font-bold text-[11px] leading-tight uppercase tracking-wider opacity-90">
                                        {stage.etapa}
                                    </h4>
                                    <div className="text-3xl font-black text-white tracking-tight drop-shadow-md">
                                        {stage.cantidad}
                                    </div>
                                </div>

                                {/* Contador Hoy - Posicionado absoluto para no mover el layout */}
                                {stage.contadorHoy > 0 && (
                                    <div className="absolute top-9 right-2.5 z-20 inline-flex items-center gap-1 bg-white/20 backdrop-blur-md rounded-full px-1.5 py-0.5 border border-white/10">
                                        <TrendingUp className="w-2 h-2 text-white" />
                                        <span className="text-white text-[9px] font-bold">
                                            +{stage.contadorHoy} {stage.labelContador || 'hoy'}
                                        </span>
                                    </div>
                                )}

                                {/* Spacer para empujar stats al fondo */}
                                <div className="flex-1"></div>

                                {/* Estadísticas al fondo */}
                                {(stage.cantidadExito !== undefined || stage.cantidadPerdida !== undefined) && (
                                    <div className="space-y-1.5 bg-black/10 rounded-md p-2 backdrop-blur-sm border border-white/5">
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
                                                    <span className="text-lg font-bold text-white">
                                                        {stage.cantidadExito}
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-green-200 bg-green-500/30 px-1 py-0.5 rounded">
                                                        {formatPercent(stage.porcentajeExito)}
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
                                                    <span className="text-lg font-bold text-white">
                                                        {stage.cantidadPerdida}
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-red-200 bg-red-500/30 px-1 py-0.5 rounded">
                                                        {formatPercent(stage.porcentajePerdida)}
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
                            <div className="flex items-center shrink-0">
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
