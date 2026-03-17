import React from 'react';
import { AlertTriangle, TrendingDown, Users, Lightbulb } from 'lucide-react';

const WeakStageAlert = ({ etapasDebiles }) => {
    if (!etapasDebiles || etapasDebiles.length === 0) {
        return (
            <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-500/20 rounded-lg">
                        <TrendingDown className="w-6 h-6 text-green-400 rotate-180" />
                    </div>
                    <div>
                        <h3 className="text-green-400 font-bold text-lg">¡Embudo Saludable!</h3>
                        <p className="text-gray-300 text-sm">
                            Todas las etapas tienen tasas de conversión superiores al 30%
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Sugerencias por etapa
    const sugerencias = {
        'Contacto Inicial → Llamadas': [
            'Revisar calidad de los prospectos iniciales',
            'Mejorar script de primer contacto',
            'Capacitar en técnicas de apertura de llamadas'
        ],
        'Llamadas → Citas': [
            'Mejorar propuesta de valor en llamadas',
            'Capacitar en manejo de objeciones',
            'Revisar horarios de contacto',
            'Implementar seguimiento estructurado'
        ],
        'Citas → Negociación': [
            'Mejorar presentación de producto/servicio',
            'Capacitar en detección de necesidades',
            'Revisar calificación de prospectos'
        ],
        'Negociación → Venta': [
            'Capacitar en técnicas de cierre',
            'Revisar estructura de precios',
            'Mejorar manejo de objeciones finales',
            'Implementar incentivos o promociones'
        ]
    };

    return (
        <div className="space-y-4">
            {/* Header de alerta */}
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-500/20 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-red-400 font-bold text-lg">
                            {etapasDebiles.length} Etapa{etapasDebiles.length !== 1 ? 's' : ''} Débil{etapasDebiles.length !== 1 ? 'es' : ''} Detectada{etapasDebiles.length !== 1 ? 's' : ''}
                        </h3>
                        <p className="text-gray-300 text-sm">
                            Estas etapas tienen tasas de conversión menores al 30% y requieren atención inmediata
                        </p>
                    </div>
                </div>
            </div>

            {/* Lista de etapas débiles con sugerencias */}
            <div className="space-y-3">
                {etapasDebiles.map((etapaDebil, index) => (
                    <div
                        key={index}
                        className="p-4 bg-gray-800/50 border border-red-500/30 rounded-lg hover:border-red-500/50 transition-colors"
                    >
                        {/* Etapa y tasa */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/20 rounded-lg">
                                    <TrendingDown className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <h4 className="text-white font-semibold">{etapaDebil.etapa}</h4>
                                    <p className="text-gray-400 text-sm">Tasa de conversión crítica</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-red-400">{etapaDebil.tasa}%</div>
                                <div className="text-xs text-gray-500">Objetivo: ≥30%</div>
                            </div>
                        </div>

                        {/* Barra de progreso */}
                        <div className="mb-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-red-500 transition-all duration-500"
                                style={{ width: `${Math.min(etapaDebil.tasa, 100)}%` }}
                            />
                        </div>

                        {/* Sugerencias */}
                        {sugerencias[etapaDebil.etapa] && (
                            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <div className="flex items-start gap-2 mb-2">
                                    <Lightbulb className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <h5 className="text-blue-400 font-semibold text-sm">Sugerencias de Mejora</h5>
                                </div>
                                <ul className="space-y-1 ml-6">
                                    {sugerencias[etapaDebil.etapa].map((sugerencia, idx) => (
                                        <li key={idx} className="text-gray-300 text-sm">
                                            • {sugerencia}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Acción recomendada */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="text-yellow-400 font-semibold mb-1">Acción Recomendada</h4>
                        <p className="text-gray-300 text-sm">
                            Revisar el rendimiento individual de cada vendedor en estas etapas para identificar
                            quiénes necesitan capacitación específica. Considera implementar sesiones de coaching
                            enfocadas en las áreas débiles detectadas.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeakStageAlert;
