import React from 'react';
import { ArrowRight, ArrowDown, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';

const FunnelVisual = ({ stages, lossesStage }) => {
    // Mapeo de colores para gradientes
    const getGradientClasses = (color) => {
        const colorMap = {
            'bg-gray-500': 'from-slate-400 to-slate-600',
            'bg-blue-800': 'from-blue-700 to-blue-900',
            'bg-purple-500': 'from-purple-400 to-purple-600',
            'bg-green-500': 'from-emerald-400 to-emerald-600',
            'bg-blue-500': 'from-blue-400 to-blue-600',
            'bg-cyan-500': 'from-cyan-400 to-cyan-600',
            'bg-orange-500': 'from-orange-400 to-orange-600',
            'bg-red-500': 'from-rose-400 to-rose-600',
            'bg-yellow-500': 'from-amber-400 to-amber-600'
        };
        return colorMap[color] || 'from-slate-400 to-slate-600';
    };

    const CardContent = ({ stage }) => (
        <>
            <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 transform origin-top-right group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-start justify-between gap-1 mb-1">
                    <h4 className="text-white font-bold text-xs sm:text-[13px] leading-tight flex-1 pr-1" style={{ marginTop: '-4px' }}>
                        {stage.etapa}
                    </h4>
                    <div className="text-2xl font-black text-white tracking-tight drop-shadow-md leading-none" style={{ marginTop: '-4px' }}>
                        {stage.cantidad}
                    </div>
                </div>

                {stage.contadorHoy > 0 && (
                    <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md rounded-md px-1.5 py-0.5 mb-2 self-start">
                        <TrendingUp className="w-3 h-3 text-white" />
                        <span className="text-white text-[10px] font-bold">
                            +{stage.contadorHoy} {stage.labelContador || 'hoy'}
                        </span>
                    </div>
                )}

                <div className="flex-1"></div>

                {(stage.cantidadExito !== undefined || stage.cantidadPerdida !== undefined) && (
                    <div className="space-y-1 bg-black/15 rounded-md p-2 backdrop-blur-sm border border-white/5 shadow-inner">
                        {stage.cantidadExito !== undefined && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                                    <span className="text-[9px] font-bold text-emerald-100 uppercase tracking-widest">{stage.labelExito || 'Continúan'}</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-bold text-white">{stage.cantidadExito}</span>
                                    <span className="text-[9px] font-bold text-emerald-100 bg-emerald-500/40 px-1 py-px rounded">{stage.porcentajeExito}%</span>
                                </div>
                            </div>
                        )}
                        {stage.cantidadPerdida !== undefined && (
                            <div className="flex items-center justify-between border-t border-white/10 pt-1 mt-1">
                                <div className="flex items-center gap-1">
                                    <XCircle className="w-3 h-3 text-rose-300" />
                                    <span className="text-[9px] font-bold text-rose-100 uppercase tracking-widest">{stage.labelPerdida || 'Perdidos'}</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-bold text-white">{stage.cantidadPerdida}</span>
                                    <span className="text-[9px] font-bold text-rose-100 bg-rose-500/40 px-1 py-px rounded">{stage.porcentajePerdida}%</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );

    return (
        <div className="w-full">
            {/* --- DESKTOP VIEW (Snake Flowchart via CSS Grid) --- */}
            <div className="hidden lg:grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-y-3 gap-x-2 w-full max-w-7xl mx-auto items-center">
                {stages.map((stage, i) => {
                    const isLast = i === stages.length - 1;
                    const rowIndex = Math.floor(i / 4);
                    const posInRow = i % 4;
                    const isEvenRow = rowIndex % 2 === 0;

                    // Calculate Grid Positions
                    const col = isEvenRow ? (posInRow * 2 + 1) : (7 - posInRow * 2);
                    const row = rowIndex * 2 + 1;

                    // Connected Arrows
                    const hasHorizArrow = !isLast && posInRow !== 3;
                    const horizArrowCol = isEvenRow ? col + 1 : col - 1;

                    const hasVertArrow = !isLast && posInRow === 3;
                    const vertArrowRow = row + 1;

                    return (
                        <React.Fragment key={`desktop-stage-${i}`}>
                            {/* Card Box */}
                            <div
                                className={`bg-linear-to-br ${getGradientClasses(stage.color)} rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group flex flex-col justify-between h-[11.5rem]`}
                                style={{ gridColumn: col, gridRow: row }}
                            >
                                <CardContent stage={stage} />
                            </div>

                            {/* Horizontal Arrows */}
                            {hasHorizArrow && (
                                <div
                                    className="flex items-center justify-center p-0.5"
                                    style={{ gridColumn: horizArrowCol, gridRow: row }}
                                >
                                    {isEvenRow ?
                                        <ArrowRight className="w-5 h-5 text-indigo-300" /> :
                                        <ArrowRight className="w-5 h-5 text-indigo-300 transform rotate-180" />
                                    }
                                </div>
                            )}

                            {/* Vertical 'Snake' connecting Arrows */}
                            {hasVertArrow && (
                                <div
                                    className="flex items-center justify-center py-1 relative"
                                    style={{ gridColumn: col, gridRow: vertArrowRow }}
                                >
                                    {/* Curved snake pipe */}
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-indigo-300 opacity-70 drop-shadow-sm">
                                        {isEvenRow ?
                                            // Conecta la derecha hacia abajo a la izquierda (A -> E de serpiente) 
                                            <path d="M12 4v8c0 2.2-1.8 4-4 4H4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /> :
                                            // RTL (muy raro para este layout, pero si hay mas de 8 steps)
                                            <path d="M12 4v8c0 2.2 1.8 4 4 4h4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        }
                                    </svg>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* --- MOBILE / TABLET VIEW (Vertical Stack) --- */}
            <div className="flex lg:hidden flex-col items-center gap-3 w-full">
                {stages.map((stage, i) => (
                    <React.Fragment key={`mobile-stage-${i}`}>
                        <div className={`bg-linear-to-br ${getGradientClasses(stage.color)} rounded-xl p-4 shadow-md w-full max-w-sm relative overflow-hidden h-auto min-h-[11rem] flex flex-col`}>
                            <CardContent stage={stage} />
                        </div>
                        {i < stages.length - 1 && (
                            <ArrowDown className="w-6 h-6 text-indigo-300" />
                        )}
                    </React.Fragment>
                ))}

                {/* --- LOSSES STAGE (Mobile) --- */}
                {lossesStage && (
                    <div className="flex flex-col items-center gap-3 w-full mt-2">
                        <div className="w-full flex justify-center py-2">
                            <ArrowDown className="w-6 h-6 text-slate-300/50" strokeDasharray="4 4" />
                        </div>
                        <div className={`bg-linear-to-br ${getGradientClasses(lossesStage.color)} rounded-xl p-4 shadow-md w-full max-w-sm relative overflow-hidden h-auto min-h-44 flex flex-col opacity-80`}>
                            <CardContent stage={lossesStage} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FunnelVisual;
