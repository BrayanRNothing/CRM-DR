import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

const ConversionMetrics = ({ tasasConversion }) => {
    if (!tasasConversion) return null;

    // Determinar color y estado según la tasa
    const getEstado = (tasa) => {
        if (tasa >= 50) return { color: 'green', icon: CheckCircle, label: 'Excelente', bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' };
        if (tasa >= 30) return { color: 'yellow', icon: TrendingUp, label: 'Aceptable', bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400' };
        return { color: 'red', icon: AlertCircle, label: 'Débil', bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400' };
    };

    const metricas = [
        {
            nombre: 'Tasa de Llamadas',
            descripcion: 'Contacto Inicial → Llamadas',
            tasa: tasasConversion.llamadas,
            icono: '📞'
        },
        {
            nombre: 'Tasa de Citas',
            descripcion: 'Llamadas → Citas',
            tasa: tasasConversion.citas,
            icono: '📅'
        },
        {
            nombre: 'Tasa de Negociación',
            descripcion: 'Citas → Negociación',
            tasa: tasasConversion.negociacion,
            icono: '💼'
        },
        {
            nombre: 'Tasa de Cierre',
            descripcion: 'Negociación → Venta',
            tasa: tasasConversion.cierre,
            icono: '✅'
        }
    ];

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Métricas de Conversión</h3>

            {/* Grid de métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metricas.map((metrica, index) => {
                    const estado = getEstado(metrica.tasa);
                    const Icon = estado.icon;

                    return (
                        <div
                            key={index}
                            className={`relative p-4 ${estado.bg} border ${estado.border} rounded-xl transition-all duration-300 hover:scale-105`}
                        >
                            {/* Icono de etapa */}
                            <div className="absolute top-3 right-3 text-2xl opacity-50">
                                {metrica.icono}
                            </div>

                            {/* Contenido */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Icon className={`w-5 h-5 ${estado.text}`} />
                                    <span className={`text-xs font-semibold ${estado.text} uppercase`}>
                                        {estado.label}
                                    </span>
                                </div>

                                <h4 className="text-white font-semibold text-sm">
                                    {metrica.nombre}
                                </h4>

                                <p className="text-gray-400 text-xs">
                                    {metrica.descripcion}
                                </p>

                                <div className="flex items-baseline gap-1 mt-2">
                                    <span className={`text-3xl font-bold ${estado.text}`}>
                                        {metrica.tasa.toFixed(1)}
                                    </span>
                                    <span className={`text-lg ${estado.text}`}>%</span>
                                </div>
                            </div>

                            {/* Barra de progreso */}
                            <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${estado.color === 'green' ? 'bg-green-500' : estado.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'} transition-all duration-500`}
                                    style={{ width: `${Math.min(metrica.tasa, 100)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Resumen de puntos débiles */}
            {metricas.filter(m => m.tasa < 30).length > 0 && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-red-400 font-semibold mb-2">Puntos Débiles Detectados</h4>
                            <ul className="space-y-1">
                                {metricas.filter(m => m.tasa < 30).map((metrica, index) => (
                                    <li key={index} className="text-gray-300 text-sm">
                                        • <span className="font-medium">{metrica.nombre}</span>: {metrica.tasa.toFixed(1)}%
                                        <span className="text-gray-500 ml-2">({metrica.descripcion})</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-gray-400 text-xs mt-3">
                                💡 Estas etapas requieren atención para mejorar el flujo de ventas
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConversionMetrics;
