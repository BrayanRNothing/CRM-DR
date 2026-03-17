import React from 'react';

/**
 * Componente Botón de Conversión
 * Botón reutilizable para convertir documentos
 */
function BotonConvertir({
    documentoOrigen,
    tipoDestino,
    onClick,
    disabled = false,
    className = ''
}) {
    const configuraciones = {
        orden_trabajo: {
            texto: 'Crear Orden de Trabajo',
            icono: '📋',
            color: 'bg-purple-600 hover:bg-purple-700',
            descripcion: 'Convierte esta cotización en una orden de trabajo'
        },
        reporte_trabajo: {
            texto: 'Crear Reporte de Trabajo',
            icono: '✅',
            color: 'bg-green-600 hover:bg-green-700',
            descripcion: 'Convierte esta orden en un reporte de trabajo completado'
        }
    };

    const config = configuraciones[tipoDestino];

    if (!config) {
        return null;
    }

    return (
        <button
            onClick={() => onClick && onClick(documentoOrigen, tipoDestino)}
            disabled={disabled}
            className={`
        px-6 py-3 rounded-lg text-white font-semibold transition
        flex items-center gap-3 shadow-md hover:shadow-lg
        disabled:opacity-50 disabled:cursor-not-allowed
        ${config.color}
        ${className}
      `}
            title={config.descripcion}
        >
            <span className="text-xl">{config.icono}</span>
            <div className="text-left">
                <div className="text-sm font-bold">{config.texto}</div>
                {documentoOrigen && (
                    <div className="text-xs opacity-90">
                        Desde {documentoOrigen.tipo === 'cotizacion' ? 'Cotización' : 'Orden'} #{documentoOrigen.numero}
                    </div>
                )}
            </div>
        </button>
    );
}

export default BotonConvertir;
