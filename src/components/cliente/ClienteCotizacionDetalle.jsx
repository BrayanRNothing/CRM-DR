import React, { useState } from 'react';
import toast from 'react-hot-toast';
import API_URL from '../../config/api';
import { getSafeUrl } from '../../utils/helpers';
import Avatar from '../ui/Avatar';

function ClienteCotizacionDetalle({ cotizacion, onClose, onUpdate }) {
    const [imagenZoom, setImagenZoom] = useState(null);
    const [modalConfirmacion, setModalConfirmacion] = useState(null); // { tipo: 'aprobado' | 'rechazado' }

    const handleRespuesta = async (respuesta) => {
        setModalConfirmacion(null);

        try {
            const res = await fetch(`${API_URL}/api/servicios/${cotizacion.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estadoCliente: respuesta,
                    estado: respuesta === 'aprobado' ? 'aprobado' : 'rechazado'
                })
            });

            if (res.ok) {
                toast.success(respuesta === 'aprobado' ? '¡Cotización aceptada!' : 'Cotización rechazada');
                if (onUpdate) onUpdate();
                if (onClose) onClose();
            } else {
                toast.error('Error al procesar la respuesta');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        }
    };

    const handleDescargarPDF = async (rutaRelativa, nombreArchivo) => {
        if (!rutaRelativa) {
            toast.error('No hay PDF disponible');
            return;
        }

        const urlCompleta = getSafeUrl(rutaRelativa);
        const toastId = toast.loading('Descargando PDF...');

        try {
            const response = await fetch(urlCompleta);
            if (!response.ok) throw new Error('Archivo no disponible');

            const blob = await response.blob();
            const urlBlob = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = urlBlob;
            a.download = nombreArchivo || 'documento.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(urlBlob);

            toast.dismiss(toastId);
            toast.success('Descarga completada');
        } catch (error) {
            console.error(error);
            toast.dismiss(toastId);
            toast.error('❌ Error al descargar');
        }
    };

    const fotoUrl = cotizacion.foto ? getSafeUrl(cotizacion.foto) : null;
    const esCotizado = cotizacion.estado === 'cotizado';
    const esAprobado = cotizacion.estado === 'aprobado' || cotizacion.estadoCliente === 'aprobado';
    const esEnProceso = cotizacion.estado === 'en-proceso';
    const esFinalizado = cotizacion.estado === 'finalizado';

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Botón atrás y título - SIN cuadro blanco */}
                <button onClick={onClose} className="mb-3 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1">
                    ← Atrás
                </button>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{cotizacion.titulo}</h1>
                <p className="text-sm text-gray-500 mb-4">{cotizacion.tipo}</p>

                {/* Descripción */}
                <div className="bg-gray-200 rounded-2xl p-4 mb-4">
                    <h3 className="text-xs font-semibold text-gray-600 mb-2">Descripción</h3>
                    <p className="text-gray-800">{cotizacion.descripcion || 'Sin descripción'}</p>
                </div>

                {/* Dirección */}
                <div className="bg-gray-200 rounded-2xl p-4 mb-4">
                    <h3 className="text-xs font-semibold text-gray-600 mb-2">Dirección</h3>
                    <p className="text-gray-800">{cotizacion.direccion || 'N/A'}</p>
                </div>

                {/* Imágenes y PDF */}
                <div className="bg-gray-200 rounded-2xl p-4 mb-4">
                    <div className="grid grid-cols-3 gap-3">
                        {/* Imagen 1 */}
                        {fotoUrl ? (
                            <div
                                onClick={() => setImagenZoom(fotoUrl)}
                                className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition"
                            >
                                <img
                                    src={fotoUrl}
                                    alt="Imagen del proyecto"
                                    className="w-full h-full object-cover"
                                    onError={(e) => e.target.parentElement.remove()}
                                />
                            </div>
                        ) : (
                            <div className="aspect-square rounded-xl bg-gray-300 flex items-center justify-center">
                                <span className="text-gray-400 text-2xl">📷</span>
                            </div>
                        )}

                        {/* Imagen placeholder 2 */}
                        <div className="aspect-square rounded-xl bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-400 text-2xl">📷</span>
                        </div>

                        {/* Botón PDF */}
                        {cotizacion.pdf ? (
                            <button
                                onClick={() => handleDescargarPDF(cotizacion.pdf, `Documento_${cotizacion.id}.pdf`)}
                                className="aspect-square rounded-xl bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 flex flex-col items-center justify-center transition-all shadow-md hover:shadow-lg group"
                            >
                                <svg className="w-8 h-8 text-white mb-1 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                                </svg>
                                <span className="text-white font-bold text-xs">PDF</span>
                            </button>
                        ) : (
                            <div className="aspect-square rounded-xl bg-gray-300 flex items-center justify-center">
                                <span className="text-gray-400 text-2xl">📄</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sección de Respuesta - Varía según estado */}
                {(esCotizado || esAprobado || esEnProceso || esFinalizado) && (
                    <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Respuesta</h2>

                        {/* Precio (si está cotizado o aprobado) */}
                        {(esCotizado || esAprobado || esEnProceso || esFinalizado) && cotizacion.precioestimado && (
                            <div className="bg-gray-200 rounded-xl p-4 mb-3">
                                <div className="text-xs text-gray-600 mb-1">Precio (respuesta admin)</div>
                                <div className="text-2xl font-bold text-gray-900">${cotizacion.precioestimado}</div>
                            </div>
                        )}

                        {/* PDF de cotización */}
                        {cotizacion.pdfcotizacion && (
                            <button
                                onClick={() => handleDescargarPDF(cotizacion.pdfcotizacion, `Cotizacion_${cotizacion.id}.pdf`)}
                                className="w-full bg-gray-200 hover:bg-gray-300 rounded-xl p-4 mb-3 text-center font-semibold text-gray-700 transition-all"
                            >
                                📥 PDF
                            </button>
                        )}

                        {/* Notas extra */}
                        {cotizacion.respuestacotizacion && (
                            <div className="bg-gray-200 rounded-xl p-4 mb-3">
                                <div className="text-xs text-gray-600 mb-2">Notas extra</div>
                                <p className="text-gray-800 text-sm">{cotizacion.respuestacotizacion}</p>
                            </div>
                        )}

                        {/* Información del técnico (si está aprobado, en proceso o finalizado) */}
                        {(esAprobado || esEnProceso || esFinalizado) && cotizacion.tecnicoasignado && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3">
                                <div className="flex items-center gap-3 mb-3">
                                    <Avatar name={cotizacion.tecnicoasignado} size="md" />
                                    <div>
                                        <div className="text-xs text-gray-600">Técnico Asignado</div>
                                        <div className="font-bold text-gray-900">{cotizacion.tecnicoasignado}</div>
                                    </div>
                                </div>
                                {cotizacion.telefonotecnico && (
                                    <div className="text-sm text-gray-700 mb-2">
                                        📞 {cotizacion.telefonotecnico}
                                    </div>
                                )}
                                {cotizacion.fechaprogramada && (
                                    <div className="text-sm text-gray-700">
                                        📅 {new Date(cotizacion.fechaprogramada).toLocaleDateString('es-ES', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Botones de acción solo si está cotizado */}
                        {esCotizado && (
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <button
                                    onClick={() => setModalConfirmacion('aprobado')}
                                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-all"
                                >
                                    Aceptar
                                </button>
                                <button
                                    onClick={() => setModalConfirmacion('rechazado')}
                                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all"
                                >
                                    Rechazar
                                </button>
                            </div>
                        )}

                        {/* Indicador de estado aprobado */}
                        {esAprobado && (
                            <div className="bg-green-100 border border-green-300 rounded-xl p-3 mt-3 flex items-center justify-center gap-2">
                                <span className="text-xl">✅</span>
                                <span className="font-bold text-green-700">Cotización Aprobada</span>
                            </div>
                        )}

                        {/* Indicador de en proceso */}
                        {esEnProceso && (
                            <div className="bg-purple-100 border border-purple-300 rounded-xl p-3 mt-3 flex items-center justify-center gap-2">
                                <span className="text-xl">🔧</span>
                                <span className="font-bold text-purple-700">En Proceso</span>
                            </div>
                        )}

                        {/* Indicador de finalizado */}
                        {esFinalizado && (
                            <div className="bg-gray-100 border border-gray-300 rounded-xl p-3 mt-3 flex items-center justify-center gap-2">
                                <span className="text-xl">✔️</span>
                                <span className="font-bold text-gray-700">Servicio Finalizado</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Mensaje de espera si está pendiente */}
                {!esCotizado && !esAprobado && !esEnProceso && !esFinalizado && (
                    <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                        <div className="text-5xl mb-3">⏳</div>
                        <h3 className="font-bold text-lg text-gray-800 mb-2">En Espera de Cotización</h3>
                        <p className="text-sm text-gray-500">
                            Nuestro equipo está revisando tu solicitud. Te notificaremos cuando tengamos una respuesta.
                        </p>
                    </div>
                )}
            </div>

            {/* Modal Zoom Imagen */}
            {imagenZoom && (
                <div
                    className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setImagenZoom(null)}
                >
                    <img
                        src={imagenZoom}
                        alt="Zoom"
                        className="max-w-full max-h-full object-contain rounded shadow-2xl"
                    />
                    <button
                        className="absolute top-5 right-5 text-white text-5xl hover:text-red-500 transition"
                        onClick={() => setImagenZoom(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Modal de Confirmación Personalizado */}
            {modalConfirmacion && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
                    onClick={() => setModalConfirmacion(null)}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 transform transition-all animate-scaleIn"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Icono y título */}
                        <div className="text-center mb-5">
                            <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${modalConfirmacion === 'aprobado'
                                ? 'bg-green-100'
                                : 'bg-red-100'
                                }`}>
                                <span className="text-5xl">
                                    {modalConfirmacion === 'aprobado' ? '✓' : '✕'}
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                {modalConfirmacion === 'aprobado'
                                    ? '¿Aceptar cotización?'
                                    : '¿Rechazar cotización?'}
                            </h3>
                            <p className="text-gray-600 text-sm">
                                {modalConfirmacion === 'aprobado'
                                    ? 'Al aceptar, el servicio pasará a la siguiente etapa y se asignará un técnico.'
                                    : 'Al rechazar, esta cotización será marcada como rechazada y no se procesará.'}
                            </p>
                        </div>

                        {/* Precio destacado */}
                        {cotizacion.precioestimado && (
                            <div className={`rounded-2xl p-4 mb-5 text-center ${modalConfirmacion === 'aprobado'
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-gray-100 border border-gray-200'
                                }`}>
                                <div className="text-xs text-gray-600 mb-1">Precio de la cotización</div>
                                <div className="text-3xl font-bold text-gray-900">
                                    ${cotizacion.precioestimado}
                                </div>
                            </div>
                        )}

                        {/* Botones de acción */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setModalConfirmacion(null)}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3.5 rounded-xl transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleRespuesta(modalConfirmacion)}
                                className={`font-bold py-3.5 rounded-xl transition-all active:scale-95 text-white ${modalConfirmacion === 'aprobado'
                                    ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30'
                                    : 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                                    }`}
                            >
                                {modalConfirmacion === 'aprobado' ? 'Sí, aceptar' : 'Sí, rechazar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClienteCotizacionDetalle;
