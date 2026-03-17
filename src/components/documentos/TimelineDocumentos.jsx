import React from 'react';
import { formatearFecha, obtenerIconoDocumento, obtenerColorDocumento } from '../../utils/documentConverter';

/**
 * Componente Timeline de Documentos
 * Muestra una línea de tiempo visual de todos los documentos generados
 */
function TimelineDocumentos({ documentos = [], onDescargar, onConvertir }) {
    if (documentos.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">📄 No hay documentos generados aún</p>
                <p className="text-gray-400 text-sm mt-2">Los documentos aparecerán aquí cuando los generes</p>
            </div>
        );
    }

    // Ordenar por fecha (más reciente primero)
    const documentosOrdenados = [...documentos].sort((a, b) => {
        const fechaA = new Date(a.fechaCreacion || a.fecha);
        const fechaB = new Date(b.fechaCreacion || b.fecha);
        return fechaB - fechaA;
    });

    return (
        <div className="space-y-4">
            {documentosOrdenados.map((doc, index) => (
                <div key={doc.numero || index} className="relative">
                    {/* Línea conectora */}
                    {index < documentosOrdenados.length - 1 && (
                        <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gray-300 -mb-4"></div>
                    )}

                    {/* Card del documento */}
                    <div className="flex gap-4">
                        {/* Icono */}
                        <div className="shrink-0">
                            <div className="w-12 h-12 rounded-full bg-white border-4 border-gray-200 flex items-center justify-center text-2xl shadow-sm">
                                {obtenerIconoDocumento(doc.tipo)}
                            </div>
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${obtenerColorDocumento(doc.tipo)}`}>
                                            {doc.tipo === 'cotizacion' ? 'Cotización' :
                                                doc.tipo === 'orden_trabajo' ? 'Orden de Trabajo' :
                                                    'Reporte de Trabajo'}
                                        </span>
                                        <span className="font-bold text-gray-800">#{doc.numero}</span>
                                    </div>

                                    {/* Información */}
                                    <div className="space-y-1 text-sm text-gray-600">
                                        <p>
                                            <span className="font-semibold">Cliente:</span> {doc.cliente?.nombre || 'N/A'}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Fecha:</span> {formatearFecha(doc.fecha)}
                                        </p>
                                        {doc.total && (
                                            <p>
                                                <span className="font-semibold">Total:</span> {doc.moneda} ${doc.total.toLocaleString()}
                                            </p>
                                        )}
                                        {doc.tecnicoAsignado && (
                                            <p>
                                                <span className="font-semibold">Técnico:</span> {doc.tecnicoAsignado}
                                            </p>
                                        )}
                                        {doc.cotizacionRef && (
                                            <p className="text-blue-600">
                                                <span className="font-semibold">↳ Desde cotización:</span> #{doc.cotizacionRef}
                                            </p>
                                        )}
                                        {doc.ordenTrabajoRef && (
                                            <p className="text-purple-600">
                                                <span className="font-semibold">↳ Desde orden:</span> #{doc.ordenTrabajoRef}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Acciones */}
                                <div className="flex flex-col gap-2">
                                    {/* Botón Descargar PDF */}
                                    {doc.pdfUrl && (
                                        <button
                                            onClick={() => onDescargar && onDescargar(doc)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
                                        >
                                            <span>📥</span>
                                            <span>Descargar PDF</span>
                                        </button>
                                    )}

                                    {/* Botón Convertir */}
                                    {onConvertir && (
                                        <>
                                            {doc.tipo === 'cotizacion' && doc.estado === 'aceptada' && (
                                                <button
                                                    onClick={() => onConvertir(doc, 'orden_trabajo')}
                                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition"
                                                >
                                                    → Crear Orden
                                                </button>
                                            )}
                                            {doc.tipo === 'orden_trabajo' && (
                                                <button
                                                    onClick={() => onConvertir(doc, 'reporte_trabajo')}
                                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition"
                                                >
                                                    → Crear Reporte
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default TimelineDocumentos;
